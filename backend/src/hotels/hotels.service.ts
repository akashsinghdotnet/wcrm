import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Hotel } from './entities/hotel.entity';
import { RoomType } from './entities/room-type.entity';
import { HotelBooking } from './entities/hotel-booking.entity';
import { Lead } from '../leads/lead.entity';
import { EmailService } from '../email/email.service';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class HotelsService {
    constructor(
        @InjectRepository(Hotel) private hotelRepo: Repository<Hotel>,
        @InjectRepository(RoomType) private roomTypeRepo: Repository<RoomType>,
        @InjectRepository(HotelBooking) private bookingRepo: Repository<HotelBooking>,
        @InjectRepository(Lead) private leadRepo: Repository<Lead>,
        private emailService: EmailService,
        private companiesService: CompaniesService,
    ) {}

    // ─── Hotels ────────────────────────────────────────────────────────────────

    async getHotels(companyId: string) {
        return this.hotelRepo.find({ where: { companyId }, relations: ['roomTypes'], order: { createdAt: 'DESC' } });
    }

    async createHotel(companyId: string, data: any) {
        const company = await this.companiesService.findOne(companyId);
        const baseName = data.name || company?.companyName || 'hotel';
        const baseSlug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let slug = data.slug || baseSlug;
        let counter = 1;
        while (await this.hotelRepo.findOne({ where: { slug } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        const hotel = this.hotelRepo.create({ ...data, companyId, slug });
        return this.hotelRepo.save(hotel);
    }

    async updateHotel(companyId: string, id: string, data: any) {
        const hotel = await this.hotelRepo.findOne({ where: { id, companyId } });
        if (!hotel) throw new NotFoundException('Hotel not found');
        if (data.slug && data.slug !== hotel.slug) {
            const existing = await this.hotelRepo.findOne({ where: { slug: data.slug } });
            if (existing) throw new BadRequestException('This hotel slug is already taken.');
        }
        Object.assign(hotel, data);
        return this.hotelRepo.save(hotel);
    }

    async deleteHotel(companyId: string, id: string) {
        const hotel = await this.hotelRepo.findOne({ where: { id, companyId } });
        if (!hotel) throw new NotFoundException('Hotel not found');
        await this.hotelRepo.remove(hotel);
        return { success: true };
    }

    // ─── Room Types ─────────────────────────────────────────────────────────────

    async getRoomTypes(companyId: string, hotelId: string) {
        return this.roomTypeRepo.find({ where: { companyId, hotelId }, order: { createdAt: 'ASC' } });
    }

    async createRoomType(companyId: string, hotelId: string, data: any) {
        const hotel = await this.hotelRepo.findOne({ where: { id: hotelId, companyId } });
        if (!hotel) throw new NotFoundException('Hotel not found');
        if (data.amenities && Array.isArray(data.amenities)) data.amenities = JSON.stringify(data.amenities);
        if (data.images && Array.isArray(data.images)) data.images = JSON.stringify(data.images);
        const rt = this.roomTypeRepo.create({ ...data, companyId, hotelId });
        return this.roomTypeRepo.save(rt);
    }

    async updateRoomType(companyId: string, id: string, data: any) {
        const rt = await this.roomTypeRepo.findOne({ where: { id, companyId } });
        if (!rt) throw new NotFoundException('Room type not found');
        if (data.amenities && Array.isArray(data.amenities)) data.amenities = JSON.stringify(data.amenities);
        if (data.images && Array.isArray(data.images)) data.images = JSON.stringify(data.images);
        Object.assign(rt, data);
        return this.roomTypeRepo.save(rt);
    }

    async deleteRoomType(companyId: string, id: string) {
        const rt = await this.roomTypeRepo.findOne({ where: { id, companyId } });
        if (!rt) throw new NotFoundException('Room type not found');
        await this.roomTypeRepo.remove(rt);
        return { success: true };
    }

    // ─── Availability ───────────────────────────────────────────────────────────

    async checkAvailability(roomTypeId: string, checkIn: string, checkOut: string): Promise<number> {
        const rt = await this.roomTypeRepo.findOne({ where: { id: roomTypeId } });
        if (!rt) return 0;

        // Count overlapping confirmed/pending/checked_in bookings
        const overlapping = await this.bookingRepo
            .createQueryBuilder('b')
            .where('b.roomTypeId = :roomTypeId', { roomTypeId })
            .andWhere('b.status NOT IN (:...excluded)', { excluded: ['cancelled', 'checked_out'] })
            .andWhere('b.checkIn < :checkOut', { checkOut })
            .andWhere('b.checkOut > :checkIn', { checkIn })
            .getCount();

        return Math.max(0, rt.totalRooms - overlapping);
    }

    // ─── Bookings ───────────────────────────────────────────────────────────────

    async getBookings(companyId: string, filters: any = {}) {
        const qb = this.bookingRepo
            .createQueryBuilder('b')
            .leftJoinAndSelect('b.hotel', 'hotel')
            .leftJoinAndSelect('b.roomType', 'roomType')
            .where('b.companyId = :companyId', { companyId })
            .orderBy('b.createdAt', 'DESC');

        if (filters.hotelId) qb.andWhere('b.hotelId = :hotelId', { hotelId: filters.hotelId });
        if (filters.status) qb.andWhere('b.status = :status', { status: filters.status });
        if (filters.search) {
            qb.andWhere('(b.guestName ILIKE :s OR b.guestEmail ILIKE :s OR b.confirmationCode ILIKE :s)', { s: `%${filters.search}%` });
        }
        if (filters.from) qb.andWhere('b.checkIn >= :from', { from: filters.from });
        if (filters.to) qb.andWhere('b.checkIn <= :to', { to: filters.to });

        return qb.getMany();
    }

    async getBookingById(companyId: string, id: string) {
        const b = await this.bookingRepo.findOne({ where: { id, companyId }, relations: ['hotel', 'roomType'] });
        if (!b) throw new NotFoundException('Booking not found');
        return b;
    }

    async createBooking(companyId: string, data: any) {
        const rt = await this.roomTypeRepo.findOne({ where: { id: data.roomTypeId, companyId } });
        if (!rt) throw new NotFoundException('Room type not found');

        const available = await this.checkAvailability(data.roomTypeId, data.checkIn, data.checkOut);
        if (available < 1) throw new BadRequestException('No rooms available for the selected dates');

        const checkInDate = new Date(data.checkIn);
        const checkOutDate = new Date(data.checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalAmount = nights * Number(rt.pricePerNight);
        const confirmationCode = 'HB' + Math.random().toString(36).substring(2, 7).toUpperCase();

        const booking = this.bookingRepo.create({
            ...data,
            companyId,
            nights,
            totalAmount,
            confirmationCode,
            status: data.status || 'confirmed',
            source: data.source || 'admin',
        });
        return this.bookingRepo.save(booking);
    }

    async updateBookingStatus(companyId: string, id: string, status: string) {
        const booking = await this.bookingRepo.findOne({ where: { id, companyId } });
        if (!booking) throw new NotFoundException('Booking not found');
        booking.status = status;
        return this.bookingRepo.save(booking);
    }

    async deleteBooking(companyId: string, id: string) {
        const booking = await this.bookingRepo.findOne({ where: { id, companyId } });
        if (!booking) throw new NotFoundException('Booking not found');
        await this.bookingRepo.remove(booking);
        return { success: true };
    }

    // ─── Stats ──────────────────────────────────────────────────────────────────

    async getStats(companyId: string) {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        const [total, confirmed, checkedIn, thisMonthBookings] = await Promise.all([
            this.bookingRepo.count({ where: { companyId } }),
            this.bookingRepo.count({ where: { companyId, status: 'confirmed' } }),
            this.bookingRepo.count({ where: { companyId, status: 'checked_in' } }),
            this.bookingRepo
                .createQueryBuilder('b')
                .where('b.companyId = :companyId', { companyId })
                .andWhere('b.checkIn >= :from', { from: firstOfMonth })
                .andWhere('b.status NOT IN (:...ex)', { ex: ['cancelled'] })
                .select('SUM(b.totalAmount)', 'revenue')
                .getRawOne(),
        ]);

        return {
            total,
            confirmed,
            checkedIn,
            revenueThisMonth: Number(thisMonthBookings?.revenue || 0),
        };
    }

    // ─── Public Booking ─────────────────────────────────────────────────────────

    async getPublicHotel(slug: string) {
        const hotel = await this.hotelRepo.findOne({
            where: { slug, isActive: true },
            relations: ['roomTypes'],
        });
        if (!hotel) throw new NotFoundException('Hotel not found');

        const company = await this.companiesService.findOne(hotel.companyId);
        const roomTypes = hotel.roomTypes
            .filter(rt => rt.isActive)
            .map(rt => ({
                ...rt,
                amenities: rt.amenities ? JSON.parse(rt.amenities) : [],
                images: rt.images ? JSON.parse(rt.images) : [],
            }));

        return { hotel: { ...hotel, roomTypes: undefined }, roomTypes, company };
    }

    async publicCheckAvailability(slug: string, roomTypeId: string, checkIn: string, checkOut: string) {
        const hotel = await this.hotelRepo.findOne({ where: { slug, isActive: true } });
        if (!hotel) throw new NotFoundException('Hotel not found');
        const rt = await this.roomTypeRepo.findOne({ where: { id: roomTypeId, hotelId: hotel.id } });
        if (!rt) throw new NotFoundException('Room type not found');

        const available = await this.checkAvailability(roomTypeId, checkIn, checkOut);
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
            available: available > 0,
            roomsLeft: available,
            nights,
            totalAmount: nights * Number(rt.pricePerNight),
            pricePerNight: rt.pricePerNight,
        };
    }

    async publicCreateBooking(slug: string, data: any) {
        const hotel = await this.hotelRepo.findOne({ where: { slug, isActive: true } });
        if (!hotel) throw new NotFoundException('Hotel not found');

        const rt = await this.roomTypeRepo.findOne({ where: { id: data.roomTypeId, hotelId: hotel.id, isActive: true } });
        if (!rt) throw new NotFoundException('Room type not found');

        const available = await this.checkAvailability(data.roomTypeId, data.checkIn, data.checkOut);
        if (available < 1) throw new BadRequestException('No rooms available for the selected dates');

        const checkInDate = new Date(data.checkIn);
        const checkOutDate = new Date(data.checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalAmount = nights * Number(rt.pricePerNight);
        const confirmationCode = 'HB' + Math.random().toString(36).substring(2, 7).toUpperCase();

        const booking = this.bookingRepo.create({
            companyId: hotel.companyId,
            hotelId: hotel.id,
            roomTypeId: rt.id,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            guestPhone: data.guestPhone || null,
            guestNotes: data.guestNotes || null,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            guests: data.guests || 1,
            nights,
            totalAmount,
            confirmationCode,
            status: 'confirmed',
            source: data.source || 'direct',
        });
        await this.bookingRepo.save(booking);

        // Auto-create Lead
        try {
            const existingLead = await this.leadRepo.findOne({
                where: { companyId: hotel.companyId, email: data.guestEmail },
            });
            if (!existingLead) {
                const lead = this.leadRepo.create({
                    companyId: hotel.companyId,
                    name: data.guestName,
                    email: data.guestEmail,
                    phone: data.guestPhone || null,
                    source: 'website' as any,
                    status: 'new' as any,
                    notes: `Auto-created from hotel booking ${confirmationCode} at ${hotel.name}`,
                });
                const savedLead = await this.leadRepo.save(lead);
                booking.leadId = savedLead.id;
                await this.bookingRepo.save(booking);
            } else {
                booking.leadId = existingLead.id;
                await this.bookingRepo.save(booking);
            }
        } catch { /* silent — lead creation is non-critical */ }

        // Send guest confirmation email
        try {
            const checkInFmt = new Date(data.checkIn + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const checkOutFmt = new Date(data.checkOut + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const guestHtml = `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
                    <h2 style="color:#4f46e5;">Booking Confirmed! 🎉</h2>
                    <p>Dear ${data.guestName},</p>
                    <p>Your reservation at <strong>${hotel.name}</strong> has been confirmed.</p>
                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                        <tr><td style="padding:8px;background:#f8f8f8;font-weight:bold;">Confirmation Code</td><td style="padding:8px;">${confirmationCode}</td></tr>
                        <tr><td style="padding:8px;background:#f8f8f8;font-weight:bold;">Room Type</td><td style="padding:8px;">${rt.name}</td></tr>
                        <tr><td style="padding:8px;background:#f8f8f8;font-weight:bold;">Check-In</td><td style="padding:8px;">${checkInFmt} (${hotel.checkInTime})</td></tr>
                        <tr><td style="padding:8px;background:#f8f8f8;font-weight:bold;">Check-Out</td><td style="padding:8px;">${checkOutFmt} (${hotel.checkOutTime})</td></tr>
                        <tr><td style="padding:8px;background:#f8f8f8;font-weight:bold;">Nights</td><td style="padding:8px;">${nights}</td></tr>
                        <tr><td style="padding:8px;background:#f8f8f8;font-weight:bold;">Total Amount</td><td style="padding:8px;">₹${Number(totalAmount).toLocaleString('en-IN')}</td></tr>
                    </table>
                    <p style="color:#666;">${hotel.confirmationMessage || 'We look forward to welcoming you!'}</p>
                    <p style="color:#666;">For any queries, please contact us at ${hotel.phone || hotel.email || ''}.</p>
                </div>`;
            await this.emailService.sendEmail(data.guestEmail, `Booking Confirmed — ${hotel.name} (${confirmationCode})`, guestHtml, 'system');

            // Admin notification
            const company = await this.companiesService.findOne(hotel.companyId);
            if (company?.email) {
                const adminHtml = `<div style="font-family:sans-serif;"><h3>New Hotel Booking</h3><p><b>${data.guestName}</b> (${data.guestEmail}) booked ${rt.name} at ${hotel.name} from ${data.checkIn} to ${data.checkOut}.</p><p>Confirmation: <b>${confirmationCode}</b> | Amount: ₹${Number(totalAmount).toLocaleString('en-IN')}</p></div>`;
                await this.emailService.sendEmail(company.email, `New Booking at ${hotel.name}: ${data.guestName}`, adminHtml, 'system');
            }
        } catch { /* silent */ }

        return { success: true, confirmationCode, bookingId: booking.id };
    }
}

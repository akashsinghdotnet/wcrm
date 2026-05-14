import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from './entities/event.entity';
import { EventTicketType } from './entities/event-ticket-type.entity';
import { EventBooking, BookingStatus, PaymentMethodType } from './entities/event-booking.entity';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { EmailService } from '../email/email.service';
import { User, UserRole } from '../users/user.entity';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        @InjectRepository(Event)
        private eventRepo: Repository<Event>,
        @InjectRepository(EventTicketType)
        private ticketTypeRepo: Repository<EventTicketType>,
        @InjectRepository(EventBooking)
        private bookingRepo: Repository<EventBooking>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private companySettingsService: CompanySettingsService,
        private emailService: EmailService,
    ) { }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async sendBookingEmails(booking: EventBooking) {
        try {
            const admin = await this.userRepo.findOne({
                where: { companyId: booking.companyId, role: UserRole.ADMIN }
            });
            
            if (booking.status === BookingStatus.CONFIRMED) {
                await this.emailService.sendEventBookingClientEmail(booking.guestEmail, {
                    guestName: `${booking.firstName} ${booking.lastName}`,
                    eventName: booking.eventTitle,
                    bookingRef: booking.bookingRef,
                    ticketName: booking.ticketTypeName,
                    quantity: booking.quantity,
                    amount: booking.totalAmount,
                    status: 'Confirmed'
                }, booking.companyId);
            }

            if (admin) {
                await this.emailService.sendEventBookingAdminEmail(admin.email, {
                    eventName: booking.eventTitle,
                    guestName: `${booking.firstName} ${booking.lastName}`,
                    guestEmail: booking.guestEmail,
                    guestPhone: booking.guestPhone,
                    ticketName: booking.ticketTypeName,
                    quantity: booking.quantity,
                    amount: booking.totalAmount,
                    paymentMethod: booking.paymentMethod,
                    status: booking.status
                }, booking.companyId);
            }
        } catch (err) {
            this.logger.error(`Failed to send booking emails for ${booking.id}: ${err.message}`);
        }
    }

    private generateSlug(title: string): string {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    private generateBookingRef(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let ref = 'EVT-';
        for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)];
        return ref;
    }

    // ─── Events CRUD ──────────────────────────────────────────────────────────

    async createEvent(companyId: string, data: Partial<Event>): Promise<Event> {
        if (!data.slug && data.title) {
            data.slug = this.generateSlug(data.title);
        }
        // Ensure slug is unique within company
        const existing = await this.eventRepo.findOne({ where: { companyId, slug: data.slug } });
        if (existing) data.slug = `${data.slug}-${Date.now()}`;

        const event = this.eventRepo.create({ ...data, companyId });
        const savedEvent = await this.eventRepo.save(event);

        // Auto-create a default Ticket Type matching the event's capacity
        await this.ticketTypeRepo.save(
            this.ticketTypeRepo.create({
                eventId: savedEvent.id,
                name: 'General Admission',
                description: 'Standard Entry',
                price: (data as any).price || 0,
                quantity: savedEvent.capacity || 0,
                maxPerBooking: 10,
                isActive: true
            })
        );

        return savedEvent;
    }

    async findAllEvents(companyId: string): Promise<Event[]> {
        return this.eventRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
    }

    async findEventById(id: string, companyId?: string): Promise<Event> {
        const where: any = { id };
        if (companyId) where.companyId = companyId;
        const event = await this.eventRepo.findOne({ where });
        if (!event) throw new NotFoundException('Event not found');
        return event;
    }

    async findPublicEventBySlug(slug: string): Promise<Event> {
        const event = await this.eventRepo.findOne({
            where: { slug, isPublic: true, status: EventStatus.PUBLISHED },
        });
        if (!event) throw new NotFoundException('Event not found or not published');
        return event;
    }

    async updateEvent(id: string, companyId: string, data: Partial<Event>): Promise<Event> {
        const event = await this.findEventById(id, companyId);
        Object.assign(event, data);
        const savedEvent = await this.eventRepo.save(event);
        
        const rawData = data as any;
        if (rawData.price !== undefined || rawData.capacity !== undefined) {
            const ticketTypes = await this.ticketTypeRepo.find({ where: { eventId: id } });
            if (ticketTypes.length > 0) {
                const defaultTicket = ticketTypes.find(t => t.name === 'General Admission') || ticketTypes[0];
                if (rawData.price !== undefined) defaultTicket.price = rawData.price;
                if (rawData.capacity !== undefined) defaultTicket.quantity = rawData.capacity;
                await this.ticketTypeRepo.save(defaultTicket);
            }
        }
        
        return savedEvent;
    }

    async deleteEvent(id: string, companyId: string): Promise<void> {
        const event = await this.findEventById(id, companyId);
        
        await this.bookingRepo.delete({ eventId: id });
        await this.ticketTypeRepo.delete({ eventId: id });
        
        await this.eventRepo.remove(event);
    }

    // ─── Ticket Types ─────────────────────────────────────────────────────────

    async createTicketType(eventId: string, data: Partial<EventTicketType>): Promise<EventTicketType> {
        const tt = this.ticketTypeRepo.create({ ...data, eventId });
        return this.ticketTypeRepo.save(tt);
    }

    async findTicketTypes(eventId: string): Promise<EventTicketType[]> {
        return this.ticketTypeRepo.find({ where: { eventId }, order: { createdAt: 'ASC' } });
    }

    async updateTicketType(id: string, data: Partial<EventTicketType>): Promise<EventTicketType> {
        const tt = await this.ticketTypeRepo.findOne({ where: { id } });
        if (!tt) throw new NotFoundException('Ticket type not found');
        Object.assign(tt, data);
        return this.ticketTypeRepo.save(tt);
    }

    async deleteTicketType(id: string): Promise<void> {
        const tt = await this.ticketTypeRepo.findOne({ where: { id } });
        if (!tt) throw new NotFoundException('Ticket type not found');
        await this.ticketTypeRepo.remove(tt);
    }

    // ─── Bookings ─────────────────────────────────────────────────────────────

    async findBookingsByEvent(eventId: string): Promise<EventBooking[]> {
        return this.bookingRepo.find({ where: { eventId }, order: { createdAt: 'DESC' } });
    }

    async findAllCompanyBookings(companyId: string): Promise<EventBooking[]> {
        return this.bookingRepo.find({ 
            where: { companyId }, 
            order: { createdAt: 'DESC' } 
        });
    }

    async updateBookingStatus(bookingId: string, companyId: string, status: BookingStatus): Promise<EventBooking> {
        const booking = await this.bookingRepo.findOne({ where: { id: bookingId, companyId } });
        if (!booking) throw new NotFoundException('Booking not found');
        booking.status = status;
        return this.bookingRepo.save(booking);
    }

    // ─── Public Booking Flow ──────────────────────────────────────────────────

    async initiateBooking(slug: string, body: {
        ticketTypeId: string;
        quantity: number;
        firstName: string;
        lastName: string;
        guestEmail: string;
        guestPhone?: string;
        paymentMethod: PaymentMethodType;
        notes?: string;
        callbackUrl?: string;
    }) {
        const event = await this.findPublicEventBySlug(slug);
        const ps = await this.companySettingsService.getPrivatePaymentSettings(event.companyId);

        const ticketType = await this.ticketTypeRepo.findOne({ where: { id: body.ticketTypeId, eventId: event.id } });
        if (!ticketType) throw new NotFoundException('Ticket type not found');
        if (!ticketType.isActive) throw new BadRequestException('This ticket type is not currently available');

        // Check availability (0 = unlimited)
        if (ticketType.quantity > 0) {
            const available = ticketType.quantity - ticketType.quantitySold;
            if (body.quantity > available) throw new BadRequestException(`Only ${available} ticket(s) remaining`);
        }
        if (body.quantity > ticketType.maxPerBooking) {
            throw new BadRequestException(`Maximum ${ticketType.maxPerBooking} tickets per booking`);
        }

        const totalAmount = Number(ticketType.price) * body.quantity;
        const currency = event.currency || 'INR';

        const bookingBase = {
            eventId: event.id,
            companyId: event.companyId,
            ticketTypeId: ticketType.id,
            eventTitle: event.title,
            ticketTypeName: ticketType.name,
            firstName: body.firstName,
            lastName: body.lastName,
            guestEmail: body.guestEmail,
            guestPhone: body.guestPhone,
            quantity: body.quantity,
            totalAmount,
            currency,
            notes: body.notes,
            bookingRef: this.generateBookingRef(),
        };

        // ── FREE ──────────────────────────────────────────────────────────────
        if (totalAmount === 0) {
            const booking = await this.bookingRepo.save(
                this.bookingRepo.create({
                    ...bookingBase,
                    status: BookingStatus.CONFIRMED,
                    paymentMethod: PaymentMethodType.FREE,
                })
            );
            if (ticketType.quantity > 0) { ticketType.quantitySold += body.quantity; await this.ticketTypeRepo.save(ticketType); }
            this.sendBookingEmails(booking);
            return { status: 'confirmed', bookingRef: booking.bookingRef, bookingId: booking.id };
        }

        // ── RAZORPAY ──────────────────────────────────────────────────────────
        if (body.paymentMethod === PaymentMethodType.RAZORPAY) {
            const rz = ps?.razorpay;
            if (!rz?.enabled || !rz?.keyId || !rz?.keySecret) throw new BadRequestException('Razorpay is not configured for this event');
            if (!body.callbackUrl) throw new BadRequestException('Callback URL is required for Razorpay payment links');

            const amountPaisa = Math.round(totalAmount * 100);
            const auth = Buffer.from(`${rz.keyId}:${rz.keySecret}`).toString('base64');
            
            const rzRes = await axios.post(
                'https://api.razorpay.com/v1/payment_links',
                {
                    amount: amountPaisa,
                    currency,
                    accept_partial: false,
                    description: `Payment for ${event.title}`,
                    customer: {
                        name: `${body.firstName} ${body.lastName}`,
                        email: body.guestEmail,
                        contact: body.guestPhone || ''
                    },
                    notify: {
                        sms: true,
                        email: true
                    },
                    reminder_enable: true,
                    reference_id: bookingBase.bookingRef,
                    callback_url: body.callbackUrl,
                    callback_method: 'get'
                },
                { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' } }
            );

            const booking = await this.bookingRepo.save(
                this.bookingRepo.create({
                    ...bookingBase,
                    status: BookingStatus.PENDING,
                    paymentMethod: PaymentMethodType.RAZORPAY,
                    gatewayOrderId: rzRes.data.id,
                })
            );

            return {
                status: 'razorpay_link_created',
                short_url: rzRes.data.short_url,
                bookingId: booking.id,
                bookingRef: booking.bookingRef,
            };
        }

        // ── PAYPAL ────────────────────────────────────────────────────────────
        if (body.paymentMethod === PaymentMethodType.PAYPAL) {
            const pp = ps?.paypal;
            if (!pp?.enabled || !pp?.clientId || !pp?.secret) throw new BadRequestException('PayPal is not configured for this event');

            const baseUrl = pp.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
            const tokenRes = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
                auth: { username: pp.clientId, password: pp.secret },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const accessToken = tokenRes.data.access_token;
            const ppCurrency = currency === 'INR' ? 'USD' : currency;
            const ppAmount = currency === 'INR' ? (totalAmount / 83).toFixed(2) : totalAmount.toFixed(2);

            const orderRes = await axios.post(
                `${baseUrl}/v2/checkout/orders`,
                {
                    intent: 'CAPTURE',
                    purchase_units: [{ amount: { currency_code: ppCurrency, value: ppAmount }, description: event.title }],
                },
                { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
            );

            const booking = await this.bookingRepo.save(
                this.bookingRepo.create({
                    ...bookingBase,
                    status: BookingStatus.PENDING,
                    paymentMethod: PaymentMethodType.PAYPAL,
                    gatewayOrderId: orderRes.data.id,
                })
            );

            return {
                status: 'paypal_order_created',
                orderId: orderRes.data.id,
                clientId: pp.clientId,
                currency: ppCurrency,
                bookingId: booking.id,
                bookingRef: booking.bookingRef,
                eventTitle: event.title,
            };
        }

        // ── BANK TRANSFER ─────────────────────────────────────────────────────
        if (body.paymentMethod === PaymentMethodType.BANK_TRANSFER) {
            const bt = ps?.bankTransfer;
            if (!bt?.enabled) throw new BadRequestException('Bank transfer is not configured for this event');

            const booking = await this.bookingRepo.save(
                this.bookingRepo.create({
                    ...bookingBase,
                    status: BookingStatus.PENDING,
                    paymentMethod: PaymentMethodType.BANK_TRANSFER,
                })
            );

            return {
                status: 'bank_transfer_pending',
                bookingRef: booking.bookingRef,
                bookingId: booking.id,
                bankDetails: {
                    bankName: bt.bankName,
                    accountHolder: bt.accountHolder,
                    accountNumber: bt.accountNumber,
                    ifscCode: bt.ifscCode,
                    branch: bt.branch,
                },
                totalAmount,
                currency,
            };
        }

        throw new BadRequestException('Invalid payment method');
    }

    async verifyRazorpayPayment(slug: string, body: {
        razorpay_payment_id: string;
        razorpay_payment_link_id: string;
        razorpay_payment_link_reference_id: string;
        razorpay_payment_link_status: string;
        razorpay_signature: string;
    }) {
        const event = await this.findPublicEventBySlug(slug);
        const ps = await this.companySettingsService.getPrivatePaymentSettings(event.companyId);
        const keySecret = ps?.razorpay?.keySecret;
        if (!keySecret) throw new BadRequestException('Razorpay not configured');

        const payload = `${body.razorpay_payment_link_id}|${body.razorpay_payment_link_reference_id}|${body.razorpay_payment_link_status}|${body.razorpay_payment_id}`;

        const generated = crypto
            .createHmac('sha256', keySecret)
            .update(payload)
            .digest('hex');

        if (generated !== body.razorpay_signature) throw new BadRequestException('Invalid payment signature');

        const booking = await this.bookingRepo.findOne({ where: { bookingRef: body.razorpay_payment_link_reference_id } });
        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.status === BookingStatus.CONFIRMED) return { status: 'confirmed', bookingRef: booking.bookingRef };

        booking.status = BookingStatus.CONFIRMED;
        booking.paymentId = body.razorpay_payment_id;
        await this.bookingRepo.save(booking);

        const tt = await this.ticketTypeRepo.findOne({ where: { id: booking.ticketTypeId } });
        if (tt && tt.quantity > 0) { tt.quantitySold += booking.quantity; await this.ticketTypeRepo.save(tt); }

        this.sendBookingEmails(booking);

        return { status: 'confirmed', bookingRef: booking.bookingRef };
    }

    async verifyPaypalPayment(slug: string, body: { bookingId: string; paypal_order_id: string }) {
        const event = await this.findPublicEventBySlug(slug);
        const ps = await this.companySettingsService.getPrivatePaymentSettings(event.companyId);
        const pp = ps?.paypal;
        if (!pp?.clientId || !pp?.secret) throw new BadRequestException('PayPal not configured');

        const baseUrl = pp.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
        const tokenRes = await axios.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
            auth: { username: pp.clientId, password: pp.secret },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        await axios.post(`${baseUrl}/v2/checkout/orders/${body.paypal_order_id}/capture`, {}, {
            headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
        });

        const booking = await this.bookingRepo.findOne({ where: { id: body.bookingId } });
        if (!booking) throw new NotFoundException('Booking not found');

        booking.status = BookingStatus.CONFIRMED;
        booking.paymentId = body.paypal_order_id;
        await this.bookingRepo.save(booking);

        const tt = await this.ticketTypeRepo.findOne({ where: { id: booking.ticketTypeId } });
        if (tt && tt.quantity > 0) { tt.quantitySold += booking.quantity; await this.ticketTypeRepo.save(tt); }

        return { status: 'confirmed', bookingRef: booking.bookingRef };
    }

    // Booking stats for admin dashboard
    async getEventStats(eventId: string) {
        const bookings = await this.bookingRepo.find({ where: { eventId } });
        const confirmed = bookings.filter(b => b.status === BookingStatus.CONFIRMED);
        const revenue = confirmed.reduce((sum, b) => sum + Number(b.totalAmount), 0);
        return {
            totalBookings: bookings.length,
            confirmedBookings: confirmed.length,
            pendingBookings: bookings.filter(b => b.status === BookingStatus.PENDING).length,
            totalRevenue: revenue,
        };
    }

    async getCompanyStats(companyId: string) {
        const events = await this.eventRepo.find({ where: { companyId } });
        const bookings = await this.bookingRepo.find({ where: { companyId } });
        const confirmedBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED);
        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
        return {
            totalEvents: events.length,
            activeEvents: events.filter(e => e.status === 'published').length,
            totalBookings: confirmedBookings.length,
            totalRevenue,
            recentBookings: bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
        };
    }
}

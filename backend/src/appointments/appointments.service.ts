import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingType } from './entities/meeting-type.entity';
import { AppointmentSetting } from './entities/appointment-setting.entity';
import { Appointment } from './entities/appointment.entity';
import { EmailService } from '../email/email.service';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectRepository(MeetingType) private meetingTypeRepo: Repository<MeetingType>,
        @InjectRepository(AppointmentSetting) private settingsRepo: Repository<AppointmentSetting>,
        @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
        private emailService: EmailService,
        private companiesService: CompaniesService
    ) { }

    // --- Private Methods (CRM Admin) ---

    async getSettings(companyId: string) {
        let settings = await this.settingsRepo.findOne({ where: { companyId } });
        if (!settings) {
            const company = await this.companiesService.findOne(companyId);
            const baseSlug = (company?.companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            let slug = baseSlug;
            let counter = 1;
            while (await this.settingsRepo.findOne({ where: { bookingSlug: slug } })) {
                slug = `${baseSlug}-${counter++}`;
            }
            settings = this.settingsRepo.create({ companyId, bookingSlug: slug });
            await this.settingsRepo.save(settings);
        }
        return settings;
    }

    async updateSettings(companyId: string, data: any) {
        const settings = await this.getSettings(companyId);
        if (data.bookingSlug && data.bookingSlug !== settings.bookingSlug) {
            const existing = await this.settingsRepo.findOne({ where: { bookingSlug: data.bookingSlug } });
            if (existing) throw new BadRequestException('This booking URL is already taken.');
        }
        if (data.schedule && typeof data.schedule === 'object') {
            settings.schedule = JSON.stringify(data.schedule);
        }
        if (data.bookingSlug !== undefined) settings.bookingSlug = data.bookingSlug;
        if (data.timezone !== undefined) settings.timezone = data.timezone;
        if (data.thankYouUrl !== undefined) settings.thankYouUrl = data.thankYouUrl;
        if (data.confirmationMessage !== undefined) settings.confirmationMessage = data.confirmationMessage;
        if (data.brandColor !== undefined) settings.brandColor = data.brandColor;
        if (data.bgColor !== undefined) settings.bgColor = data.bgColor;
        if (data.textColor !== undefined) settings.textColor = data.textColor;
        if (data.buttonTextColor !== undefined) settings.buttonTextColor = data.buttonTextColor;
        if (data.borderRadius !== undefined) settings.borderRadius = data.borderRadius;
        if (data.submitButtonText !== undefined) settings.submitButtonText = data.submitButtonText;
        return this.settingsRepo.save(settings);
    }

    async getMeetingTypes(companyId: string) {
        return this.meetingTypeRepo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
    }

    async createMeetingType(companyId: string, data: Partial<MeetingType>) {
        const slug = data.slug || (data.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const existing = await this.meetingTypeRepo.findOne({ where: { companyId, slug } });
        if (existing) {
            data.slug = `${slug}-${Date.now()}`;
        } else {
            data.slug = slug;
        }
        const meetingType = this.meetingTypeRepo.create({ ...data, companyId });
        return this.meetingTypeRepo.save(meetingType);
    }

    async updateMeetingType(companyId: string, id: string, data: Partial<MeetingType>) {
        const meetingType = await this.meetingTypeRepo.findOne({ where: { id, companyId } });
        if (!meetingType) throw new NotFoundException('Meeting type not found');
        if (data.slug && data.slug !== meetingType.slug) {
            const existing = await this.meetingTypeRepo.findOne({ where: { companyId, slug: data.slug } });
            if (existing) throw new BadRequestException('Slug already in use');
        }
        Object.assign(meetingType, data);
        return this.meetingTypeRepo.save(meetingType);
    }

    async deleteMeetingType(companyId: string, id: string) {
        const result = await this.meetingTypeRepo.delete({ id, companyId });
        if (result.affected === 0) throw new NotFoundException('Meeting type not found');
    }

    async countAll(companyId: string) {
        return this.appointmentRepo.count({ where: { companyId } });
    }

    async countToday(companyId: string) {
        const today = new Date().toISOString().split('T')[0];
        return this.appointmentRepo.count({ where: { companyId, date: today } });
    }

    async countUpcoming(companyId: string) {
        const today = new Date().toISOString().split('T')[0];
        const { MoreThanOrEqual } = await import('typeorm');
        return this.appointmentRepo.count({ where: { companyId, date: MoreThanOrEqual(today), status: 'booked' } });
    }

    async getTodayAppointmentsList(companyId: string) {
        const today = new Date().toISOString().split('T')[0];
        return this.appointmentRepo.find({
            where: { companyId, date: today },
            order: { startTime: 'ASC' },
            relations: ['meetingType']
        });
    }

    async updateStatus(companyId: string, id: string, status: string) {
        const appointment = await this.getAppointmentById(companyId, id);
        appointment.status = status;
        return this.appointmentRepo.save(appointment);
    }

    async reschedule(companyId: string, id: string, date: string, startTime: string) {
        const appointment = await this.getAppointmentById(companyId, id);
        if (!appointment.meetingType) throw new BadRequestException('Meeting type not found');
        
        // Calculate end time
        const durationMs = appointment.meetingType.duration * 60000;
        const startMs = this.timeToMs(startTime);
        const endMs = startMs + durationMs;
        const endH = Math.floor(endMs / 3600000);
        const endM = Math.floor((endMs % 3600000) / 60000);
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

        // Check availability (simplistic check to avoid overlaps)
        const booked = await this.appointmentRepo.find({
            where: { companyId, date, status: 'booked' }
        });
        
        for (const appt of booked) {
            if (appt.id === appointment.id) continue;
            const apptStartMs = this.timeToMs(appt.startTime);
            const apptEndMs = this.timeToMs(appt.endTime);
            if (startMs < apptEndMs && endMs > apptStartMs) {
                throw new BadRequestException('This time slot is no longer available.');
            }
        }

        appointment.date = date;
        appointment.startTime = startTime;
        appointment.endTime = endTime;
        appointment.status = 'booked';
        
        return this.appointmentRepo.save(appointment);
    }

    async getAppointments(companyId: string) {
        return this.appointmentRepo.find({
            where: { companyId },
            order: { date: 'DESC', startTime: 'ASC' },
            relations: ['meetingType']
        });
    }

    async getAppointmentById(companyId: string, id: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id, companyId },
            relations: ['meetingType']
        });
        if (!appointment) throw new NotFoundException('Appointment not found');
        return appointment;
    }

    // --- Public Methods ---

    private async resolveBookingSlug(bookingSlug: string): Promise<string> {
        const settings = await this.settingsRepo.findOne({ where: { bookingSlug } });
        if (!settings) throw new NotFoundException('Booking page not found');
        return settings.companyId;
    }

    async getPublicCompanyAndMeetingType(bookingSlug: string, meetingSlug: string) {
        const companyId = await this.resolveBookingSlug(bookingSlug);
        const company = await this.companiesService.findOne(companyId);
        if (!company) throw new NotFoundException('Company not found');
        const meetingType = await this.meetingTypeRepo.findOne({ where: { companyId, slug: meetingSlug, isActive: true } });
        if (!meetingType) throw new NotFoundException('Meeting type not found or inactive');
        const settings = await this.getSettings(companyId);
        return { company, meetingType, settings };
    }

    async getAvailability(bookingSlug: string, meetingSlug: string, date: string) {
        const { meetingType, settings } = await this.getPublicCompanyAndMeetingType(bookingSlug, meetingSlug);
        const companyId = settings.companyId;
        const schedule = settings.getSchedule();

        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay().toString();
        const dayBlocks = schedule[dayOfWeek] || [];

        if (dayBlocks.length === 0) {
            return { availableSlots: [] as string[] };
        }

        // Generate slots from all time blocks for this day
        const slots: string[] = [];
        const durationMs = meetingType.duration * 60000;

        for (const block of dayBlocks) {
            const [startH, startM] = block.start.split(':').map(Number);
            const [endH, endM] = block.end.split(':').map(Number);
            let currentMs = (startH * 60 + startM) * 60000;
            const endMs = (endH * 60 + endM) * 60000;

            while (currentMs + durationMs <= endMs) {
                const h = Math.floor(currentMs / 3600000);
                const m = Math.floor((currentMs % 3600000) / 60000);
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                slots.push(timeStr);
                currentMs += durationMs;
            }
        }

        // Remove booked slots
        const booked = await this.appointmentRepo.find({
            where: { companyId, date, status: 'booked' }
        });

        const availableSlots = slots.filter(slot => {
            const slotStartMs = this.timeToMs(slot);
            const slotEndMs = slotStartMs + durationMs;
            for (const appt of booked) {
                const apptStartMs = this.timeToMs(appt.startTime);
                const apptEndMs = this.timeToMs(appt.endTime);
                if (slotStartMs < apptEndMs && slotEndMs > apptStartMs) {
                    return false;
                }
            }
            return true;
        });

        return { availableSlots, timezone: settings.timezone };
    }

    async bookAppointment(bookingSlug: string, meetingSlug: string, dto: any) {
        const { company, meetingType, settings } = await this.getPublicCompanyAndMeetingType(bookingSlug, meetingSlug);
        const companyId = settings.companyId;

        const availability = await this.getAvailability(bookingSlug, meetingSlug, dto.date);
        if (!(availability.availableSlots as string[]).includes(dto.startTime)) {
            throw new BadRequestException('This time slot is no longer available.');
        }

        const durationMs = meetingType.duration * 60000;
        const startMs = this.timeToMs(dto.startTime);
        const endMs = startMs + durationMs;
        const endH = Math.floor(endMs / 3600000);
        const endM = Math.floor((endMs % 3600000) / 60000);
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

        const appointment = this.appointmentRepo.create({
            companyId,
            meetingTypeId: meetingType.id,
            guestName: dto.guestName,
            guestEmail: dto.guestEmail,
            guestPhone: dto.guestPhone,
            guestNotes: dto.guestNotes,
            date: dto.date,
            startTime: dto.startTime,
            endTime,
            status: 'booked'
        });

        await this.appointmentRepo.save(appointment);

        this.sendConfirmationEmails(company, appointment, meetingType).catch(err => {
            console.error('Failed to send appointment emails:', err);
        });

        return {
            success: true,
            appointmentId: appointment.id,
            thankYouUrl: settings.thankYouUrl || null,
            confirmationMessage: settings.confirmationMessage || 'Your appointment has been booked successfully!'
        };
    }

    private timeToMs(timeStr: string) {
        const [h, m] = timeStr.split(':').map(Number);
        return (h * 60 + m) * 60000;
    }

    private async sendConfirmationEmails(company: any, appointment: Appointment, meetingType: MeetingType) {
        const subject = `Confirmed: ${meetingType.title} with ${company.companyName}`;
        const guestHtml = `
            <h2>Appointment Confirmed!</h2>
            <p>Hi ${appointment.guestName},</p>
            <p>Your appointment for <strong>${meetingType.title}</strong> has been confirmed.</p>
            <ul>
                <li><strong>Date:</strong> ${appointment.date}</li>
                <li><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</li>
            </ul>
            <p>Thank you!</p>
        `;
        await this.emailService.sendEmail(appointment.guestEmail, subject, guestHtml, 'system');

        if (company.email) {
            const adminHtml = `
                <h2>New Appointment Booked</h2>
                <p><strong>${appointment.guestName}</strong> has booked a <strong>${meetingType.title}</strong>.</p>
                <ul>
                    <li><strong>Date:</strong> ${appointment.date}</li>
                    <li><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</li>
                    <li><strong>Guest Email:</strong> ${appointment.guestEmail}</li>
                    <li><strong>Notes:</strong> ${appointment.guestNotes || 'None'}</li>
                </ul>
            `;
            await this.emailService.sendEmail(company.email, `New Booking: ${appointment.guestName}`, adminHtml, 'system');
        }
    }

    async deleteAppointment(companyId: string, id: string) {
        const appt = await this.appointmentRepo.findOne({ where: { id, companyId } });
        if (!appt) throw new NotFoundException('Appointment not found');
        await this.appointmentRepo.remove(appt);
        return { success: true };
    }
}

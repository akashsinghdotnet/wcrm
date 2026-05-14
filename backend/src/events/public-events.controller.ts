import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { EventsService } from './events.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { PaymentMethodType } from './entities/event-booking.entity';

@Controller('public/events')
export class PublicEventsController {
    constructor(
        private readonly eventsService: EventsService,
        private readonly companySettingsService: CompanySettingsService,
    ) { }

    // Get event details + public-safe payment methods
    @Get(':slug')
    async getEvent(@Param('slug') slug: string) {
        const event = await this.eventsService.findPublicEventBySlug(slug);
        const ticketTypes = await this.eventsService.findTicketTypes(event.id);
        const paymentMethods = await this.companySettingsService.getPublicPaymentSettings(event.companyId);

        return {
            ...event,
            ticketTypes: ticketTypes.filter(t => t.isActive),
            paymentMethods,
        };
    }

    // Initiate booking — returns Razorpay order, PayPal order, bank details, or free confirmation
    @Post(':slug/book')
    async bookEvent(
        @Param('slug') slug: string,
        @Body() body: {
            ticketTypeId: string;
            quantity: number;
            firstName: string;
            lastName: string;
            guestEmail: string;
            guestPhone?: string;
            paymentMethod: PaymentMethodType;
            notes?: string;
            callbackUrl?: string;
        }
    ) {   return this.eventsService.initiateBooking(slug, body);
    }

    // Verify Razorpay payment signature and confirm booking
    @Post(':slug/verify-razorpay')
    async verifyRazorpay(@Param('slug') slug: string, @Body() body: {
        razorpay_payment_id: string;
        razorpay_payment_link_id: string;
        razorpay_payment_link_reference_id: string;
        razorpay_payment_link_status: string;
        razorpay_signature: string;
    }) {
        return this.eventsService.verifyRazorpayPayment(slug, body);
    }

    // Capture PayPal order and confirm booking
    @Post(':slug/verify-paypal')
    async verifyPaypal(@Param('slug') slug: string, @Body() body: {
        bookingId: string;
        paypal_order_id: string;
    }) {
        return this.eventsService.verifyPaypalPayment(slug, body);
    }
}

import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';

/**
 * Payment webhook endpoints (no JWT required).
 * Payment gateways (Razorpay, PayPal) call these URLs
 * to confirm payment status.
 */
@Controller('webhooks/payments')
export class PaymentWebhooksController {
    private readonly logger = new Logger(PaymentWebhooksController.name);

    /**
     * Razorpay payment webhook
     * POST /api/webhooks/payments/razorpay
     *
     * Razorpay sends events like payment.captured, payment.failed, etc.
     * Configure this URL in: Razorpay Dashboard → Settings → Webhooks
     */
    @Post('razorpay')
    @HttpCode(HttpStatus.OK)
    async handleRazorpay(@Body() body: any) {
        this.logger.log(`Razorpay webhook received: ${body?.event}`);

        const event = body?.event;
        const payment = body?.payload?.payment?.entity;

        if (event === 'payment.captured' && payment) {
            this.logger.log(`Payment captured: ₹${payment.amount / 100} | Order: ${payment.order_id} | Email: ${payment.email}`);
            // TODO: In production —
            // 1. Verify signature using razorpay webhook secret
            // 2. Update company subscription status
            // 3. Create invoice record
            // 4. Send confirmation email
        }

        if (event === 'payment.failed' && payment) {
            this.logger.warn(`Payment failed: Order ${payment.order_id} | Reason: ${payment.error_description}`);
        }

        if (event === 'subscription.activated') {
            this.logger.log(`Subscription activated: ${body?.payload?.subscription?.entity?.id}`);
        }

        return { status: 'ok', event };
    }

    /**
     * PayPal payment webhook
     * POST /api/webhooks/payments/paypal
     *
     * PayPal sends events like PAYMENT.CAPTURE.COMPLETED, etc.
     * Configure this URL in: PayPal Developer → My Apps → Webhooks
     */
    @Post('paypal')
    @HttpCode(HttpStatus.OK)
    async handlePaypal(@Body() body: any) {
        this.logger.log(`PayPal webhook received: ${body?.event_type}`);

        const eventType = body?.event_type;
        const resource = body?.resource;

        if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && resource) {
            this.logger.log(`PayPal payment completed: ${resource.amount?.value} ${resource.amount?.currency_code} | ID: ${resource.id}`);
            // TODO: In production —
            // 1. Verify webhook signature using PayPal API
            // 2. Update company subscription status
            // 3. Create invoice record
            // 4. Send confirmation email
        }

        if (eventType === 'PAYMENT.CAPTURE.DENIED') {
            this.logger.warn(`PayPal payment denied: ${resource?.id}`);
        }

        if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            this.logger.log(`PayPal subscription activated: ${resource?.id}`);
        }

        return { status: 'ok', event_type: eventType };
    }

    /**
     * Bank transfer confirmation webhook
     * POST /api/webhooks/payments/bank-transfer
     *
     * Called manually or via third-party tools to confirm
     * that a bank transfer has been received.
     */
    @Post('bank-transfer')
    @HttpCode(HttpStatus.OK)
    async handleBankTransfer(
        @Body() body: { companyId?: string; amount?: number; transactionId?: string; email?: string },
    ) {
        this.logger.log(
            `Bank transfer confirmation: ₹${body.amount} | Company: ${body.companyId} | Txn: ${body.transactionId}`,
        );

        // TODO: In production —
        // 1. Verify the transaction ID against bank statement
        // 2. Update company subscription status
        // 3. Create invoice record
        // 4. Send confirmation email to the company admin

        return {
            status: 'ok',
            message: 'Bank transfer confirmation received',
            companyId: body.companyId,
            amount: body.amount,
            transactionId: body.transactionId,
        };
    }
}

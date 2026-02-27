import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TicketsService } from './src/tickets/tickets.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const ticketsService = app.get(TicketsService);

    try {
        const ticketId = 'eba90b0d-bf84-49e6-8032-ce04a727396a';
        const user = { role: 'super_admin', userId: 'ff2cbb1e-4461-4ce4-a055-7a118d73134d', email: 'sys.admin@magnet.com' } as any;
        const result = await ticketsService.reply(ticketId, user, { message: 'ts-node bypass reply' });
        console.log('Final Ticket Status:', result.status);
    } catch (e) {
        console.error('Test Failed:', e);
    }

    await app.close();
}
bootstrap();

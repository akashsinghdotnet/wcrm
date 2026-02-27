import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketReply } from './src/tickets/entities/ticket-reply.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'debug', 'log', 'verbose'] });
    const repo = app.get(getRepositoryToken(TicketReply));
    
    // fetch exactly the reply we know has null user for Super Admin
    const id = '14101ed9-1b74-459c-8eff-3a863e4d2ea3'; 
    const reply = await repo.findOne({ where: { id }, relations: ['user'] });
    console.log('--- DIRECT TICKET REPLY FETCH ---');
    console.log(reply);
    
    await app.close();
}
bootstrap();

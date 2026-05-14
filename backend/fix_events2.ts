import { DataSource } from 'typeorm';
import { Event } from './src/events/entities/event.entity';
import { EventTicketType } from './src/events/entities/event-ticket-type.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Event, EventTicketType],
    synchronize: false,
});

async function run() {
    await AppDataSource.initialize();
    const eventRepo = AppDataSource.getRepository(Event);
    const ttRepo = AppDataSource.getRepository(EventTicketType);

    const events = await eventRepo.find();
    for (const event of events) {
        const tts = await ttRepo.find({ where: { eventId: event.id } });
        if (tts.length === 0) {
            console.log(`Creating default ticket type for event ${event.title}`);
            await ttRepo.save(
                ttRepo.create({
                    eventId: event.id,
                    name: 'General Admission',
                    description: 'Standard Entry',
                    price: 0,
                    quantity: event.capacity || 0,
                    maxPerBooking: 10,
                    isActive: true
                })
            );
        }
    }
    console.log('Done fixing events');
    process.exit(0);
}
run();

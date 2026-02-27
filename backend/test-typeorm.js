const { DataSource } = require('typeorm');
const { User } = require('./src/users/user.entity');
const { TicketReply } = require('./src/tickets/entities/ticket-reply.entity');
const { Ticket } = require('./src/tickets/entities/ticket.entity');

async function test() {
    // Only importing the DB connection config, not starting nest app
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'priyankasharma',
        password: 'postgres',
        database: 'magnet_crm',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
    });
    await ds.initialize();
    
    // fetch reply
    const id = '06c8d320-fe6d-466d-9e3b-6bb532f234ac'; // One of the super admin replies
    const reply = await ds.getRepository(TicketReply).findOne({ where: { id }, relations: ['user'] });
    console.log('Reply user:', reply.user);
    
    process.exit(0);
}
test();

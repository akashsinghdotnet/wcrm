
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { UsersService } = require('./dist/src/users/users.service');
const { UserRole } = require('./dist/src/users/user.entity');
const bcrypt = require('bcrypt');

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    const email = 'admin@magnethq.com';
    const password = 'password123';

    console.log(`Checking user: ${email}`);
    const user = await usersService.findOne(email);

    if (!user) {
        console.log('❌ User not found!');
    } else {
        console.log(`✅ User found. Role: ${user.role}`);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`🔑 Password match: ${isMatch}`);

        if (user.role !== 'super_admin') {
            console.log('⚠️ WARNING: User exists but is NOT super_admin');
        }
    }

    await app.close();
}

bootstrap();

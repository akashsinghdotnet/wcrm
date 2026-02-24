
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from './src/users/users.service';

async function checkUser() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const user = await usersService.findOne('admin@example.cc');
    console.log('User Role:', user ? user.role : 'User not found');
    await app.close();
}
checkUser();

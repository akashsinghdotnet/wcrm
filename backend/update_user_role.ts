
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from './src/users/users.service';
import { UserRole } from './src/users/user.entity';

async function updateUser() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const user = await usersService.findOne('admin@example.cc');
    if (user) {
        user.role = UserRole.ADMIN;
        await usersService['usersRepository'].save(user); // accessing private repo via bracket notation or just use update if available
        // simpler:
        // await usersService.update(user.id, { role: UserRole.ADMIN }); 
        // usage of update method might require DTO match. 
        // Let's use direct repo access or just assume update works with partial
    }
    console.log('User Role Updated to ADMIN');
    await app.close();
}
updateUser();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from './users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  console.log('Bootstrapping application to reset passwords...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));

  const emails = ['superadmin@magnetcrm.com', 'companyadmin@magnetcrm.com'];
  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  for (const email of emails) {
    const user = await usersRepository.findOne({ where: { email } });
    if (user) {
      user.password = hashedPassword;
      await usersRepository.save(user);
      console.log(`✅ Successfully reset password for ${email}`);
    } else {
      console.log(`⚠️ User not found: ${email}`);
    }
  }

  await app.close();
  console.log('Done!');
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});

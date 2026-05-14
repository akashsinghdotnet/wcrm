import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from './users/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersRepository = app.get<Repository<User>>(getRepositoryToken(User));

  const allUsers = await usersRepository.find({ withDeleted: true });
  console.log('--- ALL USERS IN DATABASE ---');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  for (const u of allUsers) {
    console.log(`- Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
    // Reset EVERY user to password123
    u.password = hashedPassword;
    await usersRepository.save(u);
  }
  
  console.log('-----------------------------');
  console.log('✅ ALL passwords have been reset to: password123');

  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});

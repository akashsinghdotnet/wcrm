import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ModulesService } from './modules/modules.service';
import { Company } from './companies/company.entity';
import { User } from './users/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const companyRepo = app.get<Repository<Company>>(getRepositoryToken(Company));
  const modulesService = app.get(ModulesService);

  const email = 'company_admin_test@wcrm.si';
  const user = await usersRepo.findOne({ where: { email } });
  
  if (user && user.companyId) {
    const company = await companyRepo.findOne({ where: { id: user.companyId }, relations: ['plan'] });
    console.log('Company:', company?.companyName);
    console.log('Plan Features:', company?.plan?.features);
    
    const activeModules = await modulesService.getActiveModules(user.companyId);
    console.log('Active Modules calculated:', activeModules);
  } else {
    console.log('User not found or no company assigned.');
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});

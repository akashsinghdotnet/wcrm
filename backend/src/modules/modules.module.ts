import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleConfig } from './module-config.entity';
import { ModulesService } from './modules.service';
import { Company } from '../companies/company.entity';
import { ModulesController } from './modules.controller';

@Module({
    imports: [TypeOrmModule.forFeature([ModuleConfig, Company])],
    providers: [ModulesService],
    controllers: [ModulesController],
    exports: [ModulesService],
})
export class ModulesModule {}

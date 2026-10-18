import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';
import { User } from '../users/user.entity';
import { Company } from '../companies/company.entity';
import { ModulesModule } from '../modules/modules.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Company]),
        ModulesModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '7d' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [SetupController],
    providers: [SetupService],
    exports: [SetupService],
})
export class SetupModule { }

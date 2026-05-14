import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('undelete-admin')
  async undeleteAdmin() {
    try {
      await this.dataSource.query("UPDATE users SET \"deletedAt\" = NULL WHERE email = 'real.admin.v2@magnet.com'");
      return { success: true, message: 'real.admin.v2@magnet.com has been restored!' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}




import { Controller, Get, Header } from '@nestjs/common';
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

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobots(): string {
    return [
      '# Block all search engines and AI bots completely from api.wcrm.si',
      'User-agent: *',
      'Disallow: /',
      '',
      'User-agent: Google-Extended',
      'Disallow: /',
      '',
      'User-agent: GPTBot',
      'Disallow: /',
      '',
      'User-agent: ChatGPT-User',
      'Disallow: /',
      '',
      'User-agent: ClaudeBot',
      'Disallow: /',
      '',
      'User-agent: Anthropic-AI',
      'Disallow: /',
      '',
      'User-agent: PerplexityBot',
      'Disallow: /',
      '',
      'User-agent: CCBot',
      'Disallow: /',
      '',
      'User-agent: ByteSpider',
      'Disallow: /',
      '',
      'User-agent: Applebot',
      'Disallow: /',
      '',
      'User-agent: FacebookBot',
      'Disallow: /',
      '',
      'User-agent: Googlebot',
      'Disallow: /',
      '',
      'User-agent: Bingbot',
      'Disallow: /',
      '',
      'User-agent: Slurp',
      'Disallow: /',
      '',
      'User-agent: DuckDuckBot',
      'Disallow: /',
      '',
      'User-agent: Baiduspider',
      'Disallow: /',
      '',
      'User-agent: YandexBot',
      'Disallow: /',
      '',
    ].join('\n');
  }
}




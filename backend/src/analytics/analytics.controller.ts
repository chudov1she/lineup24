import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  readVisitorKey,
  setVisitorCookie,
} from '../common/cookies.js';
import { AnalyticsService } from './analytics.service.js';
import { PageviewDto } from './dto/pageview.dto.js';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly config: ConfigService,
  ) {}

  @Post('pageview')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async pageview(
    @Body() dto: PageviewDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    let visitorKey = readVisitorKey(cookies);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    if (!visitorKey) {
      visitorKey = this.analyticsService.createVisitorKey();
      setVisitorCookie(res, visitorKey, isProd);
    }
    return this.analyticsService.recordPageview(visitorKey, dto.path);
  }
}

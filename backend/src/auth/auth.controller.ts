import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { REFRESH_COOKIE } from '../common/cookies.js';
import type { SessionDeviceMeta } from '../sessions/sessions.service.js';
import { AuthService } from './auth.service.js';
import {
  CurrentUser,
  type AuthUser,
} from './decorators/current-user.decorator.js';
import { AcceptLegalDto } from './dto/accept-legal.dto.js';
import {
  EmailChangeCodeDto,
  StartEmailChangeDto,
} from './dto/change-email.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ChangeUsernameDto } from './dto/change-username.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, res, this.deviceMeta(req, dto));
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, res, this.deviceMeta(req, dto));
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email,
      dto.code,
      dto.newPassword,
    );
  }

  @Post('refresh')
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    return this.authService.refresh(cookies?.[REFRESH_COOKIE], res);
  }

  @Post('logout')
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    return this.authService.logout(cookies?.[REFRESH_COOKIE], res);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('accept-legal')
  acceptLegal(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptLegalDto,
    @Req() req: Request,
  ) {
    return this.authService.acceptLegal(
      user.userId,
      dto,
      this.deviceMeta(req, {}),
    );
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-email')
  verifyEmail(@CurrentUser() user: AuthUser, @Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(user.userId, dto.code);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.authService.resendVerification(user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-username')
  changeUsername(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangeUsernameDto,
  ) {
    return this.authService.changeUsername(user.userId, dto.username);
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post('change-email/start')
  startEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: StartEmailChangeDto,
  ) {
    return this.authService.startEmailChange(
      user.userId,
      dto.newEmail,
      dto.currentPassword,
    );
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post('change-email/verify-new')
  verifyEmailChangeNew(
    @CurrentUser() user: AuthUser,
    @Body() dto: EmailChangeCodeDto,
  ) {
    return this.authService.verifyEmailChangeNew(user.userId, dto.code);
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post('change-email/resend')
  resendEmailChange(@CurrentUser() user: AuthUser) {
    return this.authService.resendEmailChangeCode(user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-email/cancel')
  cancelEmailChange(@CurrentUser() user: AuthUser) {
    return this.authService.cancelEmailChange(user.userId);
  }

  private deviceMeta(
    req: Request,
    dto: {
      deviceFingerprint?: string;
      platform?: string;
      deviceType?: string;
      macAddress?: string;
    },
  ): SessionDeviceMeta {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim();

    return {
      ip: forwardedIp || req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: dto.deviceFingerprint,
      platform: dto.platform,
      deviceType: dto.deviceType,
      macAddress: dto.macAddress,
    };
  }
}

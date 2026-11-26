import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.paymentsService.checkout(user.userId, dto);
  }

  /** Browser / dashboard probe — Platega delivers events via POST only. */
  @SkipThrottle()
  @Get('platega/webhook')
  plategaWebhookProbe() {
    return {
      ok: true,
      method: 'POST',
      hint: 'Platega POSTs CONFIRMED / CANCELED / CHARGEBACKED with X-MerchantId + X-Secret',
    };
  }

  @SkipThrottle()
  @Post('platega/webhook')
  plategaWebhook(
    @Headers('x-merchantid') merchantId: string | undefined,
    @Headers('x-secret') secret: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.paymentsService.handlePlategaWebhook(merchantId, secret, body);
  }
}

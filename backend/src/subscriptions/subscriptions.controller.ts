import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { GrantSubscriptionDto } from './dto/grant-subscription.dto.js';
import { UpdateBankDto } from './dto/update-bank.dto.js';
import { SubscriptionsService } from './subscriptions.service.js';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('products')
  listProducts() {
    return this.subscriptionsService.listProducts();
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getMe(user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('grant')
  grant(@CurrentUser() admin: AuthUser, @Body() dto: GrantSubscriptionDto) {
    return this.subscriptionsService.grant(dto.userId, dto.plan, admin.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.subscriptionsService.revoke(id);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/bank')
  updateBank(@Param('id') id: string, @Body() dto: UpdateBankDto) {
    return this.subscriptionsService.updateBankCurrent(id, dto.bankCurrentRub);
  }
}

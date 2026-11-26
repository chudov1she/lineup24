import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { BetsService } from './bets.service.js';
import { CreateBetDto } from './dto/create-bet.dto.js';
import { ListArchiveQueryDto } from './dto/list-archive-query.dto.js';
import { ListBetsQueryDto } from './dto/list-bets-query.dto.js';
import { UpdateBetDto } from './dto/update-bet.dto.js';
import { WatchBetsQueryDto } from './dto/watch-bets-query.dto.js';
import { SubscriptionActiveGuard } from './subscription-active.guard.js';

@ApiTags('bets')
@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('archive')
  archive(@Query() query: ListArchiveQueryDto) {
    return this.betsService.listArchive(query);
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  @Get('watch')
  watch(
    @CurrentUser() user: AuthUser,
    @Query() query: WatchBetsQueryDto,
    @Req() req: Request,
  ) {
    const ac = new AbortController();
    const onClose = () => ac.abort();
    req.on('close', onClose);
    return this.betsService
      .watch(query, user.userId, ac.signal)
      .finally(() => {
        req.off('close', onClose);
      });
  }

  @ApiCookieAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListBetsQueryDto) {
    return this.betsService.list(query, user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, SubscriptionActiveGuard)
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.betsService.findById(id, user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBetDto) {
    return this.betsService.create(dto, user.userId);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBetDto) {
    return this.betsService.update(id, dto);
  }

  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.betsService.remove(id);
  }
}

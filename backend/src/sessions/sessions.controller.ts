import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { SessionsService } from './sessions.service.js';

@ApiTags('sessions')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  listForUser(@CurrentUser() user: AuthUser) {
    return this.sessionsService.listForUser(user.userId);
  }

  @Delete(':id')
  revokeOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sessionsService.revokeOne(user.userId, id);
  }

  @Post('revoke-others')
  revokeAllExceptCurrent(@CurrentUser() user: AuthUser) {
    if (!user.sessionId) {
      return this.sessionsService.revokeAllForUser(user.userId);
    }
    return this.sessionsService.revokeAllExceptCurrent(
      user.userId,
      user.sessionId,
    );
  }
}
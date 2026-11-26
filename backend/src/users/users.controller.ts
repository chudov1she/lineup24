import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.listAdmin(query);
  }

  @Get(':id/detail')
  detail(@Param('id') id: string) {
    return this.usersService.getAdminDetail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.usersService.updateAdmin(id, dto);
  }
}
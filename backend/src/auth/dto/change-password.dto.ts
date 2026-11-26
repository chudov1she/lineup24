import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PasswordRules } from '../../common/password.rules.js';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString({ message: 'Укажите текущий пароль' })
  @MinLength(1, { message: 'Укажите текущий пароль' })
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString({ message: 'Укажите новый пароль' })
  @PasswordRules()
  newPassword!: string;
}

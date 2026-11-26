import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PasswordRules } from '../../common/password.rules.js';

export class RegisterDto {
  @ApiProperty({ example: 'nikita' })
  @IsString({ message: 'Укажите имя пользователя' })
  @MinLength(3, { message: 'Имя пользователя — минимум 3 символа' })
  @MaxLength(32, { message: 'Имя пользователя — максимум 32 символа' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Имя пользователя: только латиница, цифры и _',
  })
  username!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email!: string;

  @ApiProperty({
    minLength: 8,
    description: 'Letter + digit + special character',
    example: 'Password123!',
  })
  @IsString({ message: 'Укажите пароль' })
  @PasswordRules()
  password!: string;

  @ApiProperty({ description: 'Must accept terms of service' })
  @IsBoolean()
  @Equals(true, {
    message: 'Примите пользовательское соглашение',
  })
  tosAccepted!: boolean;

  @ApiProperty({ description: 'Must accept privacy policy' })
  @IsBoolean()
  @Equals(true, {
    message: 'Примите политику конфиденциальности',
  })
  privacyAccepted!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceFingerprint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  macAddress?: string;
}

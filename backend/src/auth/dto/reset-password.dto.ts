import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import { PasswordRules } from '../../common/password.rules.js';

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Укажите корректный email' })
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'Введите код из письма' })
  @Length(6, 6, { message: 'Код должен состоять из 6 цифр' })
  code!: string;

  @ApiProperty({ minLength: 8, example: 'Password123!' })
  @IsString({ message: 'Укажите новый пароль' })
  @PasswordRules()
  newPassword!: string;
}

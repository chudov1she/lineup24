import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangeUsernameDto {
  @ApiProperty({ example: 'nikita' })
  @IsString({ message: 'Укажите имя пользователя' })
  @MinLength(3, { message: 'Имя пользователя — минимум 3 символа' })
  @MaxLength(32, { message: 'Имя пользователя — максимум 32 символа' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Имя пользователя: только латиница, цифры и _',
  })
  username!: string;
}

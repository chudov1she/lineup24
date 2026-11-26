import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class TelegramBindDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  token!: string;
}
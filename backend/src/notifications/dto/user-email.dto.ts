import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UserEmailDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}

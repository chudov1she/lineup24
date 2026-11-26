import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class StartEmailChangeDto {
  @ApiProperty()
  @IsEmail()
  newEmail!: string;

  @ApiProperty({ description: 'Current account password' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;
}

export class EmailChangeCodeDto {
  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code!: string;
}

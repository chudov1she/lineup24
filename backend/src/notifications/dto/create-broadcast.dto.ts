import { ApiProperty } from '@nestjs/swagger';
import { BroadcastAudience } from '@prisma/client';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const MASS_AUDIENCES = [
  BroadcastAudience.EMAIL_OPTED_IN,
  BroadcastAudience.TELEGRAM_OPTED_IN,
  BroadcastAudience.ACTIVE_SUBSCRIBERS,
] as const;

export class CreateBroadcastDto {
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

  @ApiProperty({ enum: MASS_AUDIENCES })
  @IsIn([...MASS_AUDIENCES])
  audience!: (typeof MASS_AUDIENCES)[number];
}
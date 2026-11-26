import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class PushSubscriptionKeysDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  p256dh!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  auth!: string;
}

export class PushSubscribeDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class PushUnsubscribeDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  endpoint!: string;
}

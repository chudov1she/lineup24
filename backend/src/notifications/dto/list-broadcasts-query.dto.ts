import { ApiPropertyOptional } from '@nestjs/swagger';
import { BroadcastAudience } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const MASS_AUDIENCES = [
  BroadcastAudience.EMAIL_OPTED_IN,
  BroadcastAudience.TELEGRAM_OPTED_IN,
  BroadcastAudience.ACTIVE_SUBSCRIBERS,
] as const;

export class ListBroadcastsQueryDto {
  @ApiPropertyOptional({ description: 'Search by title or body' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ enum: ['all', 'mass', 'direct'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'mass', 'direct'])
  kind?: 'all' | 'mass' | 'direct';

  @ApiPropertyOptional({
    enum: MASS_AUDIENCES,
    description: 'Mass audience filter only',
  })
  @IsOptional()
  @IsEnum(BroadcastAudience)
  @IsIn([...MASS_AUDIENCES])
  audience?: (typeof MASS_AUDIENCES)[number];
}

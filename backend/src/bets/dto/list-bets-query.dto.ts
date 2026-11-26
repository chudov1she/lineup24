import { ApiPropertyOptional } from '@nestjs/swagger';
import { BetResult } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListBetsQueryDto {
  @ApiPropertyOptional({ description: 'Search by title or forecast' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: BetResult })
  @IsOptional()
  @IsEnum(BetResult)
  result?: BetResult;

  @ApiPropertyOptional({ enum: ['7d', '30d', '90d', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'all'])
  period?: '7d' | '30d' | '90d' | 'all';
}
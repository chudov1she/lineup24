import { ApiPropertyOptional } from '@nestjs/swagger';
import { BetResult } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateBetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  forecast?: string;

  @ApiPropertyOptional({ example: 1.85 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(1)
  odds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  score?: string | null;

  @ApiPropertyOptional({
    description: 'Аналитический комментарий к сигналу',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string | null;

  @ApiPropertyOptional({ enum: BetResult })
  @IsOptional()
  @IsEnum(BetResult)
  result?: BetResult;

  @ApiPropertyOptional()
  @IsOptional()
  publishedAt?: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateBetDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  forecast!: string;

  @ApiProperty({ example: 1.85 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(1)
  odds!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  score?: string;

  @ApiPropertyOptional({
    description: 'Аналитический комментарий к сигналу',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;

  @ApiPropertyOptional({ enum: BetResult, default: BetResult.PENDING })
  @IsOptional()
  @IsEnum(BetResult)
  result?: BetResult;

  @ApiPropertyOptional()
  @IsOptional()
  publishedAt?: Date;
}

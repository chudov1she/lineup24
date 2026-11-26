import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class WatchBetsQueryDto {
  @ApiPropertyOptional({
    description: 'ISO timestamp — return bets published after this time',
  })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({ default: 25_000, minimum: 5_000, maximum: 55_000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5_000)
  @Max(55_000)
  timeoutMs?: number;
}

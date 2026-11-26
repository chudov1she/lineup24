import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class MetricsQueryDto {
  @ApiPropertyOptional({
    description: 'Period start (YYYY-MM-DD), inclusive. Default: 29 days ago UTC.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Period end (YYYY-MM-DD), inclusive. Default: today UTC.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

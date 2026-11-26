import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const ALLOWED_PAGEVIEW_PATHS = ['/'] as const;

export class PageviewDto {
  @ApiProperty({ enum: ALLOWED_PAGEVIEW_PATHS, example: '/' })
  @IsString()
  @IsIn(ALLOWED_PAGEVIEW_PATHS)
  path!: (typeof ALLOWED_PAGEVIEW_PATHS)[number];
}

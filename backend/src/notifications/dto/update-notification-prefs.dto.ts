import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailSignals?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  telegramSignals?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  browserPushSignals?: boolean;
}
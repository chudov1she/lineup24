import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class GrantSubscriptionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}

import { IsEnum, IsOptional } from 'class-validator';

import { AccountPlan, BillingInterval } from '../../common/enums/entities.enum';

export class CreateCheckoutDto {
  @IsEnum(AccountPlan)
  plan: AccountPlan;

  @IsOptional()
  @IsEnum(BillingInterval)
  interval?: BillingInterval;
}

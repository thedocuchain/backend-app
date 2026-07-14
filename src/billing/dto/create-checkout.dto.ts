import { IsEnum } from 'class-validator';

import { AccountPlan } from '../../common/enums/entities.enum';

export class CreateCheckoutDto {
  @IsEnum(AccountPlan)
  plan: AccountPlan;
}

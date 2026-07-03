import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  method!: string;

  @IsString()
  phone!: string;

  @IsBoolean()
  @IsOptional()
  includeLateFee?: boolean;
}

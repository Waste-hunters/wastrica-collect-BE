import { IsString, IsOptional } from 'class-validator';

export class MomoCallbackDto {
  @IsString()
  transactionId!: string;

  @IsString()
  status!: 'SUCCESSFUL' | 'FAILED';

  @IsString()
  @IsOptional()
  providerRef?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;
}

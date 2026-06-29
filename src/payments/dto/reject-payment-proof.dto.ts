import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectPaymentProofDto {
  @ApiProperty({
    example: 'No matching MoMo transaction found for this reference.',
    description: 'Reason shown to the resident and stored for the audit trail.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

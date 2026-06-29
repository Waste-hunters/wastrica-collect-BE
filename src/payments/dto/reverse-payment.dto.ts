import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReversePaymentDto {
  @ApiProperty({
    example: 'Duplicate entry — household was charged twice for June.',
    description: 'Mandatory reason for the reversal (SRS PAY-010). Stored permanently for audit.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ example: '8107fbcb-79dd-4617-98a3-826ba08f4339' })
  id: string;

  @ApiProperty({ example: 'COPED Group Rwanda' })
  name: string;

  @ApiPropertyOptional({ example: 'RURA-WASTE-2026-001' })
  ruraLicenseNumber?: string | null;

  @ApiProperty({ example: '+250788123456' })
  contactPhone: string;

  @ApiPropertyOptional({ example: 'ops@copedgroup.com' })
  contactEmail?: string | null;

  @ApiProperty({ example: 'STARTER' })
  subscriptionTier: string;

  @ApiProperty({ example: 'TRIAL' })
  subscriptionStatus: string;

  @ApiProperty({ example: 10 })
  lateFeeGraceDays: number;

  @ApiProperty({ example: 'FLAT' })
  lateFeeType: string;

  @ApiProperty({ example: 500 })
  lateFeeAmountRwf: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollectorResponseDto {
  @ApiProperty({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  id: string;

  @ApiProperty({ example: '8107fbcb-79dd-4617-98a3-826ba08f4339' })
  companyId: string;

  @ApiProperty({ example: 'Jean Ndayisenga' })
  fullName: string;

  @ApiProperty({ example: '+250781234567' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'jean@wastrica.io' })
  email?: string | null;

  @ApiProperty({ example: 'COLLECTOR' })
  role: string;

  @ApiProperty({ example: 'INVITED' })
  status: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '4ccdcdfb-f330-49d2-85f2-fda69a00a48b' })
  id: string;

  @ApiPropertyOptional({ example: '8107fbcb-79dd-4617-98a3-826ba08f4339' })
  companyId?: string | null;

  @ApiProperty({ example: 'Jean Ndayisenga' })
  fullName: string;

  @ApiProperty({ example: '+250781234567' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'jean@example.com' })
  email?: string | null;

  @ApiProperty({ example: 'COLLECTOR' })
  role: string;

  @ApiProperty({ example: 'INVITED' })
  status: string;
}

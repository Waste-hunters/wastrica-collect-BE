import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class CreateCollectorDto {
  @ApiProperty({ example: 'Jean Ndayisenga' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '+250781234567' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'jean@wastrica.io' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

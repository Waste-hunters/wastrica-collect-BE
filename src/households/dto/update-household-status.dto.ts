import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum HouseholdStatusDto {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  RELOCATED = 'RELOCATED',
  DECEASED = 'DECEASED',
}

export class UpdateHouseholdStatusDto {
  @ApiProperty({ enum: HouseholdStatusDto, example: HouseholdStatusDto.SUSPENDED })
  @IsEnum(HouseholdStatusDto)
  status: HouseholdStatusDto;
}

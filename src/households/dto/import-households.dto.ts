import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateHouseholdDto } from './create-household.dto';

export class ImportHouseholdsDto {
  @ApiProperty({
    type: CreateHouseholdDto,
    isArray: true,
    description:
      'JSON representation of CSV rows. File upload can be added later without changing the household service.',
  })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateHouseholdDto)
  households: CreateHouseholdDto[];
}

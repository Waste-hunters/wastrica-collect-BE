import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsUUID } from 'class-validator';

export class AssignHouseholdsDto {
  @ApiProperty({
    example: [
      '948e7f7b-ec30-47bb-81ce-f78d620dd4d1',
      '60ccdbd6-19e7-43e4-81e4-97084ba22284',
    ],
  })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  householdIds: string[];
}

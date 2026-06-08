import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LateFeeTypeDto } from './create-company.dto';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(31)
  lateFeeGraceDays?: number;

  @ApiPropertyOptional({ enum: LateFeeTypeDto, example: LateFeeTypeDto.FLAT })
  @IsOptional()
  @IsEnum(LateFeeTypeDto)
  lateFeeType?: LateFeeTypeDto;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateFeeAmountRwf?: number;
}

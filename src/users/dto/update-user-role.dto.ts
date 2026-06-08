import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRoleDto } from './create-user.dto';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRoleDto, example: UserRoleDto.MANAGER })
  @IsEnum(UserRoleDto)
  role: UserRoleDto;
}

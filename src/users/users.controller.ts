import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users & Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('companies/:companyId/users')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'List company users',
    description:
      'Company admins and managers can see staff inside their own company workspace.',
  })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  listCompanyUsers(
    @Param('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.listCompanyUsers(companyId, user.companyId);
  }

  @Post('companies/:companyId/users')
  @Roles('COMPANY_ADMIN')
  @ApiOperation({
    summary: 'Invite company user',
    description:
      'Creates an invited manager, collector, or additional admin. The invited user activates through OTP verification.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiForbiddenResponse({ description: 'Only company admins can invite users.' })
  createCompanyUser(
    @Param('companyId') companyId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createCompanyUser(
      companyId,
      dto,
      user.sub,
      user.companyId,
    );
  }

  @Get('users/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get one company user' })
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(id, user.companyId);
  }

  @Patch('users/:id')
  @Roles('COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update user profile details' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, user.companyId);
  }

  @Patch('users/:id/role')
  @Roles('COMPANY_ADMIN')
  @ApiOperation({ summary: 'Change user role' })
  @ApiOkResponse({ type: UserResponseDto })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, dto, user.companyId);
  }

  @Delete('users/:id')
  @Roles('COMPANY_ADMIN')
  @ApiOperation({
    summary: 'Suspend a user',
    description:
      'Soft-deactivates a user by setting status to SUSPENDED. Financial/audit history should remain intact.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  suspend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.suspend(id, user.companyId);
  }
}

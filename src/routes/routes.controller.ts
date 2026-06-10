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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { AssignHouseholdsDto } from './dto/assign-households.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteResponseDto } from './dto/route-response.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RoutesService } from './routes.service';

@ApiTags('Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('companies/:companyId/zones')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all zones for a company' })
  @ApiOkResponse({ type: RouteResponseDto, isArray: true })
  list(@Param('companyId') companyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.list(companyId, user.companyId);
  }

  @Post('companies/:companyId/zones')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a zone and optionally assign a collector' })
  @ApiCreatedResponse({ type: RouteResponseDto })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.create(companyId, dto, user.companyId);
  }

  @Get('zones/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get zone details with its addresses' })
  @ApiOkResponse({ type: RouteResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.findOne(id, user.companyId);
  }

  @Patch('zones/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update zone details or reassign collector' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.update(id, dto, user.companyId);
  }

  @Delete('zones/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Deactivate a zone' })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.deactivate(id, user.companyId);
  }

  @Post('zones/:id/addresses')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign addresses (households) to a zone' })
  assignAddresses(
    @Param('id') id: string,
    @Body() dto: AssignHouseholdsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.assignAddresses(id, dto, user.companyId);
  }

  @Delete('zones/:id/addresses/:addressId')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove an address from a zone' })
  removeAddress(
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.removeAddress(id, addressId, user.companyId);
  }

  @Get('collectors/:id/zone')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiOperation({ summary: 'Get all zones and their addresses assigned to a collector' })
  collectorZone(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.collectorZone(id, user);
  }
}

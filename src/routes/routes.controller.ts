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
import { RouteMapResponseDto } from './dto/route-map-response.dto';
import { RouteResponseDto } from './dto/route-response.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RoutesService } from './routes.service';

@ApiTags('Routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('companies/:companyId/routes')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List company routes' })
  @ApiOkResponse({ type: RouteResponseDto, isArray: true })
  list(@Param('companyId') companyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.list(companyId, user.companyId);
  }

  @Post('companies/:companyId/routes')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create route and optionally assign a collector' })
  @ApiCreatedResponse({ type: RouteResponseDto })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.create(companyId, dto, user.companyId);
  }

  @Get('routes/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get route details' })
  @ApiOkResponse({ type: RouteResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.findOne(id, user.companyId);
  }

  @Patch('routes/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update route details' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.update(id, dto, user.companyId);
  }

  @Delete('routes/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Deactivate route' })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.deactivate(id, user.companyId);
  }

  @Post('routes/:id/households')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign households to route' })
  assignHouseholds(
    @Param('id') id: string,
    @Body() dto: AssignHouseholdsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.assignHouseholds(id, dto, user.companyId);
  }

  @Delete('routes/:id/households/:householdId')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove household from route' })
  removeHousehold(
    @Param('id') id: string,
    @Param('householdId') householdId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.removeHousehold(id, householdId, user.companyId);
  }

  @Get('routes/:id/map')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get route map household pins' })
  @ApiOkResponse({ type: RouteMapResponseDto })
  map(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.map(id, user.companyId);
  }

  @Get('routes/:id/optimized')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Get suggested route visit order',
    description:
      'Currently prioritizes active households and leaves suspended households last. Payment-aware ordering comes after payments.',
  })
  optimized(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.optimized(id, user.companyId);
  }

  @Get('collectors/:id/route')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiOperation({ summary: 'Get all route map data assigned to a collector' })
  collectorRoute(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.collectorRoute(id, user);
  }
}

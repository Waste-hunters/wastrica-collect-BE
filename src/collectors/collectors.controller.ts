import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CollectorsService } from './collectors.service';
import { CollectorPerformanceDto } from './dto/collector-performance.dto';
import { CollectorResponseDto } from './dto/collector-response.dto';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { UpdateCollectorDto } from './dto/update-collector.dto';

@ApiTags('Collectors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CollectorsController {
  constructor(private readonly collectorsService: CollectorsService) {}

  @Get('companies/:companyId/collectors')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List collectors for a company' })
  @ApiOkResponse({ type: CollectorResponseDto, isArray: true })
  list(@Param('companyId') companyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.collectorsService.list(companyId, user.companyId);
  }

  @Post('companies/:companyId/collectors')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Invite a collector',
    description:
      'Creates an invited COLLECTOR user. The collector activates with the Auth OTP flow.',
  })
  @ApiCreatedResponse({ type: CollectorResponseDto })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCollectorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorsService.create(companyId, dto, user.sub, user.companyId);
  }

  @Get('collectors/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiOperation({ summary: 'Get collector profile' })
  @ApiOkResponse({ type: CollectorResponseDto })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.collectorsService.findOne(id, user);
  }

  @Patch('collectors/:id')
  @Roles('COMPANY_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update collector profile' })
  @ApiOkResponse({ type: CollectorResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectorsService.update(id, dto, user.companyId);
  }

  @Get('collectors/:id/performance')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'COLLECTOR')
  @ApiOperation({
    summary: 'Get collector performance summary',
    description:
      'Returns route and household assignment counts now. Payment performance will fill in once the payments module is implemented.',
  })
  @ApiOkResponse({ type: CollectorPerformanceDto })
  performance(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.collectorsService.performance(id, user);
  }
}

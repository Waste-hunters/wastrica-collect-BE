import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { MomoCallbackDto } from './dto/momo-callback.dto';
import { MomoService } from './momo.service';

@ApiTags('MoMo')
@Controller()
export class MomoController {
  constructor(private readonly momoService: MomoService) {}

  @Post('momo/webhook')
  @ApiOperation({
    summary: 'MoMo payment callback/webhook',
    description: 'Receives payment confirmation from MTN MoMo or Airtel Money.',
  })
  @ApiBody({ type: MomoCallbackDto })
  @ApiOkResponse({ description: 'Callback processed' })
  async handleCallback(@Body() dto: MomoCallbackDto) {
    return this.momoService.handleCallback(dto);
  }

  @Get('households/me/payments/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOUSEHOLD')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for a charge' })
  async getPaymentStatus(@Param('id') id: string) {
    return this.momoService.getPaymentStatus(id);
  }
}

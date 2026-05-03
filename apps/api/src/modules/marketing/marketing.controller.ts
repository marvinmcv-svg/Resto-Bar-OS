import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('campaigns')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(@Body() dto: Record<string, unknown>, @TenantId() tenantId: string) {
    return this.marketingService.createCampaign(tenantId, dto);
  }

  @Get('campaigns')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'List all campaigns' })
  async list(@TenantId() tenantId: string) {
    return this.marketingService.getCampaigns(tenantId);
  }

  @Get('campaigns/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async getOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.marketingService.getCampaign(id, tenantId);
  }

  @Patch('campaigns/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update campaign' })
  async update(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
    @TenantId() tenantId: string,
  ) {
    return this.marketingService.updateCampaign(id, tenantId, dto);
  }

  @Post('campaigns/:id/send')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Send campaign now' })
  async send(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.marketingService.sendCampaign(id, tenantId);
  }

  @Delete('campaigns/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delete campaign' })
  async delete(@Param('id') id: string, @TenantId() tenantId: string) {
    await this.marketingService.deleteCampaign(id, tenantId);
    return { deleted: true };
  }

  @Get('audience-preview')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Preview audience size for segments' })
  async audiencePreview(@Query('segments') segments: string, @TenantId() tenantId: string) {
    const segArray = segments ? segments.split(',') : [];
    return this.marketingService.getAudiencePreview(tenantId, segArray);
  }
}

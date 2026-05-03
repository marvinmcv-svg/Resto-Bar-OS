import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a restaurant group' })
  async create(@Body('name') name: string) {
    return this.groupsService.createGroup(name);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'List all groups' })
  async list() {
    return this.groupsService.getGroups();
  }

  @Post(':groupId/locations')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Add location to group' })
  async addLocation(@Param('groupId') groupId: string, @Body('tenantId') tenantId: string) {
    return this.groupsService.addLocationToGroup(groupId, tenantId);
  }

  @Get(':groupId/overview')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Get group analytics overview' })
  async overview(@Param('groupId') groupId: string) {
    return this.groupsService.getGroupOverview(groupId);
  }
}

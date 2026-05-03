import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  async getAll(@TenantId() tenantId: string, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.getNotifications(tenantId, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count' })
  async unreadCount(@TenantId() tenantId: string) {
    const count = await this.notificationsService.getUnreadCount(tenantId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.notificationsService.markAsRead(id, tenantId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  async markAllAsRead(@TenantId() tenantId: string) {
    return this.notificationsService.markAllAsRead(tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async delete(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.notificationsService.deleteNotification(id, tenantId);
  }
}

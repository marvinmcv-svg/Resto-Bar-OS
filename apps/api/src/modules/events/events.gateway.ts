import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*', credentials: true },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('join-kds')
  handleJoinKds(@MessageBody() data: { tenantId: string; station?: string }, @ConnectedSocket() client: Socket) {
    client.join(`kds:${data.tenantId}`);
    if (data.station) {
      client.join(`kds:${data.tenantId}:${data.station}`);
    }
  }

  @SubscribeMessage('join-floor')
  handleJoinFloor(@MessageBody() data: { tenantId: string }, @ConnectedSocket() client: Socket) {
    client.join(`floor:${data.tenantId}`);
  }

  emitOrderFired(tenantId: string, order: unknown) {
    this.server.to(`kds:${tenantId}`).emit('order:fired', order);
    this.server.to(`floor:${tenantId}`).emit('order:fired', order);
  }

  emitOrderItemUpdated(tenantId: string, item: unknown) {
    this.server.to(`kds:${tenantId}`).emit('item:updated', item);
  }

  emitTableStatusChanged(tenantId: string, table: unknown) {
    this.server.to(`floor:${tenantId}`).emit('table:status', table);
    this.server.to(`tenant:${tenantId}`).emit('table:status', table);
  }

  emitLowStock(tenantId: string, ingredient: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('inventory:low-stock', ingredient);
  }

  emitNewReservation(tenantId: string, reservation: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('reservation:new', reservation);
  }
}

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private onlineUsers = new Map<string, { socketId: string; email: string; name?: string }>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from query, auth handshake, or authorization headers
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        client.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(`Desconectando socket não autenticado: ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify the token
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key-12345',
      });

      // Save user payload onto client for future events
      client['user'] = payload;

      // Track online status
      this.onlineUsers.set(payload.sub, {
        socketId: client.id,
        email: payload.email,
        name: payload.name,
      });

      this.logger.log(`Usuário autenticado conectado: ${payload.email} (${client.id})`);

      // Broadcast list of online user IDs
      this.server.emit('onlineUsersList', Array.from(this.onlineUsers.keys()));
    } catch (err) {
      this.logger.error(`Erro de autenticação no socket: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client['user'];
    if (user && user.sub) {
      this.onlineUsers.delete(user.sub);
      this.logger.log(`Usuário desconectado: ${user.email} (${client.id})`);
      this.server.emit('onlineUsersList', Array.from(this.onlineUsers.keys()));
    }
  }

  @SubscribeMessage('joinOrderChat')
  handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client['user'];
    if (!data.orderId) return { error: 'Order ID is required' };

    client.join(data.orderId);
    this.logger.log(`Usuário ${user?.email} entrou na sala da Ordem: ${data.orderId}`);
    return { status: 'success', room: data.orderId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { orderId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client['user'];
    if (!data.orderId || !data.message) {
      return { error: 'orderId e message são obrigatórios' };
    }

    try {
      // Save message to postgres via Prisma
      const savedMessage = await this.prisma.chat_messages.create({
        data: {
          order_id: data.orderId,
          sender_id: user.userId || user.sub,
          sender_name: user.name || user.email.split('@')[0],
          sender_role: user.role || 'vendedor',
          message: data.message,
          created_at: new Date(),
        },
      });

      // Broadcast message to everyone in the room
      this.server.to(data.orderId).emit('message', savedMessage);

      // Also trigger a general real-time notification/event for changes (ETAPA 12)
      this.server.emit('database_event', {
        table: 'chat_messages',
        action: 'INSERT',
        record: savedMessage,
      });

      return { status: 'sent', messageId: savedMessage.id };
    } catch (error) {
      this.logger.error(`Erro ao salvar mensagem de chat: ${error.message}`);
      return { error: 'Erro interno ao salvar mensagem' };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { orderId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client['user'];
    if (!data.orderId) return;

    // Broadcast "typing" event to all other clients in the same order room
    client.to(data.orderId).emit('typingStatus', {
      userId: user.userId || user.sub,
      name: user.name || user.email.split('@')[0],
      isTyping: data.isTyping,
    });
  }
}

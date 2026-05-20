import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { OrdersModule } from './orders/orders.module';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { GestorModule } from './gestor/gestor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ChatModule,
    UploadModule,
    OrdersModule,
    ClientsModule,
    ProductsModule,
    GestorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

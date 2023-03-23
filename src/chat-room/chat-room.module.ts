import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoomController } from './chat-room.controller';
import { ChatRoomRepository } from './chat-room.repository';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { ChatRoomGateway } from './chat-room.gateway';
import { MessageRepository } from './message.repository';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/email/email.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoomEntity]),
    UsersModule,
    EmailModule,
    AuthModule,
  ],
  controllers: [ChatRoomController],
  providers: [
    UsersService,
    ChatRoomService,
    ChatRoomRepository,
    MessageRepository,
    ChatRoomGateway,
  ],
})
export class ChatRoomModule {}

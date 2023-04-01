import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoomController } from './chat-room.controller';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { ChatRoomGateway } from './chat-room.gateway';
import { MessageRepository } from './repository/message.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoomEntity]), AuthModule],
  controllers: [ChatRoomController],
  providers: [
    ChatRoomService,
    ChatRoomRepository,
    MessageRepository,
    ChatRoomGateway,
  ],
})
export class ChatRoomModule {}

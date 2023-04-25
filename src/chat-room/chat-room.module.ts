import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { ChatRoomService } from './chat-room.service';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { ChatRoomGateway } from './gateway/chat-room.gateway';
import { MessageRepository } from './repository/message.repository';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';
import { MessageEntity } from './entities/message.entity';
import { ChatRoomValidation } from './chat-room.validation';
import { DirectMessageEntity } from './entities/directMessage.entity';
import { DirectMessageRepository } from './repository/directMessage.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoomEntity,
      MessageEntity,
      DirectMessageEntity,
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [
    ChatRoomService,
    ChatRoomValidation,
    ChatRoomRepository,
    DirectMessageRepository,
    MessageRepository,
    ChatRoomGateway,
  ],
})
export class ChatRoomModule {}

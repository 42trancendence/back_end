import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/auth/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';
import { ChatRoomInfo } from './chat-room-info';
import { ChatRoomService } from './chat-room.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { EnterChatRoomDto } from './dto/enter-chat-room.dto';
import { ChatRoomEntity } from './entities/chatRoom.entity';
import { ChatRoomValidationPipe } from './pipes/chat-room-validation.pipe';
import { UpdateChatRoomDto } from './dto/update-chat-room.dto';

@Controller('chat-room')
@UseGuards(AuthGuard())
export class ChatRoomController {
  constructor(private chatRoomService: ChatRoomService) {}

  @Post()
  async createChatRoom(
    @Body(ChatRoomValidationPipe) createChatRoomDto: CreateChatRoomDto,
    @getUser() user: UserEntity,
  ): Promise<void> {
    await this.chatRoomService.createChatRoom(createChatRoomDto, user);
  }

  @Post(':id')
  async enterChatRoom(@Body() enterChatRoomDto: EnterChatRoomDto) {
    const chatRoom = await this.chatRoomService.getChatRoomById(
      enterChatRoomDto.id,
    );

    if (
      chatRoom.isPrivate === true &&
      chatRoom.password !== enterChatRoomDto.password
    ) {
      throw new ForbiddenException('password가 틀렸습니다.');
    }
    return chatRoom;
  }

  @Get()
  async getAllChatRooms(): Promise<ChatRoomInfo[]> {
    return await this.chatRoomService.getAllChatRooms();
  }

  @Get(':id')
  async getChatRoom(@Param('id') chatRoomId: number): Promise<ChatRoomEntity> {
    return await this.chatRoomService.getChatRoomById(chatRoomId);
  }

  @Patch(':id')
  async updateChatRoom(
    @Param('id') roomId: number,
    @Body(ChatRoomValidationPipe) updateChatRoomDto: UpdateChatRoomDto,
    @getUser() user: UserEntity,
  ) {
    const chatRoom = await this.chatRoomService.getChatRoomById(roomId);
    if (!chatRoom) {
      throw new NotFoundException('해당 id의 room을 찾을 수 없습니다.');
    }
    if (chatRoom.owner.id !== user.id) {
      throw new UnauthorizedException('권한이 없습니다.');
    }
    await this.chatRoomService.updateChatRoom(chatRoom, updateChatRoomDto);
  }
}

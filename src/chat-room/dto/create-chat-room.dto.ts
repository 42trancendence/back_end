import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ChatRoomType } from '../enum/chat-room-type.enum';

export class CreateChatRoomDto {
  @ApiProperty({ example: 'room1', description: '채팅방 이름' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'PUBLIC', description: '채팅방 타입' })
  type: ChatRoomType;

  @ApiProperty({ example: '1234', description: '채팅방 비밀번호' })
  @IsString()
  @MinLength(4)
  @IsNotEmpty()
  password: string;
}

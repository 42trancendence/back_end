import { IsNotEmpty } from 'class-validator';

export class EnterChatRoomDto {
  @IsNotEmpty()
  roomName: string;

  password: string;
}

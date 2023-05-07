import { IsNotEmpty } from 'class-validator';

export class ChatRoomUserIdDto {
  @IsNotEmpty()
  userId: string;
}

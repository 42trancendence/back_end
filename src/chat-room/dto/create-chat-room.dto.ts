import { IsBoolean, IsString, MinLength } from 'class-validator';

export class CreateChatRoomDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsBoolean()
  isPrivate: boolean;

  password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: '유저 이름' })
  @IsString()
  @MinLength(4)
  name: string;

  @ApiProperty({ description: '유저 아바타 URL' })
  @IsString()
  @IsNotEmpty()
  avatarImageUrl: string;
}

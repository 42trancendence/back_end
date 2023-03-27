import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: '유저 이름' })
  name: string;
  @ApiProperty({ description: '유저 프로필 이미지 URL' })
  avatarImageUrl: string;
}

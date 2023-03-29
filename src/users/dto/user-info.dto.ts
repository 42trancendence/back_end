import { ApiProperty } from '@nestjs/swagger';

export class UserInfoDto {
  @ApiProperty({ description: '유저의 고유 ID' })
  id: string;
  @ApiProperty({ description: '유저의 이름' })
  name: string;
  @ApiProperty({ description: '유저의 이메일' })
  email: string;
}

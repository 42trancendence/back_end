import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: '유저 이름' })
  @IsString({ message: '유저 이름은 문자열이어야 합니다.' })
  @MinLength(4, { message: '유저 이름은 4글자 이상이어야 합니다.' })
  @MaxLength(20, { message: '유저 이름은 20글자 이하여야 합니다.' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, {
    message: '유저 이름의 첫글자는 영어만 가능합니다.',
  })
  name: string;

  @ApiProperty({ description: '유저 아바타 URL' })
  // @IsString()
  // @IsNotEmpty()
  avatarImageUrl: string;
}

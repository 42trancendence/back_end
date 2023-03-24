import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserLoginDto {
  @IsEmail()
  @ApiProperty({ description: '로그인 email' })
  email: string;

  @IsNotEmpty()
  @ApiProperty({ description: '로그인 password' })
  password: string;
}

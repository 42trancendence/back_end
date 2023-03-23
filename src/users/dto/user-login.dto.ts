import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserLoginDto {
  @ApiProperty({ description: '로그인 email' })
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @ApiProperty({ description: '로그인 password' })
  password: string;
}

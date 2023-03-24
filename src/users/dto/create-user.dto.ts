import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @ApiProperty({ description: '유저 id' })
  id: string;

  @Transform((params) => params.value.trim())
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @ApiProperty({ description: '유저 이름' })
  name: string;

  @IsString()
  @IsEmail()
  @MaxLength(60)
  @ApiProperty({ description: '유저 email' })
  email: string;

  @IsString()
  image: string;
}

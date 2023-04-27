import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { UserEntity } from 'src/users/entities/user.entity';

export class GameStateDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  roomId: string;

  @ApiProperty()
  player1: UserEntity;

  @ApiProperty()
  @IsString()
  player2: UserEntity;

  @ApiProperty()
  @IsNumber()
  player1Score: number;

  @ApiProperty()
  @IsNumber()
  player2Score: number;

  @ApiProperty()
  winnerName: string;

  @ApiProperty()
  loserName: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  status: string;
}

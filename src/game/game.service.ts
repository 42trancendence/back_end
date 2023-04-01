import { Injectable } from '@nestjs/common';
import { GameRepository } from './repository/game.repository';
import { UserEntity } from 'src/users/entities/user.entity';
import { GameRoomDto } from './dto/gameRoom.dto';

@Injectable()
export class GameService {
    constructor(private gameRepository: GameRepository) {}

    async createGameRoom(title: string, maxPlayer: number, owner: UserEntity) {
        return await this.gameRepository.createGameRoom(title, maxPlayer, owner);
    }

    async matchGameRoom(player: UserEntity) {
        return await this.gameRepository.matchGameRoom(player);
    }
}

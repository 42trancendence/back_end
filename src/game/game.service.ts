import { Injectable } from '@nestjs/common';
import { GameRepository } from './repository/game.repository';
import { UserEntity } from 'src/users/entities/user.entity';
import { Server, Socket } from 'socket.io';

@Injectable()
export class GameService {
    constructor(
        private gameRepository: GameRepository
    ) {}

    getRoomList(client: Socket, server: Server) {
        const rooms = [];
        for (const [room, sockets] of server.adapter['rooms']) {
          // TODO: 로비는 제외해야 한다.
            const players = Array.from(sockets);
            // console.log('room', server.)
            rooms.push({ room: room, players: players });
        }
        client.emit('getRoomList', JSON.stringify(rooms));
    }

    async createGameRoom(title: string, maxPlayer: number, owner: UserEntity) {
        return await this.gameRepository.createGameRoom(title, maxPlayer, owner);
    }

    async matchGameRoom(player: UserEntity) {
        return await this.gameRepository.matchGameRoom(player);
    }
}

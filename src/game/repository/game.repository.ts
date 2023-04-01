import { Injectable } from "@nestjs/common";
import { UserEntity } from "src/users/entities/user.entity";
import { DataSource, Repository } from "typeorm";
import { GameRoomsEntity } from "../entities/gameRooms.entity";
import { GameRoomDto } from "../dto/gameRoom.dto";

@Injectable()
export class GameRepository extends Repository<GameRoomsEntity> {
    constructor(datasource: DataSource) {
        super(GameRoomsEntity, datasource.createEntityManager());
    }

    async createGameRoom(title: string, maxPlayer: number, owner: UserEntity) {
        const gameRoom = new GameRoomsEntity();
        gameRoom.name = title;
        gameRoom.maxPlayer = maxPlayer;
        gameRoom.owner = owner;
        this.save(gameRoom);
        return gameRoom;
    }

    async matchGameRoom(player: UserEntity) {
        const gameRoom = await this.findOne({ where: { maxPlayer: 1 } });
        if (gameRoom) {
            gameRoom.maxPlayer = 2;
            this.save(gameRoom);
            return gameRoom;
        }
        return null;
    }
}
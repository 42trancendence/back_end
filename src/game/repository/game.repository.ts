import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { GameStatEntity } from "../entities/gameStat.entity";
import { GameStatDto } from "../dto/gameRoom.dto";

@Injectable()
export class GameRepository extends Repository<GameStatEntity> {
    constructor(datasource: DataSource) {
        super(GameStatEntity, datasource.createEntityManager());
    }

    async updateGameStat(gameStat: GameStatDto) {
        this.save(gameStat);
        return gameStat;
    }
}
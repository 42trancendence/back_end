import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { GameStatEntity } from "../entities/gameStat.entity";
import { Game } from "../classes/game.class";

@Injectable()
export class GameRepository extends Repository<GameStatEntity> {
    constructor(datasource: DataSource) {
        super(GameStatEntity, datasource.createEntityManager());
    }

    async saveGameState(gameState: Game) {
        // this.save(gameState);
        // return gameState;
    }
}
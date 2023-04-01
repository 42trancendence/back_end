import {
    Controller,
    Logger,
    Post,
    UseGuards,
    Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/auth/decorator/get-user.decorator';
import { UserEntity } from 'src/users/entities/user.entity';

@ApiTags('Game API')
@Controller('game')
export class GameController {
    constructor(
        private gameService: GameService,
    ) {}

    private readonly gameLogger = new Logger(GameController.name);

    // @Post('/')
    // @UseGuards(AuthGuard('jwt'))
    // @ApiOperation({
    //     summary: '게임방 생성 API',
    //     description: '게임방을 생성한다.',
    // })
    // async createGameRoom(
    //     @Body('title') title: string,
    //     @Body('maxPlayer') maxPlayer: number,
    //     @getUser() owner: UserEntity,
    // ) {
    //     this.gameLogger.verbose('[POST] /game');
    //     return await this.gameService.createGameRoom(title, maxPlayer, owner);
    // }

    @Post('/match')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({
        summary: '게임매치 참여 API',
        description: '게임매치를 신청한다.',
    })
    async matchGameRoom(
        @getUser() player: UserEntity,
    ) {
        this.gameLogger.verbose('[POST] /game/match');
        return await this.gameService.matchGameRoom(player);
    }

}

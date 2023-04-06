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

}

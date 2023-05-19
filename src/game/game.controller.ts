import { Controller, Logger, Get, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GameService } from './game.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Game API')
@UseGuards(AuthGuard('access-jwt'))
@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  private readonly gameLogger = new Logger(GameController.name);

  @ApiOperation({ summary: 'Get game players info' })
  @Get('/:id')
  async getGamePlayersInfo(@Param('id') roomId: string) {
    this.gameLogger.log(`[getGamePlayersInfo]: ${roomId}`);

    return this.gameService.getGamePlayersInfo(roomId);
  }
}

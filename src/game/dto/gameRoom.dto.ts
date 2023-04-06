import { ApiProperty } from "@nestjs/swagger";

export class GameStatDto {
    @ApiProperty({ description: '1_플레이어' })
    playerId_1: string;

    @ApiProperty({ description: '1_score' })
    player_1_score: number;

    @ApiProperty({ description: '2_플레이어' })
    playerId_2: string;

    @ApiProperty({ description: '2_score' })
    player_2_score: number;

    @ApiProperty({ description: '승자' })
    winnerName: string;

    @ApiProperty({ description: '패자' })
    loserName: string;

    @ApiProperty({ description: '날짜' })
    date: Date;
}

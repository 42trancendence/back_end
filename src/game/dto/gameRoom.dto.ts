import { ApiProperty } from "@nestjs/swagger";

export class GameRoomDto {
    @ApiProperty({ description: "게임방 이름" })
    title: string;
    @ApiProperty({ description: "게임방 최대 인원" })
    maxPlayer: number;
    @ApiProperty({ description: "게임방 소유자" })
    owner: string;
}

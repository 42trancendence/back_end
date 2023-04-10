import { Player } from "./player.class"

export class PlayerList
{
    private players: Array<Player> = [];

    constructor() {}

    public addUser(user: Player): void {
        this.players.push(user);
    }

    public remove(user: Player): void {
        this.players = this.players.filter((p) => p !== user);
    }

    public getPlayers(): Array<Player> {
        return this.players;
    }

    public getSize(): number {
        return this.players.length;
    }

    public isPlayerByUserId(userId: string): boolean {
        return this.players.some((p) => p.getId() === userId);
    }

    public getPlayerByUserId(userId: string): Player {
        return this.players.find((p) => p.getId() === userId);
    }

    public isFull(): boolean {
        return this.players.length >= 10;
    }

    public matchPlayers(): Array<Player> {
        if (this.players.length < 2) {
            return null;
        }

        const player1 = this.players.shift();
        const player2 = this.players.shift();
        return [player1, player2];
    }

}
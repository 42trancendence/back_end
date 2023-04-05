import { User } from "./user.class"


export class Players
{
    private players: Array<User> = new Array();

    constructor() {}

    public addUser(user: User): void {
        this.players.push(user);
    }

    public remove(user: User): void {
        this.players = this.players.filter((p) => p !== user);
    }

    public getPlayers(): Array<User> {
        return this.players;
    }

    public getPlayersLength(): number {
        return this.players.length;
    }

    public isPlayerinPlayers(player: User): boolean {
        return this.players.includes(player);
    }

    public isPlayersFull(): boolean {
        return this.players.length >= 10;
    }

    public matchPlayers(): Array<User> {
        if (this.players.length < 2) {
            return null;
        }

        const player1 = this.players.shift();
        const player2 = this.players.shift();
        return [player1, player2];
    }

}
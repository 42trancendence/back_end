import { User } from "./user.class"

export class Players
{
    private players: Array<User> = [];

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

    public getSize(): number {
        return this.players.length;
    }

    public isUserById(userId: string): boolean {
        return this.players.some((p) => p.getId() === userId);
    }

    public getUserBySocketId(userId: string): User {
        return this.players.find((p) => p.getSocketId() === userId);
    }

    public getUserById(userId: string): User {
        return this.players.find((p) => p.getId() === userId);
    }

    public isFull(): boolean {
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
import { Player } from './player.class';
import { GameVariable } from '../constants/gameVariable';

export class WaitQueue {
    // new Array<Player>(); 해야하는가?
    private queue: Array<Player> = [];

    constructor() {}

    public addUser(user: Player): void {
        this.queue.push(user);
    }

    public removeUser(user: Player): void {
        this.queue = this.queue.filter((p) => p !== user);
    }

    public getQueue(): Array<Player> {
        return this.queue;
    }

    public getQueueLength(): number {
        return this.queue.length;
    }

    public isPlayerinQueue(user: Player): boolean {
        return this.queue.includes(user);
    }

    public isUserInQueueById(userId: string): boolean {
        return this.queue.some((p) => p.getId() === userId);
    }

    public isQueueFull(): boolean {
        return this.queue.length >= GameVariable.maxQueue;
    }

    public getMatchPlayers(): Array<Player> {
        if (this.queue.length < GameVariable.matchPlyers) {
            return null;
        }

        const player1 = this.queue.shift();
        const player2 = this.queue.shift();
        return [player1, player2];
    }
}
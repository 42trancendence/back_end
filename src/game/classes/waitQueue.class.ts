import { User } from './user.class';
import { GameVariable } from './gameVariable.class';

export class WaitQueue {
    // new Array<User>(); 해야하는가?
    private queue: Array<User> = [];

    constructor() {}

    public addUser(user: User): void {
        this.queue.push(user);
    }

    public removeUser(user: User): void {
        this.queue = this.queue.filter((p) => p !== user);
    }

    public getQueue(): Array<User> {
        return this.queue;
    }

    public getQueueLength(): number {
        return this.queue.length;
    }

    public isPlayerinQueue(user: User): boolean {
        return this.queue.includes(user);
    }

    public isUserInQueueById(userId: string): boolean {
        return this.queue.some((p) => p.getId() === userId);
    }

    public isQueueFull(): boolean {
        return this.queue.length >= GameVariable.maxQueue;
    }

    public getMatchPlayers(): Array<User> {
        if (this.queue.length < GameVariable.matchPlyers) {
            return null;
        }

        const player1 = this.queue.shift();
        const player2 = this.queue.shift();
        return [player1, player2];
    }
}
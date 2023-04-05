import { Player } from './player.class';

export class WaitQueue {
//   private queue: Array<Player> = new Array();
    private queue: Array<Player>;

    constructor() {}

    public addPlyer(player: Player): void {
        this.queue.push(player);
    }

    public removePlyer(player: Player): void {
        this.queue = this.queue.filter((p) => p !== player);
    }

    public getQueue(): Array<Player> {
        return this.queue;
    }

    public getQueueLength(): number {
        return this.queue.length;
    }

    public isPlayerinQueue(player: Player): boolean {
        return this.queue.includes(player);
    }

    public isQueueFull(): boolean {
        return this.queue.length >= 10;
    }

    public matchPlayers(): Array<Player> {
        if (this.queue.length < 2) {
            return null;
        }

        const player1 = this.queue.shift();
        const player2 = this.queue.shift();
        return [player1, player2];
    }
}
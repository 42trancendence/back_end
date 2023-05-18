import { GameVariable } from '../constants/gameVariable';

export class WaitQueue {
  private queue: Array<string> = [];

  constructor() {}

  public addUser(userId: string): void {
    this.queue.push(userId);
  }

  public removeUser(userId: string): void {
    this.queue = this.queue.filter((id) => id !== userId);
  }

  public getQueue(): Array<string> {
    return this.queue;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public isPlayerinQueue(userId: string): boolean {
    return this.queue.includes(userId);
  }

  public isQueueFull(): boolean {
    return this.queue.length >= GameVariable.maxQueue;
  }

  public getMatchPlayers(): Array<string> {
    if (this.queue.length < GameVariable.matchPlyers) {
      return null;
    }

    const player1Id = this.queue.shift();
    const player2Id = this.queue.shift();
    return [player1Id, player2Id];
  }
}

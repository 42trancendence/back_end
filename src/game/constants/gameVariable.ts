export enum GameStatus {
  Wait = 'WAIT',
  Play = 'PLAY',
  End = 'END'
}

export class GameVariable {
  public static readonly maxQueue = 100;
  public static readonly matchPlyers = 2;
  public static readonly maxGame = 100;
  public static readonly maxWatchers = 5;
  public static readonly maxScore = 5;

  public static readonly cavasWidth = 800;
  public static readonly cavasHeight = 600;
  public static readonly paddleWidth = 10;
  public static readonly paddleHeight = 100;
  public static readonly leftPaddleX = 0;
  public static readonly rightPaddleX = GameVariable.cavasWidth - GameVariable.paddleWidth;
  public static readonly paddleSpeed = 10;
  public static readonly boundedPaddleHeight = 20;

  public static readonly ballRadius = 10;
  public static readonly ballSpeed = 10;
}

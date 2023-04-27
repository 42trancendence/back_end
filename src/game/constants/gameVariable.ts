export enum GameStatus {
  Wait = 'WAIT',
  Play = 'PLAY',
  End = 'END',
}

export class GameVariable {
  public static readonly maxQueue = 100;
  public static readonly matchPlyers = 2;
  public static readonly maxGame = 100;
  public static readonly maxWatchers = 5;
  public static readonly maxScore = 10;

  public static readonly canvasWidth = 500;
  public static readonly canvasHeight = 500;
  public static readonly paddleWidth = 10;
  public static readonly paddleHeight = 200;
  public static readonly leftPaddleX = 0;
  public static readonly rightPaddleX =
    GameVariable.canvasWidth - GameVariable.paddleWidth;
  public static readonly paddleSpeed = 10;
  public static readonly boundedPaddleHeight = 20;

  public static readonly ballRadius = 10;
  public static readonly normalBallSpeed = 30;
  public static readonly hardBallSpeed = 50;
}

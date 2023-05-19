export enum GameStatus {
  WAIT = 'wait',
  PLAY = 'play',
  END = 'end',
  LOBBY = 'lobby',
  MATCHING = 'matching',
  WATCH = 'watch',
}

export class GameVariable {
  public static readonly maxQueue = 100;
  public static readonly matchPlyers = 2;
  public static readonly maxGame = 100;

  public static readonly normalDifficulty = 'normal';
  public static readonly hardDifficulty = 'hard';

  public static readonly normalFinalScore = 5;
  public static readonly hardFinalScore = 10;

  public static readonly canvasWidth = 1200;
  public static readonly canvasHeight = 800;
  public static readonly paddleWidth = 20;
  public static readonly paddleHeight = 200;
  public static readonly leftPaddleX = 0;
  public static readonly rightPaddleX =
    GameVariable.canvasWidth - GameVariable.paddleWidth;
  public static readonly paddleSpeed = 20;
  public static readonly boundedPaddleHeight = 20;

  public static readonly ballRadius = 10;
  public static readonly normalBallSpeed = 8;
  public static readonly hardBallSpeed = 11;
}

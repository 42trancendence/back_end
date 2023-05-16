import {
  Injectable,
  Logger,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import emailConfig from './config/emailConfig';
import { validationSchema } from './config/validationSchema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameModule } from './game/game.module';
import { ChatRoomModule } from './chat-room/chat-room.module';
import authConfig from './config/authConfig';
import postgreConfig from './config/postgreConfig';
import { AuthModule } from './auth/auth.module';
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module';
import { FriendModule } from './friend/friend.module';
import { PostgreConfigProvider } from './config/postgre-config.provider';
import { EventsModule } from './events/events.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerModule } from '@nestjs/throttler';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');
  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${userAgent} ${ip},`,
      );
    });
    next();
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '/public'),
    }),
    ConfigModule.forRoot({
      envFilePath: [`${__dirname}/config/env/.${process.env.NODE_ENV}.env`],
      load: [emailConfig, authConfig, postgreConfig],
      isGlobal: true,
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      useClass: PostgreConfigProvider,
    }),
    UsersModule,
    AuthModule,
    FriendModule,
    ChatRoomModule,
    TwoFactorAuthModule,
    FriendModule,
    GameModule,
    EventsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

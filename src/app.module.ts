import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import emailConfig from './config/emailConfig';
import { validationSchema } from './config/validationSchema';
import { TypeOrmModule } from '@nestjs/typeorm';
<<<<<<< HEAD
import { typeORMConfig } from './config/typeorm.config';
=======
import { GameModule } from './game/game.module';
>>>>>>> dev
import { ChatRoomModule } from './chat-room/chat-room.module';
import authConfig from './config/authConfig';
import postgreConfig from './config/postgreConfig';
import { AuthModule } from './auth/auth.module';
import { TwoFactorAuthModule } from './two-factor-auth/two-factor-auth.module';
<<<<<<< HEAD
import { GameModule } from './game/game.module';
=======
import { FriendModule } from './friend/friend.module';
import { PostgreConfigProvider } from './config/postgre-config.provider';
>>>>>>> dev

@Module({
  imports: [
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
    ChatRoomModule,
    TwoFactorAuthModule,
<<<<<<< HEAD
    GameModule
=======
    FriendModule,
>>>>>>> dev
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

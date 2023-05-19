import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenStrategy } from './strategy/access-token.strategy';
import { FortyTwoStrategy } from './strategy/forty-two.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { RefreshTokenStrategy } from './strategy/refresh-token.strategy';
import { WsJwtStrategy } from './strategy/ws-jwt.strategy';

@Global()
@Module({
  imports: [
    UsersModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: 'secret',
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    FortyTwoStrategy,
    WsJwtStrategy,
  ],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}

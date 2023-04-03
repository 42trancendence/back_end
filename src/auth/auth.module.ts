import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenStrategy } from './strategy/access-token.strategy';
import { UserRepository } from 'src/users/repository/user.repository';
import { FortyTwoStrategy } from './strategy/forty-two.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { RefreshTokenStrategy } from './strategy/refresh-token.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: 'secret',
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    FortyTwoStrategy,
  ],
  exports: [AuthService, UserRepository, PassportModule, JwtModule],
})
export class AuthModule {}

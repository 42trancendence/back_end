import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserRepository } from 'src/users/repository/user.repository';
import { FortyTwoStrategy } from './strategy/forty-two.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { TwoFactorAuthService } from './2fa.service';
import { TwoFactorAuthController } from './2fa.controller';

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
  providers: [
    AuthService,
    JwtStrategy,
    UserRepository,
    FortyTwoStrategy,
    TwoFactorAuthService,
  ],
  exports: [AuthService, UserRepository, PassportModule, JwtModule],
  controllers: [AuthController, TwoFactorAuthController],
})
export class AuthModule {}

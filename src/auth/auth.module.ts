import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt.strategy';
import { UserRepository } from 'src/users/repository/user.repository';
import { FortyTwoStrategy } from './strategy/forty-two.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { TwoFactorAuthModule } from 'src/two-factor-auth/two-factor-auth.module';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: 'secret',
    }),
    UsersModule,
    TwoFactorAuthModule,
  ],
  providers: [AuthService, JwtStrategy, UserRepository, FortyTwoStrategy],
  exports: [AuthService, UserRepository, PassportModule, JwtModule],
  controllers: [AuthController],
})
export class AuthModule {}

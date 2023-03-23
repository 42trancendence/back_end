import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from 'src/users/user.repository';
import { FortyTwoStrategy } from './forty-two.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: 'secret',
      signOptions: {
        expiresIn: 60 * 60,
      },
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, UserRepository, FortyTwoStrategy],
  exports: [AuthService, UserRepository, PassportModule, JwtModule],
  controllers: [AuthController],
})
export class AuthModule {}

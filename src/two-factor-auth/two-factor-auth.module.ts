import { Module } from '@nestjs/common';
import { AccessTokenStrategy } from 'src/auth/strategy/access-token.strategy';
import { TwoFactorStrategy } from 'src/auth/strategy/two-factor.strategy';
import { UserRepository } from 'src/users/repository/user.repository';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorAuthService } from './two-factor-auth.service';

@Module({
  imports: [UsersModule],
  controllers: [TwoFactorAuthController],
  providers: [
    TwoFactorAuthService,
    UserRepository,
    AccessTokenStrategy,
    UsersService,
    TwoFactorStrategy,
  ],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

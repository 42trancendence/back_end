import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TwoFactorEntity } from './entities/two-fator-auth.entity';
import { TwoFactorRepository } from './repository/two-factor-auth.repository';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorAuthService } from './two-factor-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([TwoFactorEntity])],
  controllers: [TwoFactorAuthController],
  providers: [TwoFactorAuthService, TwoFactorRepository],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}

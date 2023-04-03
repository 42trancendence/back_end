import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { UserRepository } from './repository/user.repository';
import { FriendShipRepository } from './repository/friendship.repository';
import { FriendShipEntity } from './entities/friendship.entity';
import { UsersGateway } from './gateway/users.gateway';
import { CacheModule } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, FriendShipEntity]),
    CacheModule.register(),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtModule,
    UserRepository,
    FriendShipRepository,
    UsersGateway,
  ],
  exports: [UsersService, UserRepository, FriendShipRepository],
})
export class UsersModule {}

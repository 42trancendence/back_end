import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UserRepository } from './repository/user.repository';
import { FriendShipRepository } from './repository/friendship.repository';
import { FriendShipEntity } from './entities/friendship.entity';
import { UsersGateway } from './gateway/users.gateway';
import { FriendService } from './friend.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, FriendShipEntity])],
  controllers: [UsersController],
  providers: [
    FriendService,
    UsersService,
    UserRepository,
    FriendShipRepository,
    UsersGateway,
  ],
  exports: [UsersService, UserRepository, FriendShipRepository],
})
export class UsersModule {}

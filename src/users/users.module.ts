import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { UserRepository } from './repository/user.repository';
import { FriendShipRepository } from './repository/friendship.repository';
import { FriendShipEntity } from './entities/friendship.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, FriendShipEntity])],
  controllers: [UsersController],
  providers: [UsersService, JwtModule, UserRepository, FriendShipRepository],
  exports: [UsersService, UserRepository, FriendShipRepository],
})
export class UsersModule {}

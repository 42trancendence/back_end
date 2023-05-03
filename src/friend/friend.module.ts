import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendShipRepository } from './repository/friendship.repository';
import { FriendShipEntity } from './entities/friendship.entity';
import { FriendService } from './friend.service';
import { UsersModule } from 'src/users/users.module';
import { FriendGateway } from './gateway/friend.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([FriendShipEntity]), UsersModule],
  providers: [FriendService, FriendShipRepository, FriendGateway],
  exports: [FriendShipRepository],
})
export class FriendModule {}

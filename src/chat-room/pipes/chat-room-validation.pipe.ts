import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import * as bcrypt from 'bcrypt';

export class ChatRoomValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!Object.values<string>(ChatRoomType).includes(value.type)) {
      throw new BadRequestException(`${value.type} isn't ChatRoomType`);
    }
    if (value.type === ChatRoomType.PROTECTED) {
      if (value.password === null || value.password === undefined) {
        throw new BadRequestException('protected room needs password');
      }
      value.password = bcrypt.hashSync(value.password, 10);
    }

    if (
      value.type === ChatRoomType.PUBLIC ||
      value.type === ChatRoomType.PRIVATE
    ) {
      value.password = null;
    }
    value.name = value.name;
    return value;
  }
}

import { PipeTransform } from '@nestjs/common';
import { ChatRoomType } from '../enum/chat-room-type.enum';
import * as bcrypt from 'bcrypt';
import { WsException } from '@nestjs/websockets';
import { ErrorStatus } from '../enum/error-status.enum';

export class ChatRoomValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!Object.values<string>(ChatRoomType).includes(value.type)) {
      throw new WsException(`올바른 채팅방 타입이 아닙니다.`);
    }
    if (value.type === ChatRoomType.PROTECTED) {
      if (
        value.password === null ||
        value.password === undefined ||
        value.password === ''
      ) {
        throw new WsException({
          status: ErrorStatus.WARNING,
          message: '비공개 채팅방은 비밀번호가 필요합니다.',
        });
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

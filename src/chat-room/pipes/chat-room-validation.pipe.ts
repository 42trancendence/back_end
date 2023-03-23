import { BadRequestException, PipeTransform } from '@nestjs/common';

export class ChatRoomValidationPipe implements PipeTransform {
  transform(value: any) {
    if (value.isPrivate === 'true') value.isPrivate = true;
    else if (value.isPrivate === 'false') value.isPrivate = false;
    else throw new BadRequestException(`${value.isPrivate} isn't boolean type`);

    if (value.isPrivate === true && value.password === undefined) {
      throw new BadRequestException('private room needs password');
    }
    if (value.isPrivate === false) {
      value.password = null;
    }
    return value;
  }
}

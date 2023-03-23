import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export class WsAuthGuard extends AuthGuard('wsjwt') {
  constructor() {
    super();
  }

  getRequest(context: ExecutionContext) {
    console.log(context.switchToWs().getClient().handshake.headers);
    return context.switchToWs().getClient().handshake;
  }
}

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WsAuthGuard extends AuthGuard('wsjwt') {
  getRequest(context: ExecutionContext): any {
    return context.switchToWs().getClient().handshake;
  }
}

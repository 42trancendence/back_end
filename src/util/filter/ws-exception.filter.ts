import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter implements ExceptionFilter<WsException> {
  private readonly logger = new Logger(WsExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof WsException) {
      const errInfo = exception.getError().valueOf();
      const client: Socket = host.switchToWs().getClient();
      this.logger.error(errInfo['message']);
      const callback = host.getArgByIndex(2);
      if (callback && typeof callback === 'function') {
        callback({ status: errInfo['status'], message: errInfo['message'] });
      }
    } else if (exception instanceof UnauthorizedException) {
      const client: Socket = host.switchToWs().getClient();
      const message = exception.message;
      this.logger.error(message);

      client.emit('tokenError', 401, message);
    }
  }
}

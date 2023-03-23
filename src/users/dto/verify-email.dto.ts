import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'email 인증 토큰' })
  signupVerifyToken: string;
}

import { registerAs } from '@nestjs/config';

export default registerAs('postgre', () => ({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true' ? true : false,
}));

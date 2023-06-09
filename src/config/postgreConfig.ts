import { registerAs } from '@nestjs/config';

export default registerAs('postgre', () => ({
  host: process.env.POSTGRES_HOST,
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  name: process.env.POSTGRES_NAME,
  port: Number(process.env.POSTGRES_PORT),
  synchronize: process.env.POSTGRES_SYNCHRONIZE === 'true' ? true : false,
}));

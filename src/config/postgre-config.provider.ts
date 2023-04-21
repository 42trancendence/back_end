import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import postgreConfig from './postgreConfig';

@Injectable()
export class PostgreConfigProvider {
  constructor(
    @Inject(postgreConfig.KEY) private config: ConfigType<typeof postgreConfig>,
  ) {}
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      database: this.config.name,
      entities: [__dirname + '/../**/**/*.entity.{ts,js}'],
      synchronize: this.config.synchronize,
    };
  }
}

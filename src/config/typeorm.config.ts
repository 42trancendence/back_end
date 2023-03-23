import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

// NOTE: TypeORM
// node.js 에서 실행되고 Typescript로 작성된 객체 관계형 매퍼 라이브러리
// 특징과 이점
// - 모델을 기반으로 데이터베이스 테이블 체계를 자동으로 생성한다.
// - 데이터베이스에서 개체를 쉽게 삽입, 업데이트 및 삭제할 수 있다.
// - 테이블간의 매핑을 만든다.
// - 간단한 CLI명령을 제공한다.

// NOTE: ORM(Object Relational Mapping)
// 객체와 관계형 데이터베이스의 데이터를 자동으로 변형 및 연결하는 작업
// ORM을 이용한 개발은 객체와 데이터베이스의 변형에 유연하게 사용가능하다
export const typeORMConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  // ip hardcoding for cluster mac
  host: '127.0.0.1',
  port: +process.env.DATABASE_PORT,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: 'transcendence',
  entities: [__dirname + '/../**/**/*.entity.{ts,js}'],
  synchronize: true,
};

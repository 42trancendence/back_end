import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TwoFactorEntity } from '../entities/two-fator-auth.entity';

@Injectable()
export class TwoFactorRepository extends Repository<TwoFactorEntity> {
  constructor(dataSource: DataSource) {
    super(TwoFactorEntity, dataSource.createEntityManager());
  }

  async getTwoFactorAuthById(twoFactorId: string) {
    return this.findOne({ where: { id: twoFactorId } });
  }

  async setSecret(twoFactor: TwoFactorEntity, secret: string) {
    return this.update(twoFactor.id, { code: secret });
  }
}

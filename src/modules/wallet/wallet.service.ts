import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletRepository } from './wallet.repository';
import { validate as uuidValidate } from 'uuid';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletRepository)
    private walletRepository: WalletRepository,
  ) {}

  // todo: getSubWallets()

  async getById(id: string) {
    return this.walletRepository.getById(id);
  }

  async getByName(name: string) {
    return this.walletRepository.getByName(name);
  }

  // todo: getWallet()

  async getByIdOrName(idOrName: string) {
    if (uuidValidate(idOrName)) {
      return this.getById(idOrName);
    } else {
      return this.getByName(idOrName);
    }
  }

  // todo: createWallet()
  // todo: updateWallet()
  // todo: getAllWallets()
  // todo: hasControlOver()
  // todo: batchCreateWallet()
  // todo: addWalletToMapConfig()
  // todo: batchTransferWallet()
  // todo: hasControlOverByName()
}

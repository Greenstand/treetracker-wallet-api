import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransferRepository } from './transfer.repository';
import { TokenService } from '../token/token.service';
import { WalletService } from '../wallet/wallet.service';
import { TrustService } from '../trust/trust.service';
import { Transfer } from './entity/transfer.entity';
import { TRANSFER_STATES, TRANSFER_TYPES } from './transfer-enums';
import { ENTITY_TRUST_REQUEST_TYPE } from '../trust/trust-enum';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    @InjectRepository(TransferRepository)
    private readonly transferRepository: TransferRepository,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    private readonly trustService: TrustService,
  ) {}

  static removeWalletIds(transfer: Transfer): Partial<Transfer> {
    const { ...transferWithoutWalletIds } = transfer;

    return transferWithoutWalletIds;
  }

  /*
   * Check if it is deduct, if true, throw 403, cause we do not support it yet
   */
  async isDeduct(parentId: string, sender: { id: string }): Promise<boolean> {
    if (parentId === sender.id) {
      return false;
    }
    const result = await this.walletService.hasControlOver(parentId, sender.id);
    if (result) {
      return false;
    }
    return true;
  }

  async transferBundle(
    walletLoginId: string,
    sender: any,
    receiver: any,
    bundleSize: number,
    claimBoolean: boolean,
  ): Promise<Partial<Transfer>> {
    const notClaimedTokenCount =
      await this.tokenService.countNotClaimedTokenByWallet(sender.id);

    if (notClaimedTokenCount < bundleSize) {
      throw new HttpException(
        'do not have enough token to send.',
        HttpStatus.CONFLICT,
      );
    }
    const isDeduct = await this.isDeduct(walletLoginId, sender);
    const hasTrust = await this.trustService.hasTrust(
      walletLoginId,
      ENTITY_TRUST_REQUEST_TYPE.send,
      sender,
      receiver,
    );

    const hasControlOverSender = await this.walletService.hasControlOver(
      walletLoginId,
      sender.id,
    );

    const hasControlOverReceiver = await this.walletService.hasControlOver(
      walletLoginId,
      receiver.id,
    );

    let state: TRANSFER_STATES;
    if (
      (hasControlOverSender && hasControlOverReceiver) ||
      (!isDeduct && hasTrust)
    ) {
      state = TRANSFER_STATES.completed;
    } else if (hasControlOverSender) {
      state = TRANSFER_STATES.pending;
    } else if (hasControlOverReceiver) {
      state = TRANSFER_STATES.requested;
    } else {
      throw new HttpException(
        'Unauthorized transfer attempt',
        HttpStatus.FORBIDDEN,
      );
    }

    const transfer = this.transferRepository.create({
      originatorWalletId: { id: walletLoginId } as any,
      sourceWalletId: { id: sender.id } as any,
      destinationWalletId: { id: receiver.id } as any,
      state,
      type: TRANSFER_TYPES.send,
      parameters: {
        bundle: {
          bundleSize,
        },
      },
      claim: claimBoolean,
    });

    await this.transferRepository.save(transfer);

    Logger.debug('now, deal with tokens');
    const tokens = await this.tokenService.getTokensByBundle(
      sender.id,
      bundleSize,
      // claimBoolean,
    );

    await this.tokenService.completeTransfer(tokens, transfer, claimBoolean);

    return TransferService.removeWalletIds(transfer);
  }
}

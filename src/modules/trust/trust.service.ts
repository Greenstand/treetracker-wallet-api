import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';
import { PaginationOptions } from '../../common/interfaces/pagination-options.interface';
import { Trust } from './entity/trust.entity';
import { DeepPartial } from 'typeorm';
import { Wallet } from '../wallet/entity/wallet.entity';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
} from './trust-enum';
import { TrustFilterDto } from './dto/trust-filter.dto';
import * as Joi from 'joi';

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name);

  constructor(
    @InjectRepository(TrustRepository)
    private trustRepository: TrustRepository,
  ) {}

  async getByFilter(
    filter: any,
    paginationOptions?: PaginationOptions,
  ): Promise<Trust[]> {
    return this.trustRepository.getByFilter(filter, paginationOptions);
  }

  async createTrust(trustData: DeepPartial<Trust>): Promise<Trust> {
    return this.trustRepository.createEntity(trustData);
  }

  async getTrustRelationships(filterDto: TrustFilterDto): Promise<Trust[]> {
    const {
      walletId,
      state,
      type,
      request_type,
      offset,
      limit,
      sort_by,
      order,
    } = filterDto;

    const filter = this.getTrustRelationshipFilter({
      walletId,
      state,
      type,
      request_type,
    });

    return this.trustRepository.getByFilter(filter, {
      offset,
      limit,
      sort_by,
      order,
    });
  }

  /**
   * Construct the filter object for querying trust relationships
   */
  private getTrustRelationshipFilter({
    walletId,
    state,
    type,
    request_type,
  }: Partial<TrustFilterDto>): any {
    const filter: any = {};

    if (walletId) {
      filter.walletId = walletId;
    }
    if (state) {
      filter.state = state;
    }
    if (type) {
      filter.type = type;
    }
    if (request_type) {
      filter.request_type = request_type;
    }

    return filter;
  }

  /*
   * Get all relationships which have been accepted
   */
  async getTrustRelationshipsTrusted(walletId: string): Promise<Trust[]> {
    return this.getTrustRelationships({
      walletId,
      state: ENTITY_TRUST_STATE_TYPE.trusted,
    });
  }

  /*
   * To check if the indicated trust relationship exist between the source and
   * target wallet
   */
  async hasTrust(
    walletLoginId: string,
    trustType: string,
    senderWallet: Wallet,
    receiveWallet: Wallet,
  ): Promise<boolean> {
    const trustTypeSchema = Joi.string().valid(
      ...Object.values(ENTITY_TRUST_REQUEST_TYPE),
    );

    Joi.assert(trustType, trustTypeSchema);

    const trustRelationships =
      await this.getTrustRelationshipsTrusted(walletLoginId);

    // check if the trust exists
    const trustExists = trustRelationships.some((trustRelationship) => {
      return (
        (trustRelationship.actor_wallet_id === senderWallet.id &&
          trustRelationship.target_wallet_id === receiveWallet.id &&
          trustRelationship.request_type === ENTITY_TRUST_REQUEST_TYPE.send) ||
        (trustRelationship.actor_wallet_id === receiveWallet.id &&
          trustRelationship.target_wallet_id === senderWallet.id &&
          trustRelationship.request_type === ENTITY_TRUST_REQUEST_TYPE.receive)
      );
    });

    if (trustExists) {
      this.logger.debug('check trust passed');
      return true;
    }

    return false;
  }
}

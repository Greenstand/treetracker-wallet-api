import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';

@Injectable()
export class TrustService {
  constructor(
    @InjectRepository(TrustRepository)
    private trustRepository: TrustRepository,
  ) {}
}

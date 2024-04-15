import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class JWTService {
  private readonly privateKEY: string;
  private readonly publicKEY: string;
  private readonly signingOptions: jwt.SignOptions;
  private readonly verifyOptions: jwt.VerifyOptions;

  constructor(private configService: ConfigService) {
    this.privateKEY = this.configService
      .get<string>('PRIVATE_KEY')
      .replace(/\\n/g, '\n');
    this.publicKEY = this.configService
      .get<string>('PUBLIC_KEY')
      .replace(/\\n/g, '\n');
    this.signingOptions = {
      issuer: 'greenstand',
      expiresIn: '365d',
      algorithm: 'RS256',
    };
    this.verifyOptions = {
      issuer: 'greenstand',
      algorithms: ['RS256'],
    };
  }

  sign(payload: Record<string, unknown>): string {
    return jwt.sign(payload, this.privateKEY, this.signingOptions);
  }

  verify(authorization: string): any {
    if (!authorization) {
      throw new HttpException(
        'Authentication, no token supplied for protected path',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenArray = authorization.split(' ');
    const token = tokenArray[1];

    if (!token || tokenArray[0] !== 'Bearer') {
      throw new HttpException(
        'Authentication, token not verified',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const decoded = jwt.verify(token, this.publicKEY, this.verifyOptions);
      if (!decoded['id']) {
        throw new HttpException(
          'Authentication, invalid token received',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return decoded;
    } catch (error) {
      throw new HttpException(
        'Authentication, token not verified',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}

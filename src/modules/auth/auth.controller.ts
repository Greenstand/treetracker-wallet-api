import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInDto: SignInDto,
    @Headers('treetracker-api-key') apiKey: string,
  ): Promise<{ token: string }> {
    this.logger.debug(
      `Received request to signIn with wallet: ${signInDto.wallet} and apiKey: ${apiKey}`,
    );
    const token = await this.authService.signIn(
      signInDto.wallet,
      signInDto.password,
      apiKey,
    );
    return { token };
  }
}

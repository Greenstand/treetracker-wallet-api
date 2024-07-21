import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInDto: SignInDto,
    @Headers('treetracker-api-key') apiKey: string,
  ): Promise<{ token: string }> {
    const token = await this.authService.signIn(
      signInDto.wallet,
      signInDto.password,
      apiKey,
    );
    return { token };
  }
}

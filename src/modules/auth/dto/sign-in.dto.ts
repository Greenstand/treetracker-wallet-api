import { IsString, MinLength, MaxLength } from 'class-validator';

export class SignInDto {
  @IsString()
  @MinLength(3)
  @MaxLength(55)
  wallet: string;

  @IsString()
  @MaxLength(32)
  password: string;
}

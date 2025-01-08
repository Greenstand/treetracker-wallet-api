import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error('catch error:', exception);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        code: status,
        message: exception.message,
      });
    } else if (exception instanceof Error && 'details' in exception) {
      const validationError = exception as Error & {
        details: { message: string }[];
      };
      response.status(422).json({
        code: 422,
        message: validationError.details.map((m) => m.message).join(';'),
      });
    } else {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Unknown error (${exception instanceof Error ? exception.message : 'Unknown error'})`,
      });
    }
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      code = this.codeFromStatus(status);
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const body = exceptionResponse as {
        message?: string | string[];
        error?: string;
        code?: string;
      };
      message = Array.isArray(body.message)
        ? body.message.join('; ')
        : (body.message ?? message);
      code = body.code ?? body.error ?? this.codeFromStatus(status);
      details = body;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Never leak Nest throttler class names to clients.
    if (
      status === HttpStatus.TOO_MANY_REQUESTS ||
      /throttler|too many requests/i.test(message)
    ) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      code = 'RATE_LIMITED';
      message =
        'Слишком много запросов. Подождите немного и попробуйте снова.';
    }

    this.logger.warn(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.url,
        status,
        code,
        message,
      }),
    );

    response.status(status).json({
      code,
      message,
      statusCode: status,
      requestId: request.requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && details
        ? { details }
        : {}),
    });
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 429:
        return 'RATE_LIMITED';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR';
    }
  }
}

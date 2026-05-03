import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const body = exception.getResponse() as any;

    response.status(status).json({
      success: false,
      error: {
        code: Array.isArray(body.message) ? body.message[0] : body.message || 'ERROR',
        message: Array.isArray(body.message) ? body.message[0] : body.message,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
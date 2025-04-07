import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;

    this.logger.log(`[REQUEST] ${method} ${url}`);

    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`[RESPONSE] ${method} ${url} ${Date.now() - now}ms`);
        },
        error: (err) => {
          this.logger.error(`[ERROR] ${method} ${url} ${Date.now() - now}ms`);
          this.logger.error(`[ERROR DATA] ${JSON.stringify(err)}`);
        },
      }),
    );
  }
}

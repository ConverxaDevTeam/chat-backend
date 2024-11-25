import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetSessionId = createParamDecorator((_data, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  const sessionId = req.sessionId;
  return sessionId;
});

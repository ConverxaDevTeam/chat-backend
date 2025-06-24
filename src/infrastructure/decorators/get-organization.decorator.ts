import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetOrganization = createParamDecorator((data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest();
  const organizationId = request.params.organizationId || request.query.organizationId;
  if (!organizationId) {
    throw new Error('Organization ID not found in request parameters or query');
  }

  return parseInt(organizationId, 10);
});

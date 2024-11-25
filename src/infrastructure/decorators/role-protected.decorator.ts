import { META_ROLES } from '@infrastructure/constants';
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata(META_ROLES, roles);

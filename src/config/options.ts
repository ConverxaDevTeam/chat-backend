import { ConfigModuleOptions as CMO } from '@nestjs/config/dist/interfaces';

import configuration from './configuration';

export const ConfigModuleOptions: CMO = {
  isGlobal: true,
  envFilePath: '.env',
  load: [configuration],
};

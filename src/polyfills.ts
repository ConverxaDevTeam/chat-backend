// Este archivo proporciona polyfills para módulos que pueden no estar disponibles globalmente
import * as cryptoModule from 'crypto';

// Hacer que crypto esté disponible globalmente para @nestjs/schedule
(global as any).crypto = {
  randomUUID: () => cryptoModule.randomUUID(),
};

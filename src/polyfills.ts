// En Node.js v23, global.crypto ya existe y no se puede sobrescribir
// Solo extendemos la funcionalidad si es necesario
if (!global.crypto.randomUUID) {
  const cryptoModule = require('crypto');
  // Extender el objeto crypto existente en lugar de sobrescribirlo
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: () => cryptoModule.randomUUID(),
    configurable: true,
    writable: true,
  });
}

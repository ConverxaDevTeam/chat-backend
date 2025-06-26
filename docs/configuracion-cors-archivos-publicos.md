# Configuración CORS para Archivos Públicos

## Problema Identificado

La ruta `https://back-chat.converxa.net/files/converxa-chat.min.js` estaba siendo bloqueada por CORS, impidiendo que el archivo JavaScript del chat widget fuera accesible públicamente desde otros dominios.

## Cambios Realizados

### 1. Configuración CORS en main.ts

Se actualizó la configuración de CORS en `src/main.ts` para permitir acceso público a rutas de archivos estáticos:

```typescript
// Configuración de CORS específica para rutas públicas - permitir todos los orígenes
const publicCorsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
  credentials: false,
  optionsSuccessStatus: 200,
};

app.use('/files', cors(publicCorsOptions));
app.use('/assets', cors(publicCorsOptions));
app.use('/images', cors(publicCorsOptions));
app.use('/logos', cors(publicCorsOptions));
app.use('/audio', cors(publicCorsOptions));
```

### 2. Configuración ServeStaticModule en app.module.ts

Se actualizó la configuración del módulo de archivos estáticos para la ruta `/files`:

```typescript
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'uploads', 'scripts'),
  serveRoot: '/files',
  serveStaticOptions: {
    index: false,
    setHeaders: (res, path, stat) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
      res.set('Cache-Control', 'public, max-age=31536000');
    },
  },
}),
```

## Rutas Afectadas

Las siguientes rutas ahora permiten acceso público sin restricciones de CORS:

- `/files/*` - Scripts del chat widget (converxa-chat.min.js)
- `/assets/*` - Recursos estáticos generales
- `/images/*` - Imágenes públicas
- `/logos/*` - Logotipos de organizaciones
- `/audio/*` - Archivos de audio

## Verificación de Funcionamiento

### 1. Prueba desde Navegador

Abrir la consola del desarrollador en cualquier sitio web y ejecutar:

```javascript
fetch('https://back-chat.converxa.net/files/converxa-chat.min.js')
  .then(response => {
    console.log('Status:', response.status);
    console.log('CORS Headers:', response.headers.get('access-control-allow-origin'));
    return response.text();
  })
  .then(content => {
    console.log('Content length:', content.length);
    console.log('First 100 chars:', content.substring(0, 100));
  })
  .catch(error => console.error('Error:', error));
```

### 2. Prueba con cURL

```bash
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://back-chat.converxa.net/files/converxa-chat.min.js
```

### 3. Verificar Headers de Respuesta

La respuesta debe incluir estos headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Origin, X-Requested-With
Cache-Control: public, max-age=31536000
```

## Archivos Modificados

1. `src/main.ts` - Configuración CORS principal
2. `src/app.module.ts` - Configuración ServeStaticModule

## Consideraciones de Seguridad

- **Solo métodos seguros**: Se permiten únicamente GET, HEAD y OPTIONS
- **Sin credenciales**: `credentials: false` para prevenir envío de cookies
- **Cache público**: Los archivos se pueden cachear por 1 año para mejorar rendimiento
- **Headers limitados**: Solo se permiten headers esenciales para funcionamiento básico

## Monitoreo

Para verificar que la configuración sigue funcionando:

```bash
# Verificar disponibilidad del archivo
curl -I https://back-chat.converxa.net/files/converxa-chat.min.js

# Verificar headers CORS
curl -H "Origin: https://test.com" -I https://back-chat.converxa.net/files/converxa-chat.min.js
```

## Troubleshooting

### Problema: Aún recibo errores CORS

1. Verificar que el servidor esté reiniciado después de los cambios
2. Limpiar cache del navegador
3. Verificar que nginx no esté sobreescribiendo los headers
4. Revisar logs del servidor para errores

### Problema: El archivo no se encuentra

1. Verificar que `converxa-chat.min.js` existe en `uploads/scripts/`
2. Verificar permisos del directorio
3. Revisar configuración del ServeStaticModule

### Problema: Headers no aparecen

1. Verificar que la configuración `setHeaders` esté aplicándose
2. Revisar que no hay middleware intermedio modificando headers
3. Verificar configuración de nginx si existe
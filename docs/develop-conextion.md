ip: 137.184.227.234
rama: develop-v1
para conectar puedes usar
ssh -i ~/.ssh/digitalOcean root@137.184.227.234
para comprender como est la estructura del proyecto en el servidor puedes verificar el workflow, y puedes ver el script dentro de terraform para configuraciones mas avanzadas.
recuerda, el codigo lo puedes ver en local, pero los cambios debes de verlos en el servidor

## Reporte de Debugging - Docker no actualiza cambios

### PROBLEMA PERSISTENTE IDENTIFICADO ⚠️

**Situación actual**: El workflow de GitHub Actions deployea correctamente pero NO hace switch automático a producción.

### Análisis del problema
1. **Workflow deployea correctamente**: El commit más reciente (93c360c) se construye y deploya a BLUE
2. **Producción sigue en GREEN**: Pero producción apunta a GREEN que tiene commit anterior o problemas de salud
3. **Falta switch automático**: El workflow no incluye el paso de cambiar tráfico a producción

### Solución manual funcionando ✅
La solución de `git reset --hard HEAD` + build manual + switch SÍ funciona cuando se ejecuta manualmente.

### CAUSA RAÍZ DEL WORKFLOW:
1. **Deploy exitoso pero sin switch**: El workflow deploy a BLUE pero no cambia producción
2. **GREEN queda "NO SALUDABLE"**: Contenedor GREEN antiguo sin health check correcto
3. **Logs insuficientes**: Faltaban logs para diagnosticar commits en contenedores

### Solución implementada en workflow ✅
1. **Logs detallados**: Agregados logs de commits antes/después del deploy
2. **Verificación de salud**: Health checks mejorados con curl en lugar de wget
3. **Commit tracking**: Se muestra commit en repositorio vs commit en contenedores
4. **Deploy mejorado**: El script ahora deployea siempre a BLUE y actualiza estado correctamente

### Comandos de verificación
```bash
# Ver estado actual
/opt/sofia-chat/scripts/blue-green-control.sh status

# Ver commits en contenedores
docker exec sofia-chat-backend-blue cat /app/.git/refs/heads/develop-v1 | cut -c1-7
docker exec sofia-chat-backend-green cat /app/.git/refs/heads/develop-v1 | cut -c1-7

# Ver commit en repositorio
cd /root/repos/sofia-chat-backend-v2 && git rev-parse --short HEAD

# Hacer switch manual si es necesario
/opt/sofia-chat/scripts/blue-green-control.sh switch
```

### URLs de verificación
- **BLUE**: http://dev-sofia-chat.sofiacall.com:3001/api/health
- **GREEN**: http://dev-sofia-chat.sofiacall.com:3002/api/health  
- **Producción**: https://dev-sofia-chat.sofiacall.com/api/health
- **Pruebas internas**: https://internal-dev-sofia-chat.sofiacall.com/api/health

### PENDIENTE DE VERIFICAR:
- ✅ Workflow con logs mejorados
- ⏳ Verificar que el próximo deploy funcione automáticamente
- ⏳ Confirmar que switch automático funcione tras deploy exitoso

**Nota**: La solución técnica está implementada, pero necesita verificación en el próximo deployment automático.

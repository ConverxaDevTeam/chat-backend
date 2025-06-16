ip: 137.184.227.234
rama: develop-v1
para conectar puedes usar
ssh -i ~/.ssh/digitalOcean root@137.184.227.234
para comprender como est la estructura del proyecto en el servidor puedes verificar el workflow, y puedes ver el script dentro de terraform para configuraciones mas avanzadas.
recuerda, el codigo lo puedes ver en local, pero los cambios debes de verlos en el servidor

## Reporte de Debugging - Docker no actualiza cambios

### Problema identificado
- **Síntoma**: Docker containers no reflejan últimos commits en producción
- **Commit esperado**: 1b9ffff (local develop-v1)
- **Commit en contenedor**: c29a4e2 (commit anterior)

### Investigación realizada
1. **Verificación estado servidor**: /root/repos/sofia-chat-backend-v2 SÍ tiene último commit (1b9ffff)
2. **Verificación contenedor**: `docker exec sofia-chat-backend-green cat /app/.git/refs/heads/develop-v1` muestra c29a4e2
3. **Problema confirmado**: Docker build NO está tomando los archivos actualizados del directorio host

### Intentos de solución
1. **Stash y pull**: Resolvió conflictos en servidor, código actualizado en /root/repos/
2. **Limpieza completa Docker**: Eliminamos todas las imágenes y containers con `docker system prune -f`
3. **Build forzado con --no-cache**: Aún así el contenedor sigue con commit viejo
4. **Scripts actualizados**: Copiamos scripts blue-green actualizados a /opt/sofia-chat/scripts/

### PROBLEMA RESUELTO ✅

**Causa raíz identificada**: `git pull` actualizó HEAD pero NO los archivos de trabajo

**Solución aplicada**:
1. `git reset --hard HEAD` para sincronizar archivos de trabajo
2. Build manual con --no-cache 
3. Switch a contenedor GREEN con commit correcto
4. Producción ahora en commit 1b9ffff ✅

**Verificación final**:
- **Contenedor GREEN**: commit 1b9ffff ✅
- **Producción**: https://dev-sofia-chat.sofiacall.com/api/health muestra deployment: "green" ✅
- **Cambios aplicados**: Los últimos commits están activos en producción ✅

**Lección aprendida**: 
Siempre verificar que `git pull` sincronice archivos de trabajo, no solo HEAD. Usar `git reset --hard HEAD` cuando sea necesario.

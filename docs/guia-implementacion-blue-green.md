# Guía de Implementación Blue-Green Deployment

## Descripción General

Esta guía te llevará paso a paso para implementar Blue-Green deployment en el servidor de Converxa Chat Backend. El proceso está diseñado para ser seguro y reversible.

## Prerrequisitos

### 1. Acceso al Servidor
- IP del servidor: `137.184.44.230`
- Usuario SSH: `root`
- Clave SSH: `~/.ssh/digitalOcean`

### 2. Verificar Conexión
```bash
ssh -i ~/.ssh/digitalOcean root@137.184.44.230
```

### 3. Estado Actual del Servidor
El servidor actualmente tiene:
- Nginx corriendo en puerto 80/443
- Backend en contenedor `converxa-chat-backend-v2` (puerto 3001)
- PostgreSQL con pgvector
- Certificados SSL de Let's Encrypt para `back-chat.converxa.net`

## Fase 1: Preparación del Servidor

### Paso 1.1: Conectar al Servidor
```bash
ssh -i ~/.ssh/digitalOcean root@137.184.44.230
```

### Paso 1.2: Verificar Estado Actual
```bash
# Ver contenedores actuales
docker ps

# Ver configuración de Nginx
cat /etc/nginx/sites-enabled/backend.conf

# Ver estado de servicios
systemctl status nginx
systemctl status docker
```

### Paso 1.3: Crear Backup de Seguridad
```bash
# Backup de configuración actual
mkdir -p /root/backups/$(date +%Y%m%d)
cp -r /etc/nginx/sites-available /root/backups/$(date +%Y%m%d)/
cp -r /etc/nginx/sites-enabled /root/backups/$(date +%Y%m%d)/

# Backup de la aplicación actual
cd /root/repos/converxa-chat-backend-v2
git stash
git checkout develop
git pull origin develop

# Backup de base de datos
docker exec converxa-chat-backend-v2 pg_dump -U postgres converxa_chat > /root/backups/$(date +%Y%m%d)/converxa_chat_backup.sql
```

## Fase 2: Instalación de Blue-Green

### Paso 2.1: Copiar Scripts al Servidor
Desde tu máquina local:
```bash
# Subir scripts de Blue-Green
scp -i ~/.ssh/digitalOcean -r scripts/blue-green/ root@137.184.44.230:/tmp/

# Subir docker-compose actualizado
scp -i ~/.ssh/digitalOcean docker-compose.blue-green.yml root@137.184.44.230:/root/repos/converxa-chat-backend-v2/
```

### Paso 2.2: Ejecutar Instalación
En el servidor:
```bash
# Hacer scripts ejecutables
chmod +x /tmp/blue-green/*.sh

# Ejecutar instalación
/tmp/blue-green/install-blue-green.sh
```

### Paso 2.3: Verificar Instalación
```bash
# Verificar que los scripts están instalados
ls -la /opt/converxa-chat/scripts/

# Verificar aliases (recargar bash primero)
source /root/.bashrc

# Probar comando de estado
bg-status
```

## Fase 3: Configuración DNS y SSL

### Paso 3.1: Configurar DNS
En tu proveedor DNS (DigitalOcean, Cloudflare, etc.):
1. Crear registro A para `internal-back-chat.converxa.net`
2. Apuntar a la misma IP: `137.184.44.230`

### Paso 3.2: Obtener Certificado SSL
En el servidor:
```bash
# Obtener certificado para dominio de pruebas internas
certbot --nginx -d internal-back-chat.converxa.net --non-interactive --agree-tos --email admin@converxa.net

# Verificar certificados
certbot certificates
```

### Paso 3.3: Actualizar Configuración de Nginx
```bash
# El script de instalación ya creó la configuración básica
# Actualizar para usar el certificado correcto
/opt/converxa-chat/scripts/update-internal-config.sh blue

# Verificar configuración
nginx -t
systemctl reload nginx
```

## Fase 4: Migración del Contenedor Actual

### Paso 4.1: Preparar Nuevo Docker Compose
```bash
cd /root/repos/converxa-chat-backend-v2

# Backup del docker-compose actual
cp docker-compose.yml docker-compose.yml.backup

# Usar el nuevo docker-compose para Blue-Green
cp docker-compose.blue-green.yml docker-compose.yml
```

### Paso 4.2: Migrar Contenedor Actual a Blue
```bash
# Detener contenedor actual
docker-compose down

# Renombrar contenedor existente para que sea "blue"
# Editar docker-compose.yml para que el servicio principal se llame converxa-chat-backend-blue

# Levantar como Blue
docker-compose up -d converxa-chat-backend-blue

# Verificar que funciona
curl http://localhost:3002/health
```

### Paso 4.3: Actualizar Configuración de Producción
```bash
# Actualizar Nginx para apuntar explícitamente a blue
/opt/converxa-chat/scripts/update-prod-config.sh blue

# Establecer estado inicial
echo "blue" > /opt/.blue-green-state

# Verificar estado
bg-status
```

## Fase 5: Primer Deployment de Prueba

### Paso 5.1: Hacer Pequeño Cambio de Prueba
En tu código local, hacer un cambio menor (ej: agregar log o modificar endpoint /health):
```typescript
// En src/app.controller.ts o similar
@Get('health')
getHealth() {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    deployment: 'blue-green-test' // Agregar esta línea
  };
}
```

### Paso 5.2: Commit y Push
```bash
git add .
git commit -m "Add blue-green deployment test marker"
git push origin develop
```

### Paso 5.3: Deployment Manual de Prueba
En el servidor:
```bash
# Pull de cambios
cd /root/repos/converxa-chat-backend-v2
git pull origin develop

# Desplegar a Green (slot inactivo)
bg-deploy

# Verificar deployment
bg-status
```

### Paso 5.4: Probar Entorno Green
```bash
# Probar endpoint en Green
curl http://localhost:3003/health

# Probar vía dominio interno
curl https://internal-back-chat.converxa.net/health
```

## Fase 6: Primer Switch de Tráfico

### Paso 6.1: Verificar Salud de Green
```bash
# Health check completo
bg-health green

# Si todo está OK, proceder con switch
```

### Paso 6.2: Cambiar Tráfico a Green
```bash
# IMPORTANTE: Esto cambia producción
bg-switch

# Verificar que producción ahora apunta a Green
curl https://back-chat.converxa.net/health
```

### Paso 6.3: Monitorear Post-Switch
```bash
# Monitorear por unos minutos
bg-health monitor

# Ver logs en tiempo real
bg-logs
```

### Paso 6.4: Rollback de Prueba (Opcional)
```bash
# Para probar que el rollback funciona
bg-rollback

# Verificar que volvió a Blue
bg-status
curl https://dev-converxa-chat.converxa.com/health
```

## Fase 7: Configuración de CI/CD

### Paso 7.1: Actualizar GitHub Actions
El workflow `blue-green-deploy.yml` ya está creado. Solo necesitas:

1. Verificar que los secrets de GitHub estén configurados
2. Habilitar el nuevo workflow
3. Deshabilitar el workflow antiguo

### Paso 7.2: Probar CI/CD
1. Hacer un cambio menor en develop
2. Push al repositorio
3. Verificar que GitHub Actions ejecuta el nuevo workflow
4. Confirmar que deployment se realiza al slot inactivo

## Fase 8: Operaciones Diarias

### Comandos Útiles
```bash
# Ver estado actual
bg-status

# Hacer deployment
bg-deploy

# Cambiar tráfico
bg-switch

# Rollback en emergencia
bg-rollback

# Limpiar slot inactivo
bg-cleanup

# Ver logs
bg-logs
```

### Usando Makefile (desde local)
```bash
# Ver estado
make status

# Hacer deployment
make deploy

# Cambiar tráfico (con confirmación)
make switch

# Rollback (con confirmación)
make rollback
```

## Verificaciones de Seguridad

### Checklist Pre-Switch
- [ ] Green container está healthy
- [ ] Base de datos funciona correctamente
- [ ] Health checks pasan
- [ ] Logs no muestran errores críticos
- [ ] Internal testing domain funciona

### Checklist Post-Switch
- [ ] Producción responde correctamente
- [ ] Performance es aceptable
- [ ] No hay errores en logs
- [ ] Funcionalidades críticas funcionan

## Procedimientos de Emergencia

### Si Green Falla Después del Switch
```bash
# Rollback inmediato
bg-rollback

# Verificar que Blue está funcionando
bg-health blue

# Investigar logs de Green
docker logs converxa-chat-backend-green
```

### Si Necesitas Forzar Blue como Producción
```bash
# Procedimiento de emergencia
echo "blue" > /opt/.blue-green-state
/opt/converxa-chat/scripts/update-prod-config.sh blue
systemctl reload nginx
```

### Si Ambos Contenedores Fallan
```bash
# Usar backup tradicional
docker-compose -f docker-compose.yml.backup up -d

# Restaurar configuración de Nginx
cp /root/backups/$(date +%Y%m%d)/sites-available/backend.conf /etc/nginx/sites-available/
systemctl reload nginx
```

## Monitoreo Continuo

### Logs a Monitorear
- `/var/log/converxa-chat/blue-green/health-check.log`
- `/var/log/converxa-chat/blue/*.log`
- `/var/log/converxa-chat/green/*.log`
- `/var/log/nginx/access.log`
- `/var/log/nginx/error.log`

### Métricas Importantes
- Tiempo de respuesta de health checks
- Uso de memoria de contenedores
- Uso de CPU
- Conectividad de base de datos

## Troubleshooting

### Contenedor No Levanta
```bash
# Ver logs del contenedor
docker logs converxa-chat-backend-green

# Verificar configuración
docker inspect converxa-chat-backend-green

# Verificar recursos
docker stats
```

### Nginx No Recargar
```bash
# Verificar configuración
nginx -t

# Ver logs de Nginx
tail -f /var/log/nginx/error.log

# Reiniciar si es necesario
systemctl restart nginx
```

### Base de Datos No Conecta
```bash
# Verificar PostgreSQL
docker ps | grep postgres
docker logs converxa-chat-postgres

# Probar conexión
docker exec converxa-chat-backend-blue psql -h localhost -U postgres -d converxa_chat -c "SELECT 1;"
```

## Mantenimiento

### Limpieza Semanal
```bash
# Limpiar imágenes no utilizadas
docker image prune -f

# Limpiar contenedores detenidos
docker container prune -f

# Limpiar logs antiguos
find /var/log/converxa-chat -name "*.log" -mtime +30 -delete
```

### Backup Regular
```bash
# Backup de base de datos (automático vía cron)
docker exec converxa-chat-postgres pg_dump -U postgres converxa_chat > /root/backups/converxa_chat_$(date +%Y%m%d).sql

# Backup de configuraciones
tar -czf /root/backups/nginx_config_$(date +%Y%m%d).tar.gz /etc/nginx/sites-available /etc/nginx/sites-enabled
```

## Próximos Pasos

1. **Implementar**: Seguir esta guía paso a paso
2. **Probar**: Realizar varios deployments de prueba
3. **Documentar**: Anotar cualquier issue específico de tu entorno
4. **Automatizar**: Configurar alertas y monitoreo adicional
5. **Entrenar**: Asegurar que el equipo conoce los procedimientos

## Contacto y Soporte

Para dudas o problemas durante la implementación:
- Revisar logs detallados en `/var/log/converxa-chat/`
- Usar `bg-status` para diagnóstico rápido
- En emergencia, usar procedimientos de rollback

¡Blue-Green deployment implementado exitosamente! 🎉
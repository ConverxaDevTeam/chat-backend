# Flujo Blue-Green Deployment

## Descripción General

Sistema de despliegue Blue-Green que permite desplegar nuevas versiones del backend sin tiempo de inactividad, con capacidad de pruebas internas y rollback inmediato.

## Componentes Involucrados

### Infraestructura
- **Nginx**: Proxy reverso con configuración de upstreams dinámicos
- **Docker Containers**: backend_blue (puerto 3001) y backend_green (puerto 3002)
- **PostgreSQL**: Base de datos compartida entre ambos entornos
- **GitHub Actions**: Automatización de build y deploy

### Dominios
- **Producción**: `dev-sofia-chat.sofiacall.com` → Apunta al entorno activo
- **Pruebas Internas**: `internal-dev-sofia-chat.sofiacall.com` → Apunta al entorno inactivo

### Scripts de Control
- **`blue-green-control.sh`**: Script maestro para gestionar el ciclo
- **`deploy-to-slot.sh`**: Deploy automático al slot inactivo
- **`switch-traffic.sh`**: Cambio de tráfico entre entornos
- **`health-check.sh`**: Verificación de salud de contenedores

## Flujo de Despliegue

```mermaid
graph TD
    A[GitHub Push] --> B[GitHub Actions Workflow]
    B --> C[Copy Scripts via SCP]
    C --> D[Update Repository + git reset --hard]
    D --> E[Detect Production Slot via Nginx]
    E --> F{Blue in Production?}
    F -->|Yes| G[Deploy to Green - Testing Slot]
    F -->|No| H[Deploy to Blue - Testing Slot]
    G --> I[Update Internal URL to Green]
    H --> J[Update Internal URL to Blue]
    I --> K[Manual Testing on Internal URL]
    J --> K
    K --> L{Tests Pass?}
    L -->|Yes| M[Manual: blue-green-control.sh switch]
    L -->|No| N[Manual: blue-green-control.sh cleanup]
    M --> O[Switch Production Traffic]
    O --> P[Update .blue-green-state]
    P --> Q[Health Check Production]
    Q --> R{Healthy?}
    R -->|Yes| S[Manual: blue-green-control.sh cleanup]
    R -->|No| T[Manual: blue-green-control.sh rollback]
    N --> U[Remove Failed Container]
    S --> V[Remove Old Container - Complete]
    T --> W[Revert to Previous State]
```

## Estados del Sistema

### Estado Inicial
- **Blue**: Activo en producción (puerto 3001)
- **Green**: Inactivo
- **Nginx Prod**: → backend_blue
- **Nginx Internal**: → backend_blue

### Después del Deploy (Workflow automático)
- **Blue**: Activo en producción (puerto 3001)
- **Green**: Nuevo código en pruebas (puerto 3002)
- **Nginx Prod**: → localhost:3001 (blue)
- **Nginx Internal**: → localhost:3002 (green)
- **Estado**: Permanece en "blue" (NO cambia automáticamente)

### Después del Switch (Manual)
- **Blue**: Código anterior en standby (puerto 3001)
- **Green**: Activo en producción (puerto 3002)
- **Nginx Prod**: → localhost:3002 (green)
- **Nginx Internal**: → localhost:3002 (green)
- **Estado**: Cambia a "green" (actualizado por switch)

### Después del Cleanup (Manual)
- **Blue**: ELIMINADO
- **Green**: Único contenedor activo en producción (puerto 3002)
- **Nginx Prod**: → localhost:3002 (green)
- **Nginx Internal**: → localhost:3002 (green)
- **Estado**: Sigue en "green"

## Comandos de Control

### Detectar Estado Actual
```bash
./blue-green-control.sh status
```

### Deploy Automático (vía Workflow)
```bash
# Automático en GitHub Actions - NO manual
# Deploya a slot inactivo sin cambiar producción
```

### Cambiar Tráfico a Nuevo Deploy
```bash
/opt/sofia-chat/scripts/blue-green-control.sh switch
```

### Rollback al Estado Anterior
```bash
/opt/sofia-chat/scripts/blue-green-control.sh rollback
```

### Limpiar Contenedor de Pruebas (Inactivo)
```bash
/opt/sofia-chat/scripts/blue-green-control.sh cleanup
```

## Configuración Nginx

### Upstreams Dinámicos
```nginx
upstream backend_prod {
    server 127.0.0.1:3001;  # Cambia dinámicamente
}

upstream backend_internal {
    server 127.0.0.1:3002;  # Cambia dinámicamente
}
```

### Configuración de Dominios
- Producción usa `backend_prod` upstream
- Pruebas internas usa `backend_internal` upstream
- Scripts modifican archivos de configuración y recargan Nginx

## Sincronización de Scripts

### Problema de Inconsistencia de Estado
Si hay inconsistencia entre scripts que reportan estados diferentes:

```bash
# Verificar que ambos scripts usen la misma ruta
grep "STATE_FILE=" /opt/sofia-chat/blue-green-simple.sh
grep "STATE_FILE=" /opt/sofia-chat/scripts/blue-green-control.sh

# Ambos deben mostrar: STATE_FILE="/opt/.blue-green-state"
```

### Solución: Sincronización Manual
```bash
# Copiar scripts actualizados desde el repositorio
scp -i ~/.ssh/digitalOcean scripts/blue-green/*.sh root@IP:/opt/sofia-chat/scripts/
scp -i ~/.ssh/digitalOcean scripts/blue-green/blue-green-simple.sh root@IP:/opt/sofia-chat/

# Hacer ejecutables
ssh -i ~/.ssh/digitalOcean root@IP "chmod +x /opt/sofia-chat/scripts/*.sh /opt/sofia-chat/blue-green-simple.sh"

# Verificar sincronización
ssh -i ~/.ssh/digitalOcean root@IP "/opt/sofia-chat/blue-green-simple.sh status"
ssh -i ~/.ssh/digitalOcean root@IP "PROJECT_DIR=/root/repos/sofia-chat-backend-v2 /opt/sofia-chat/scripts/blue-green-control.sh status"
```

## Consideraciones de Seguridad

### Base de Datos Compartida
- Migraciones deben ser backward-compatible
- Validar esquema antes del switch
- Rollback de DB si es necesario

### Certificados SSL
- Ambos dominios deben tener certificados válidos
- Renovación automática configurada

### Monitoreo
- Health checks continuos en ambos entornos
- Logs separados por color (blue/green)
- Métricas de rendimiento comparativas

## Flujo de Rollback

```mermaid
graph TD
    A[Detectar Problema] --> B[health-check.sh]
    B --> C[Revert Nginx Config]
    C --> D[Reload Nginx]
    D --> E[Stop Failed Container]
    E --> F[Verify Old Version]
    F --> G[Notify Team]
```

## Integración con CI/CD

### GitHub Actions
1. **Copy Scripts**: Transferir scripts actualizados via SCP
2. **Update Repository**: git pull + git reset --hard HEAD
3. **Build Stage**: Crear imagen Docker con --no-cache
4. **Deploy Stage**: Ejecutar blue-green-control.sh deploy al slot inactivo
5. **Update Internal**: Configurar Nginx internal para apuntar al nuevo slot
6. **Notification**: Notificar deploy completado, listo para pruebas en internal URL
7. **No Auto-Switch**: Estado de producción NO cambia automáticamente

### Variables de Entorno
- `BLUE_GREEN_ACTIVE`: blue|green
- `DOCKER_IMAGE_TAG`: Tag de la imagen a desplegar
- `INTERNAL_DOMAIN`: Dominio para pruebas internas

## Monitoreo y Alertas

### Health Endpoints
- `/health` en ambos contenedores
- Verificación cada 30 segundos
- Alertas automáticas si algún contenedor falla

### Logs
- Logs separados por color en `/var/log/sofia-chat/`
- Rotación automática de logs
- Integración con sistema de monitoreo

## Problema Resuelto: Health Check Docker

### Síntoma Original
- Docker marca contenedores como "unhealthy" en producción
- GitHub Actions no detectan contenedores saludables
- En local funciona correctamente
- El servicio está funcionando pero Docker no lo detecta

### Causa Raíz Identificada
1. **curl no disponible**: El contenedor Docker no tiene `curl` instalado
2. **Endpoint incorrecto**: Scripts usaban `/health` en lugar de `/api/health`
3. **localhost vs 127.0.0.1**: Usar 127.0.0.1 es más confiable en producción

### Solución Implementada

#### Docker Compose Health Check
```yaml
healthcheck:
  test: ['CMD', 'wget', '--quiet', '--spider', 'http://127.0.0.1:3001/api/health']
  interval: 10s
  timeout: 10s
  retries: 4
  start_period: 5s
```

#### Scripts de Blue-Green Corregidos
- `blue-green-control.sh`: Función `check_container_health()` corregida
- `health-check.sh`: Función `check_http_endpoint()` corregida  
- `install-blue-green.sh`: Verificaciones de health corregidas

### Debugging Realizado
```bash
# 1. Verificar que curl no existe en contenedor
docker exec sofia-chat-backend-blue curl --version
# Error: curl: executable file not found

# 2. Verificar que wget sí existe y funciona
docker exec sofia-chat-backend-blue wget -q -O - http://127.0.0.1:3001/api/health
# Resultado exitoso:
# {"status":"ok","timestamp":"2025-06-11T00:03:12.130Z","uptime":9760.174,...}

# 3. Probar health check corregido
docker exec sofia-chat-backend-blue wget --quiet --spider http://127.0.0.1:3001/api/health
# Retorna código 0 (success)

# 4. Verificar estado con script corregido
/opt/sofia-chat/scripts/blue-green-control.sh status
# Resultado: "BLUE (puerto 3001): CORRIENDO y SALUDABLE"
```

### Cambios Aplicados
1. **docker-compose.yml**: Reemplazar `curl -f` por `wget --quiet --spider`
2. **Scripts**: Corregir todos los usos de `curl` a `wget`
3. **Endpoints**: Cambiar `/health` a `/api/health` en todos los scripts
4. **IP**: Usar `127.0.0.1` en lugar de `localhost`
5. **Configuración aplicada en ambos entornos** (blue/green)

### Verificación Post-Fix
```bash
# Estado de contenedores
docker ps
# CONTAINER STATUS: Up X hours (healthy)

# Estado desde scripts
/opt/sofia-chat/scripts/blue-green-control.sh status
# BLUE (puerto 3001): CORRIENDO y SALUDABLE

# Health check detallado
/opt/sofia-chat/scripts/health-check.sh check blue
# ✅ Docker health check OK
# ✅ HTTP health endpoint OK
# ✅ Aplicación responde correctamente
```

### Endpoint de Health
- **Ruta**: `/api/health`
- **Prefijo global**: `api` (configurado en main.ts)
- **Respuesta**: 
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.45,
    "memory": {...},
    "deployment": "blue|green"
  }
  ```

## Gestión del Archivo de Estado `.blue-green-state`

### Ubicación y Control
El archivo `.blue-green-state` controla qué slot está activo y determina a cuál slot deployar next.

#### Ubicación del Archivo
- **Ubicación única**: `/opt/.blue-green-state`
- **NO está en repositorio git**: Independiente del código fuente
- **NO afectado por git operations**: `git reset --hard HEAD` no lo modifica

### Transferencia de Scripts
```yaml
# En .github/workflows/deploy-dev-blue-green.yml
- name: Copy updated blue-green scripts to server
  uses: appleboy/scp-action@master
  with:
    source: 'scripts/blue-green/*'          # Solo scripts, NO archivo de estado
    target: '/opt/sofia-chat/scripts/'
    strip_components: 2

# IMPORTANTE: También copiar blue-green-simple.sh al directorio raíz
- name: Copy blue-green-simple.sh to root directory
  uses: appleboy/scp-action@master
  with:
    source: 'scripts/blue-green/blue-green-simple.sh'
    target: '/opt/sofia-chat/'
    strip_components: 2
```

**IMPORTANTE**: 
- El workflow NO copia el archivo `.blue-green-state` via TAR/SCP
- Se debe copiar `blue-green-simple.sh` tanto a `/opt/sofia-chat/scripts/` como a `/opt/sofia-chat/` para mantener compatibilidad
- Ambos scripts deben usar la misma ruta de estado: `/opt/.blue-green-state`

#### Configuración del Workflow
```bash
# El workflow ejecuta con PROJECT_DIR específico
PROJECT_DIR=/root/repos/sofia-chat-backend-v2 /opt/sofia-chat/scripts/blue-green-control.sh deploy
```

Todos los scripts usan la ubicación fija: `/opt/.blue-green-state`

### Problema de Desincronización Resuelto

#### Síntoma
```bash
# Estado en archivo único
cat /opt/.blue-green-state  # → green

# Pero producción real
curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment'  # → blue
```

#### Causa
El archivo de estado se desincroniza de la realidad cuando:
1. Se hacen cambios manuales de producción
2. El workflow falla después de actualizar el estado
3. Se hace rollback sin actualizar el archivo

#### Solución
```bash
# 1. Verificar qué está realmente en producción
PROD_STATE=$(curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment')

# 2. Sincronizar archivo de estado
echo "$PROD_STATE" > /opt/.blue-green-state

# 3. Verificar sincronización
echo "Estado en archivo: $(cat /opt/.blue-green-state)"
echo "Estado en producción: $PROD_STATE"
```

#### Diagnóstico de Estado
```bash
# Verificar estado único
echo "=== VERIFICACIÓN COMPLETA DE ESTADO ==="
echo "Archivo estado: $(cat /opt/.blue-green-state 2>/dev/null)" 
echo "Producción real: $(curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment')"
echo "Nginx config: $(grep -o 'localhost:[0-9]*' /etc/nginx/sites-available/backend.conf | head -1)"
```

### Mantenimiento del Estado

#### Después de Switch Manual
```bash
# El archivo se actualiza automáticamente en el switch
# switch ejecuta: set_current_state("$new_state")
# cleanup verifica producción real via Nginx, no via archivo estado
```

#### Verificación Preventiva
Agregar al final del workflow para detectar desincronización:
```bash
STATE=$(cat /opt/.blue-green-state)
PROD_STATE=$(curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment')
if [[ "$STATE" != "$PROD_STATE" ]]; then
    echo "⚠️  ADVERTENCIA: Estado desincronizado"
    echo "Archivo: $STATE | Producción: $PROD_STATE"
fi
```

## Recuperación ante Desastres

### Escenarios de Falla
1. **Falla del nuevo deploy**: Descartar y mantener producción
2. **Falla después del switch**: Rollback inmediato
3. **Falla de base de datos**: Rollback con restauración de DB
4. **Falla de infraestructura**: Procedimiento de recuperación completa
5. **Health Check Fallido**: Verificar conectividad de red en el servidor
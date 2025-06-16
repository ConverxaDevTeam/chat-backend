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
    A[GitHub Push] --> B[GitHub Actions]
    B --> C[Build Docker Image]
    C --> D[Detect Active Slot]
    D --> E{Blue Active?}
    E -->|Yes| F[Deploy to Green]
    E -->|No| G[Deploy to Blue]
    F --> H[Update Internal URL]
    G --> H
    H --> I[Internal Testing]
    I --> J{Tests Pass?}
    J -->|Yes| K[Manual Switch]
    J -->|No| L[Discard Deploy]
    K --> M[Production Traffic Switch]
    M --> N[Health Check]
    N --> O{Healthy?}
    O -->|Yes| P[Confirm & Cleanup]
    O -->|No| Q[Rollback]
    L --> R[Stop Container]
    Q --> S[Revert Traffic]
```

## Estados del Sistema

### Estado Inicial
- **Blue**: Activo en producción (puerto 3001)
- **Green**: Inactivo
- **Nginx Prod**: → backend_blue
- **Nginx Internal**: → backend_blue

### Después del Deploy
- **Blue**: Activo en producción (puerto 3001)
- **Green**: Nuevo código en pruebas (puerto 3002)
- **Nginx Prod**: → backend_blue
- **Nginx Internal**: → backend_green

### Después del Switch
- **Blue**: Código anterior (puerto 3001)
- **Green**: Activo en producción (puerto 3002)
- **Nginx Prod**: → backend_green
- **Nginx Internal**: → backend_green

## Comandos de Control

### Detectar Estado Actual
```bash
./blue-green-control.sh status
```

### Deploy Automático
```bash
./blue-green-control.sh deploy [commit-hash]
```

### Cambiar Tráfico
```bash
./blue-green-control.sh switch
```

### Rollback
```bash
./blue-green-control.sh rollback
```

### Limpiar Entorno Inactivo
```bash
./blue-green-control.sh cleanup
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
1. **Build Stage**: Crear imagen Docker con tag único
2. **Deploy Stage**: Usar `deploy-to-slot.sh` para desplegar al slot inactivo
3. **Notification**: Notificar que el deploy está listo para pruebas
4. **No Auto-Switch**: Requiere intervención manual para el switch

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

#### Ubicaciones del Archivo
- **Local (desarrollo)**: `sofia-chat-backend-v2/.blue-green-state` (solo código, no usado por workflow)
- **Servidor (usado por workflow)**: `/root/repos/sofia-chat-backend-v2/.blue-green-state`
- **Scripts (ubicación por defecto)**: `/opt/sofia-chat/.blue-green-state`

#### Transferencia de Scripts
```yaml
# En .github/workflows/deploy-dev-blue-green.yml
- name: Copy updated blue-green scripts to server
  uses: appleboy/scp-action@master
  with:
    source: 'scripts/blue-green/*'          # Solo scripts, NO archivo de estado
    target: '/opt/sofia-chat/scripts/'
    strip_components: 2
```

**IMPORTANTE**: El workflow NO copia el archivo `.blue-green-state` via TAR/SCP.

#### Configuración del Workflow
```bash
# El workflow ejecuta con PROJECT_DIR específico
PROJECT_DIR=/root/repos/sofia-chat-backend-v2 /opt/sofia-chat/scripts/blue-green-control.sh deploy
```

Esto hace que el script use: `/root/repos/sofia-chat-backend-v2/.blue-green-state`

### Problema de Desincronización Resuelto

#### Síntoma
```bash
# Estado en archivo del workflow
cat /root/repos/sofia-chat-backend-v2/.blue-green-state  # → green

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
echo "$PROD_STATE" > /root/repos/sofia-chat-backend-v2/.blue-green-state

# 3. Verificar sincronización
echo "Estado en archivo: $(cat /root/repos/sofia-chat-backend-v2/.blue-green-state)"
echo "Estado en producción: $PROD_STATE"
```

#### Diagnóstico de Estado
```bash
# Verificar todas las ubicaciones
echo "=== VERIFICACIÓN COMPLETA DE ESTADO ==="
echo "Archivo workflow: $(cat /root/repos/sofia-chat-backend-v2/.blue-green-state 2>/dev/null)"
echo "Archivo scripts: $(cat /opt/sofia-chat/.blue-green-state 2>/dev/null)" 
echo "Producción real: $(curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment')"
echo "Nginx config: $(grep -o 'localhost:[0-9]*' /etc/nginx/sites-available/backend.conf | head -1)"
```

### Mantenimiento del Estado

#### Después de Switch Manual
```bash
# Si haces switch manual, actualizar el archivo usado por workflow
NEW_STATE=$(curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment')
echo "$NEW_STATE" > /root/repos/sofia-chat-backend-v2/.blue-green-state
```

#### Verificación Preventiva
Agregar al final del workflow para detectar desincronización:
```bash
WORKFLOW_STATE=$(cat /root/repos/sofia-chat-backend-v2/.blue-green-state)
PROD_STATE=$(curl -s https://dev-sofia-chat.sofiacall.com/api/health | jq -r '.deployment')
if [[ "$WORKFLOW_STATE" != "$PROD_STATE" ]]; then
    echo "⚠️  ADVERTENCIA: Estado desincronizado"
    echo "Archivo: $WORKFLOW_STATE | Producción: $PROD_STATE"
fi
```

## Recuperación ante Desastres

### Escenarios de Falla
1. **Falla del nuevo deploy**: Descartar y mantener producción
2. **Falla después del switch**: Rollback inmediato
3. **Falla de base de datos**: Rollback con restauración de DB
4. **Falla de infraestructura**: Procedimiento de recuperación completa
5. **Health Check Fallido**: Verificar conectividad de red en el servidor
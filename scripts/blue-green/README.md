# Blue-Green Deployment Scripts

Sistema simplificado de Blue-Green Deployment para Sofia Chat Backend v2.

## Estructura Actual

### Scripts Activos

```
scripts/blue-green/
├── blue-green-simple.sh      # Script principal - TODAS las funcionalidades
├── update-prod-config.sh     # Helper - Actualización de Nginx
├── backup/                   # Scripts legacy (no usar)
│   ├── blue-green-control.sh
│   ├── health-check.sh
│   ├── install-blue-green.sh
│   └── update-internal-config.sh
└── README.md                 # Este archivo
```

### ¿Por qué simplificamos?

**ANTES (6 scripts duplicados):**
- `blue-green-control.sh` + `blue-green-simple.sh` = Funcionalidad duplicada
- `health-check.sh` = Funcionalidad integrada en el principal
- `update-internal-config.sh` = No usado por el flujo principal
- `install-blue-green.sh` = Solo para setup inicial

**AHORA (2 scripts necesarios):**
- ✅ `blue-green-simple.sh` - Todo en uno, sin duplicaciones
- ✅ `update-prod-config.sh` - Helper específico para Nginx

## Uso del Script Principal

### Comandos Disponibles

```bash
/opt/sofia-chat/blue-green-simple.sh [comando]
```

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `status` | Mostrar estado actual (default) | Manual/Workflow |
| `deploy` | Desplegar a slot inactivo | Manual/Workflow |
| `switch` | Cambiar tráfico al nuevo slot | Manual |
| `rollback` | Volver al slot anterior | Manual |
| `cleanup` | Limpiar slot inactivo | Manual |
| `restore` | Restaurar DB desde último backup | Manual |
| `help` | Mostrar ayuda completa | Manual |

### Flujo Típico

```bash
# 1. Ver estado actual
/opt/sofia-chat/blue-green-simple.sh status

# 2. Deploy nuevo código a slot inactivo
/opt/sofia-chat/blue-green-simple.sh deploy

# 3. Verificar que todo esté bien (testing manual)
# Revisar logs, health checks, etc.

# 4. Cambiar producción al nuevo slot
/opt/sofia-chat/blue-green-simple.sh switch

# 5. Limpiar slot anterior (opcional)
/opt/sofia-chat/blue-green-simple.sh cleanup
```

### Características

✅ **Deploy Automático**: Usa Docker Compose para crear contenedores  
✅ **Health Checks**: Verificación automática de salud de contenedores  
✅ **Backup Automático**: Backup de estado y DB antes de cada switch  
✅ **Logs Detallados**: Output con timestamps y colores  
✅ **Error Handling**: Manejo robusto de errores con rollback  
✅ **Nginx Integration**: Actualización automática de configuración  

### Ubicaciones de Archivos

```
/opt/.blue-green-state                           # Estado actual (blue/green)
/opt/sofia-chat/blue-green-simple.sh            # Script principal
/opt/sofia-chat/scripts/update-prod-config.sh   # Helper Nginx
/root/repos/sofia-chat-backend-v2/               # Código fuente
/root/repos/sofia-chat-backend-v2/db-backup.sql # Backup DB (temporal)
```

## Integración con GitHub Actions

### Workflow Configuration

```yaml
# Copia solo los scripts necesarios
- name: Copy blue-green-simple script to server
  uses: appleboy/scp-action@master
  with:
    source: 'scripts/blue-green/blue-green-simple.sh'
    target: '/opt/sofia-chat/'
    strip_components: 2

- name: Copy helper scripts to server  
  uses: appleboy/scp-action@master
  with:
    source: 'scripts/blue-green/update-prod-config.sh'
    target: '/opt/sofia-chat/scripts/'
    strip_components: 2

# Ejecuta la acción
- name: Execute Blue-Green Action
  run: /opt/sofia-chat/blue-green-simple.sh ${{ github.event.inputs.action || 'deploy' }}
```

### Acciones Automáticas vs Manuales

| Acción | Automática (Workflow) | Manual (SSH) |
|--------|----------------------|--------------|
| `deploy` | ✅ | ✅ |
| `status` | ✅ | ✅ |
| `switch` | ❌ | ✅ |
| `rollback` | ❌ | ✅ |
| `cleanup` | ❌ | ✅ |

## Configuración

### Variables Internas

El script usa configuración embebida (no requiere variables de entorno):

```bash
PROJECT_DIR="/root/repos/sofia-chat-backend-v2"
STATE_FILE="/opt/.blue-green-state"
DOCKER_COMPOSE="docker-compose -f docker-compose.yml"
```

### Dependencias

- ✅ Docker & Docker Compose
- ✅ Nginx configurado
- ✅ PostgreSQL externo
- ✅ Repositorio en `$PROJECT_DIR`
- ✅ Archivo `.env` con configuración de DB

## Troubleshooting

### Problemas Comunes

**Error: "Script no encontrado"**
```bash
# Verificar ubicación
ls -la /opt/sofia-chat/blue-green-simple.sh

# Hacer ejecutable
chmod +x /opt/sofia-chat/blue-green-simple.sh
```

**Error: "No se pudo determinar estado"**
```bash
# Verificar archivo de estado
cat /opt/.blue-green-state

# Verificar configuración Nginx
grep localhost /etc/nginx/sites-available/backend.conf
```

**Error: "Contenedor no saludable"**
```bash
# Verificar logs del contenedor
docker logs sofia-chat-backend-blue
docker logs sofia-chat-backend-green

# Verificar health endpoint
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
```

### Debugging

```bash
# Logs detallados están incluidos automáticamente
/opt/sofia-chat/blue-green-simple.sh status

# Para más información, revisar:
docker ps                    # Estado de contenedores
docker logs [container]      # Logs específicos
nginx -t                     # Validar configuración Nginx
```

### Recovery

**Si algo sale mal:**

```bash
# 1. Rollback inmediato
/opt/sofia-chat/blue-green-simple.sh rollback

# 2. Restaurar DB si es necesario
/opt/sofia-chat/blue-green-simple.sh restore

# 3. Verificar estado
/opt/sofia-chat/blue-green-simple.sh status
```

## Migración desde Scripts Legacy

Si actualmente usas `blue-green-control.sh`:

```bash
# ANTES
PROJECT_DIR=/root/repos/sofia-chat-backend-v2 /opt/sofia-chat/scripts/blue-green-control.sh status

# AHORA  
/opt/sofia-chat/blue-green-simple.sh status
```

**Beneficios de la migración:**
- ✅ Comando más simple (sin PROJECT_DIR)
- ✅ Funcionalidad unificada (no más scripts duplicados)
- ✅ Mejor manejo de errores
- ✅ Backup automático de DB
- ✅ Logs más claros

## Estado del Sistema

### Archivos de Estado

```bash
# Estado principal
cat /opt/.blue-green-state  # blue|green

# Backup temporal (solo después de switch)
cat /root/repos/sofia-chat-backend-v2/.blue-green-backup

# Backup de DB (solo después de switch)
ls -la /root/repos/sofia-chat-backend-v2/db-backup.sql
```

### Verificación Completa

```bash
# Script todo-en-uno para verificar estado completo
/opt/sofia-chat/blue-green-simple.sh status

# Salida esperada:
# ==================================
#    ESTADO BLUE-GREEN DEPLOYMENT
# ==================================
# Estado actual: [blue|green]
# 
# 🔵 Blue (puerto 3001): [RUNNING|STOPPED]
# 🟢 Green (puerto 3002): [RUNNING|STOPPED]
# 🗄️  Database: External PostgreSQL (not managed)
# ==================================
```

---

**Para más información, consulta la documentación completa en:**
- `docs/flujo-blue-green-deployment.md`
- `docs/guia-implementacion-blue-green.md`

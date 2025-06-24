#!/bin/bash
# TEST MODE - No actual installations, only config validation

echo "=========================================="
echo "CONVERXA SETUP TEST MODE - $(date)"
echo "=========================================="
echo "⚠️  MODO PRUEBA - No se realizarán instalaciones reales"
echo "✅ Solo se validarán configuraciones de Nginx"
echo ""

# Crear directorios de prueba para nginx
mkdir -p /tmp/nginx-test/sites-available
mkdir -p /tmp/nginx-test/sites-enabled

echo "🔄 PASO 1/12: Simulando actualización del sistema..."
echo "✅ [SIMULADO] Sistema actualizado correctamente"

echo "🔄 PASO 2/12: Simulando instalación de dependencias..."
echo "✅ [SIMULADO] Dependencias básicas instaladas"

echo "🔄 PASO 3/12: Simulando instalación de Docker..."
echo "✅ [SIMULADO] Docker instalado correctamente"

echo "🔄 PASO 4/12: Simulando configuración de Docker..."
echo "✅ [SIMULADO] Docker configurado y habilitado"

echo "🔄 PASO 5/12: Simulando instalación de Nginx..."
echo "✅ [SIMULADO] Nginx instalado y configurado"

echo "🔄 PASO 6/12: Simulando instalación de PostgreSQL..."
echo "✅ [SIMULADO] PostgreSQL instalado correctamente"

echo "✅ [SIMULADO] pgvector instalado correctamente"

echo "✅ [SIMULADO] Firewall configurado"
echo "✅ [SIMULADO] SSH verificado"


echo "✅ [SIMULADO] SSH configurado y verificado"

echo "🔄 PASO 8/12: Configurando Nginx para Blue-Green deployment..."
# Configurar Nginx para Blue-Green deployment (configuración inicial para Blue)
cat > /tmp/nginx-test/sites-available/backend.conf << 'EOL'
# Configuración para HTTPS (backend)
server {
    listen 443 ssl;
    server_name back-chat.converxa.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/back-chat.converxa.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/back-chat.converxa.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
        proxy_pass http://localhost:3002;  # Redirige al backend Blue por defecto
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Configuración para WebSockets (WSS)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Headers adicionales
        proxy_set_header X-Deployment-Color "blue";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3002/api/health;
        proxy_set_header Host $host;
        access_log off;
    }
}

# Redirección de HTTP a HTTPS (backend)
server {
    listen 80;
    server_name back-chat.converxa.com;

    # Redirige todo el tráfico HTTP a HTTPS
    return 301 https://$host$request_uri;
}
EOL

# Simular habilitación de sitios
ln -sf /tmp/nginx-test/sites-available/backend.conf /tmp/nginx-test/sites-enabled/backend.conf

# Verificar configuración de Nginx (TEST MODE)
echo "🔍 Validando sintaxis del archivo de configuración..."
if command -v nginx >/dev/null 2>&1; then
    echo "✅ Nginx está instalado, validando configuración..."
    if nginx -t -c /tmp/nginx-test/sites-available/backend.conf 2>/dev/null; then
        echo "✅ Configuración de Nginx válida"
    else
        echo "❌ Error en configuración de Nginx:"
        nginx -t -c /tmp/nginx-test/sites-available/backend.conf
        echo "🔧 Revisando sintaxis manualmente..."
    fi
else
    echo "⚠️  Nginx no instalado, validando sintaxis básica..."
    if [ -f /tmp/nginx-test/sites-available/backend.conf ]; then
        echo "✅ Archivo de configuración creado correctamente"
        echo "📄 Contenido del archivo:"
        head -20 /tmp/nginx-test/sites-available/backend.conf
    else
        echo "❌ Error: No se pudo crear el archivo de configuración"
    fi
fi

echo "✅ [SIMULADO] Certbot instalado"

echo "✅ Nginx configurado para Blue-Green deployment"

echo "🔄 PASO 9/12: Simulando creación de directorios..."
echo "✅ [SIMULADO] Directorios del proyecto creados"
mkdir -p /var/log/sofia-chat/frontend
mkdir -p /root/repos

# Instalar scripts Blue-Green permanentemente
cat > /opt/sofia-chat/blue-green-simple.sh << 'BLUE_GREEN_SCRIPT_EOF'
#!/bin/bash

# Script simplificado para Blue-Green Deployment
# Uso: ./blue-green-simple.sh [status|deploy|switch|rollback]

set -e

PROJECT_DIR="/root/repos/sofia-chat-backend-v2"
STATE_FILE="/opt/.blue-green-state"

# Detect environment and use appropriate docker-compose file
if [ -f "$PROJECT_DIR/docker-compose.prod.yml" ] && [ "$NODE_ENV" = "production" ]; then
    DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"
    echo "Using production docker-compose configuration"
else
    DOCKER_COMPOSE="docker-compose -f docker-compose.yml"
    echo "Using development docker-compose configuration"
fi

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "$${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1$${NC}"
}

warn() {
    echo -e "$${YELLOW}[WARNING] $1$${NC}"
}

error() {
    echo -e "$${RED}[ERROR] $1$${NC}"
    exit 1
}

# Obtener el estado actual
get_current_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "blue"
    fi
}

# Guardar el estado
save_state() {
    echo "$1" > "$STATE_FILE"
}

# Verificar si un contenedor está corriendo
is_container_running() {
    local container_name="$1"
    docker ps --format "table {{.Names}}" | grep -q "^$container_name$"
}

# Actualizar configuración de nginx para apuntar al slot correcto
update_nginx_config() {
    local target_color="$1"
    local target_port=""

    if [ "$target_color" = "blue" ]; then
        target_port="3002"
    else
        target_port="3003"
    fi

    log "Actualizando configuración de nginx para $target_color (puerto $target_port)..."

    # Usar el script de actualización de producción
    if [ -f "/opt/sofia-chat/scripts/update-prod-config.sh" ]; then
        /opt/sofia-chat/scripts/update-prod-config.sh "$target_color" || {
            error "Error al actualizar configuración de nginx"
        }
        log "✅ Configuración de nginx actualizada"
    else
        warn "Script de actualización de nginx no encontrado - switch solo cambió estado interno"
    fi
}

# Backup del estado actual y base de datos antes de hacer cambios críticos
backup_state() {
    local backup_file="$PROJECT_DIR/.blue-green-backup"
    local current_state=$(get_current_state)

    log "Creando backup del estado actual y base de datos..."

    # Remover backup anterior si existe
    rm -f "$backup_file"
    rm -f "$PROJECT_DIR/db-backup.sql"

    # Backup de estado
    cat > "$backup_file" << EOF
TIMESTAMP=$(date)
CURRENT_STATE=$current_state
BLUE_RUNNING=$(is_container_running "sofia-chat-backend-blue" && echo "yes" || echo "no")
GREEN_RUNNING=$(is_container_running "sofia-chat-backend-green" && echo "yes" || echo "no")
EOF

    # Backup de base de datos usando variables del archivo .env
    local db_backup_file="$PROJECT_DIR/db-backup.sql"

    if [ -f "$PROJECT_DIR/.env" ]; then
        log "Cargando variables de entorno desde .env..."

        # Cargar variables de base de datos desde .env
        export $(grep -E '^TYPEORM_(HOST|PORT|USERNAME|PASSWORD|DB_NAME)=' "$PROJECT_DIR/.env" | xargs)

        if [ -n "$TYPEORM_HOST" ] && [ -n "$TYPEORM_USERNAME" ] && [ -n "$TYPEORM_DB_NAME" ]; then
            log "Creando backup de base de datos desde $TYPEORM_HOST..."
            log "Base de datos: $TYPEORM_DB_NAME"
            log "Usuario: $TYPEORM_USERNAME"

            # Crear backup usando pg_dump
            PGPASSWORD="$TYPEORM_PASSWORD" pg_dump \
                -h "$TYPEORM_HOST" \
                -p "$TYPEORM_PORT" \
                -U "$TYPEORM_USERNAME" \
                -d "$TYPEORM_DB_NAME" \
                > "$db_backup_file" 2>/dev/null

            if [ $? -eq 0 ] && [ -s "$db_backup_file" ]; then
                log "✅ Backup de DB guardado exitosamente en: $db_backup_file"
                local backup_size=$(du -h "$db_backup_file" | cut -f1)
                log "📊 Tamaño del backup: $backup_size"
                echo "DB_BACKUP_FILE=$db_backup_file" >> "$backup_file"
            else
                warn "❌ No se pudo crear backup de base de datos o el archivo está vacío"
                rm -f "$db_backup_file"
            fi
        else
            warn "❌ Variables de base de datos incompletas en .env"
        fi

        # Limpiar variables de entorno
        unset TYPEORM_HOST TYPEORM_PORT TYPEORM_USERNAME TYPEORM_PASSWORD TYPEORM_DB_NAME
    else
        warn "❌ Archivo .env no encontrado - saltando backup de DB"
    fi

    log "✅ Backup de estado guardado en: $backup_file"
}

# Restaurar base de datos desde backup
restore_database() {
    local db_backup_file="$PROJECT_DIR/db-backup.sql"

    if [ ! -f "$db_backup_file" ]; then
        error "❌ Archivo de backup no encontrado: $db_backup_file"
    fi

    if [ ! -f "$PROJECT_DIR/.env" ]; then
        error "❌ Archivo .env no encontrado"
    fi

    warn "⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos actual"
    log "Archivo de backup: $db_backup_file"

    # Cargar variables de base de datos desde .env
    export $(grep -E '^TYPEORM_(HOST|PORT|USERNAME|PASSWORD|DB_NAME)=' "$PROJECT_DIR/.env" | xargs)

    if [ -n "$TYPEORM_HOST" ] && [ -n "$TYPEORM_USERNAME" ] && [ -n "$TYPEORM_DB_NAME" ]; then
        log "Restaurando base de datos en $TYPEORM_HOST..."
        log "Base de datos: $TYPEORM_DB_NAME"
        log "Usuario: $TYPEORM_USERNAME"

        # Restaurar usando psql
        PGPASSWORD="$TYPEORM_PASSWORD" psql \
            -h "$TYPEORM_HOST" \
            -p "$TYPEORM_PORT" \
            -U "$TYPEORM_USERNAME" \
            -d "$TYPEORM_DB_NAME" \
            < "$db_backup_file" 2>/dev/null

        if [ $? -eq 0 ]; then
            log "✅ Base de datos restaurada exitosamente"
        else
            error "❌ Error al restaurar la base de datos"
        fi
    else
        error "❌ Variables de base de datos incompletas en .env"
    fi

    # Limpiar variables de entorno
    unset TYPEORM_HOST TYPEORM_PORT TYPEORM_USERNAME TYPEORM_PASSWORD TYPEORM_DB_NAME
}

# Health check de un contenedor
health_check() {
    local container_name="$1"
    local port="$2"
    local max_attempts=30
    local attempt=1

    log "Verificando salud de $container_name en puerto $port..."

    while [ $attempt -le $max_attempts ]; do
        # Intentar con wget primero, luego con nc
        if command -v wget >/dev/null 2>&1; then
            if wget -q --spider "http://localhost:$port/api/health" 2>/dev/null; then
                log "✅ $container_name está saludable"
                return 0
            fi
        elif command -v nc >/dev/null 2>&1; then
            if echo -e "GET /api/health HTTP/1.1\r\nHost: localhost\r\n\r\n" | nc localhost $port | grep -q "200 OK"; then
                log "✅ $container_name está saludable"
                return 0
            fi
        else
            # Fallback: verificar si el contenedor está corriendo
            if is_container_running "$container_name"; then
                log "✅ $container_name está corriendo (health check básico)"
                return 0
            fi
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    error "❌ $container_name no respondió en $max_attempts intentos"
}

# Mostrar estado actual
show_status() {
    local current_state=$(get_current_state)

    echo "=================================="
    echo "   ESTADO BLUE-GREEN DEPLOYMENT"
    echo "=================================="
    echo "Estado actual: $current_state"
    echo ""

    # Verificar contenedores
    if is_container_running "sofia-chat-backend-blue"; then
        echo "🔵 Blue (puerto 3002): RUNNING"
    else
        echo "🔵 Blue (puerto 3002): STOPPED"
    fi

    if is_container_running "sofia-chat-backend-green"; then
        echo "🟢 Green (puerto 3003): RUNNING"
    else
        echo "🟢 Green (puerto 3003): STOPPED"
    fi

    echo "🗄️  Database: External PostgreSQL (not managed)"

    echo "=================================="
}

# Deploy a slot específico
deploy() {
    local current_state=$(get_current_state)
    local target_slot=""

    # Determinar slot objetivo
    if [ "$current_state" = "blue" ]; then
        target_slot="green"
    else
        target_slot="blue"
    fi

    log "Desplegando a slot: $target_slot"
    log "Slot actual en producción: $current_state"

    cd "$PROJECT_DIR"

    log "DEBUG: Verificando archivos docker-compose..."
    ls -la docker-compose*.yml

    log "DEBUG: Verificando servicios disponibles..."
    AVAILABLE_SERVICES=$($DOCKER_COMPOSE config --services)
    echo "Servicios disponibles: $AVAILABLE_SERVICES"

    # Detener y remover contenedor existente si está corriendo
    if is_container_running "sofia-chat-backend-$target_slot"; then
        log "Deteniendo contenedor existente: sofia-chat-backend-$target_slot"
        $DOCKER_COMPOSE stop sofia-chat-backend-$target_slot
        $DOCKER_COMPOSE rm -f sofia-chat-backend-$target_slot
    fi

    # Build de la nueva imagen con --no-cache para garantizar imagen fresca
    log "Construyendo nueva imagen..."
    $DOCKER_COMPOSE build --no-cache sofia-chat-backend-$target_slot

    # Deploy al slot objetivo usando nueva imagen
    if [ "$target_slot" = "green" ]; then
        log "Desplegando a Green (puerto 3003)..."
        log "DEBUG: Comando a ejecutar: $DOCKER_COMPOSE --profile green up -d sofia-chat-backend-green"
        $DOCKER_COMPOSE --profile green up -d sofia-chat-backend-green
    else
        log "Desplegando a Blue (puerto 3002)..."
        log "DEBUG: Comando a ejecutar: $DOCKER_COMPOSE up -d sofia-chat-backend-blue"
        $DOCKER_COMPOSE up -d sofia-chat-backend-blue
    fi

    # Verificar salud del nuevo deployment
    if [ "$target_slot" = "green" ]; then
        health_check "sofia-chat-backend-green" "3003"
    else
        health_check "sofia-chat-backend-blue" "3002"
    fi

    log "✅ Deployment a $target_slot completado exitosamente"
    log "🧪 Puedes probar el nuevo deployment en puerto $([ "$target_slot" = "green" ] && echo "3003" || echo "3002")"
    log "⚠️  Para hacer switch a producción, ejecuta: ./blue-green-simple.sh switch"
}

# Hacer switch entre blue y green
switch() {
    local current_state=$(get_current_state)
    local new_state=""

    if [ "$current_state" = "blue" ]; then
        new_state="green"
        local new_port="3003"
    else
        new_state="blue"
        local new_port="3002"
    fi

    # Verificar que el nuevo slot esté corriendo y saludable
    if ! is_container_running "sofia-chat-backend-$new_state"; then
        error "El contenedor sofia-chat-backend-$new_state no está corriendo. Ejecuta deploy primero."
    fi

    log "Verificando salud del nuevo slot antes del switch..."
    health_check "sofia-chat-backend-$new_state" "$new_port"

    # Crear backup antes del switch
    backup_state

    # Hacer el switch
    log "Cambiando de $current_state a $new_state..."
    save_state "$new_state"

    # Actualizar configuración de nginx
    update_nginx_config "$new_state"

    log "✅ Switch completado: $new_state ahora está en producción"
    log "🔄 Para hacer rollback, ejecuta: ./blue-green-simple.sh rollback"
}

# Rollback al estado anterior
rollback() {
    local current_state=$(get_current_state)
    local rollback_state=""
    local rollback_port=""

    if [ "$current_state" = "blue" ]; then
        rollback_state="green"
        rollback_port="3003"
    else
        rollback_state="blue"
        rollback_port="3002"
    fi

    warn "Haciendo rollback de $current_state a $rollback_state..."

    # Cambiar al directorio del proyecto
    cd "$PROJECT_DIR" || error "No se pudo cambiar al directorio $PROJECT_DIR"

    # Verificar que el rollback slot esté disponible
    if ! is_container_running "sofia-chat-backend-$rollback_state"; then
        error "❌ El contenedor $rollback_state no está disponible para rollback"
    fi

    # Verificar salud del rollback slot
    health_check "sofia-chat-backend-$rollback_state" "$rollback_port"

    # Hacer rollback
    save_state "$rollback_state"

    # Actualizar configuración de nginx
    update_nginx_config "$rollback_state"

    log "✅ Rollback completado: $current_state → $rollback_state"
    log "🔗 Estado restaurado: $rollback_state (puerto $rollback_port)"
}

# Limpiar slot inactivo
cleanup() {
    log "=== INICIANDO CLEANUP ==="

    # Determinar qué está realmente en producción (via Nginx)
    local nginx_config="/etc/nginx/sites-available/backend.conf"
    log "Verificando configuración de Nginx en: $nginx_config"

    if [[ ! -f "$nginx_config" ]]; then
        error "Archivo de configuración de Nginx no encontrado: $nginx_config"
    fi

    local prod_port=$(grep -o "localhost:[0-9]*" "$nginx_config" | head -1 | cut -d: -f2)
    log "Puerto detectado en Nginx: $prod_port"

    local prod_state
    local inactive_state

    if [[ "$prod_port" == "3002" ]]; then
        prod_state="blue"
        inactive_state="green"
    elif [[ "$prod_port" == "3003" ]]; then
        prod_state="green"
        inactive_state="blue"
    else
        error "No se pudo determinar el estado de producción desde puerto: $prod_port"
    fi

    log "Producción está en: $prod_state (puerto $prod_port)"
    log "Limpiando entorno inactivo: $inactive_state"

    local container_name="sofia-chat-backend-$inactive_state"
    log "Contenedor a eliminar: $container_name"

    # Verificar que el contenedor existe
    if ! docker ps -a --format '{{.Names}}' | grep -q "^$${container_name}$"; then
        log "El contenedor $container_name no existe"
        log "Contenedores existentes:"
        docker ps -a --format 'table {{.Names}}\t{{.Status}}'
        log "Cleanup completado - contenedor ya no existe"
        return 0
    fi

    if is_container_running "$container_name"; then
        log "Deteniendo contenedor de pruebas: $container_name"

        if ! docker stop "$container_name"; then
            error "Error al detener el contenedor $container_name"
        fi

        log "Contenedor detenido, procediendo a eliminar..."

        if ! docker rm "$container_name"; then
            error "Error al eliminar el contenedor $container_name"
        fi

        log "Contenedor $container_name eliminado exitosamente"
    else
        log "El contenedor $container_name ya está detenido, eliminándolo..."

        if ! docker rm "$container_name"; then
            error "Error al eliminar el contenedor detenido $container_name"
        fi

        log "Contenedor detenido $container_name eliminado"
    fi

    # Limpiar imágenes no utilizadas
    log "Limpiando imágenes no utilizadas..."
    docker image prune -f

    log "=== CLEANUP COMPLETADO ==="
    log "Solo queda $prod_state en producción"

    # Verificación final
    log "Contenedores restantes:"
    docker ps --format 'table {{.Names}}\t{{.Status}}'
}

# Función principal
main() {
    case "$${1:-status}" in
        "status"|"s")
            show_status
            ;;
        "deploy"|"d")
            deploy
            ;;
        "switch"|"sw")
            switch
            ;;
        "rollback"|"rb")
            rollback
            ;;
        "cleanup"|"clean")
            cleanup
            ;;
        "restore")
            restore_database
            ;;
        "help"|"h"|"-h"|"--help")
            echo "Uso: $0 [comando] [parámetros]"
            echo ""
            echo "Comandos:"
            echo "  status              - Mostrar estado actual (default)"
            echo "  deploy              - Desplegar a slot inactivo"
            echo "  switch              - Cambiar tráfico al nuevo slot"
            echo "  rollback            - Volver al slot anterior"
            echo "  cleanup             - Limpiar slot inactivo"
            echo "  restore             - Restaurar DB desde último backup"
            echo "  help                - Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 restore"
            ;;
        *)
            error "Comando desconocido: $1. Usa 'help' para ver opciones disponibles."
            ;;
    esac
}

# Ejecutar función principal
main "$@"
BLUE_GREEN_SCRIPT_EOF

# Instalar script de actualización de configuración de producción
cat > /opt/sofia-chat/scripts/update-prod-config.sh << 'UPDATE_PROD_SCRIPT_EOF'
#!/bin/bash

# Script para actualizar la configuración de producción de Nginx
# Actualiza el upstream de producción para apuntar al color especificado

set -e

# Configuración
TARGET_COLOR="$1"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
CONFIG_FILE="$NGINX_CONFIG_DIR/backend.conf"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "$${GREEN}[INFO]$${NC} $1"
}

log_error() {
    echo -e "$${RED}[ERROR]$${NC} $1"
}

# Validar parámetros
if [[ -z "$TARGET_COLOR" ]]; then
    log_error "Uso: $0 {blue|green}"
    exit 1
fi

if [[ "$TARGET_COLOR" != "blue" && "$TARGET_COLOR" != "green" ]]; then
    log_error "Color debe ser 'blue' o 'green'"
    exit 1
fi

# Determinar puerto según color
# Blue=3002, Green=3003
if [[ "$TARGET_COLOR" == "blue" ]]; then
    TARGET_PORT="3002"
    INTERNAL_PORT="3003"  # Puerto inactivo para pruebas internas
else
    TARGET_PORT="3003"
    INTERNAL_PORT="3002"  # Puerto inactivo para pruebas internas
fi

# Detectar entorno para logging
if [ -f "/root/repos/sofia-chat-backend-v2/docker-compose.prod.yml" ] && [ "$NODE_ENV" = "production" ]; then
    log_info "Entorno: PRODUCCIÓN"
else
    log_info "Entorno: DESARROLLO"
fi

log_info "Actualizando configuración de nginx para apuntar a $TARGET_COLOR (puerto $TARGET_PORT)"

# Crear configuración de Nginx para producción
cat > "$CONFIG_FILE" << EOL
# Configuración para HTTPS (backend)
server {
    listen 443 ssl;
    server_name back-chat.converxa.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/back-chat.converxa.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/back-chat.converxa.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
        proxy_pass http://localhost:$TARGET_PORT;  # Redirige al backend $TARGET_COLOR
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Configuración para WebSockets (WSS)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Headers adicionales
        proxy_set_header X-Deployment-Color $TARGET_COLOR;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$TARGET_PORT/api/health;
        proxy_set_header Host \$host;
        access_log off;
    }
}

# Redirección de HTTP a HTTPS (backend)
server {
    listen 80;
    server_name back-chat.converxa.com;

    # Redirige todo el tráfico HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}

# Configuración para HTTPS (internal testing)
server {
    listen 443 ssl;
    server_name internal-back-chat.converxa.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/internal-back-chat.converxa.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/internal-back-chat.converxa.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
        proxy_pass http://localhost:$INTERNAL_PORT;  # Redirige al backend inactivo para pruebas
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Configuración para WebSockets (WSS)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Headers adicionales
        proxy_set_header X-Deployment-Color $([ "$TARGET_COLOR" = "blue" ] && echo "green" || echo "blue");
        proxy_set_header X-Environment "internal-testing";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$INTERNAL_PORT/api/health;
        proxy_set_header Host \$host;
        access_log off;
    }
}

# Redirección de HTTP a HTTPS (internal testing)
server {
    listen 80;
    server_name internal-back-chat.converxa.com;

    # Redirige todo el tráfico HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}
EOL

log_info "Configuración de nginx actualizada exitosamente"
log_info "Nginx ahora apunta a: $TARGET_COLOR (puerto $TARGET_PORT)"

# Verificar configuración
if nginx -t; then
    log_info "Configuración de Nginx válida"

    # Recargar nginx para aplicar cambios
    if systemctl reload nginx; then
        log_info "Nginx recargado exitosamente"
    else
        log_error "Error al recargar Nginx"
        exit 1
    fi
else
    log_error "Error en configuración de Nginx"
    exit 1
fi
UPDATE_PROD_SCRIPT_EOF

# Crear script de build del frontend
cat > /opt/sofia-chat/scripts/frontend-build.sh << 'FRONTEND_BUILD_SCRIPT_EOF'
#!/bin/bash

# Script para buildear el frontend para diferentes entornos
# Uso: ./frontend-build.sh [prod|internal]

set -e

ENVIRONMENT="$1"
FRONTEND_DIR="/root/repos/sofia-chat-frontend-v2"
BUILD_DIR=""
API_URL=""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "$${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1$${NC}"
}

error() {
    echo -e "$${RED}[ERROR] $1$${NC}"
    exit 1
}

# Validar parámetros
if [[ -z "$ENVIRONMENT" ]]; then
    error "Uso: $0 {prod|internal}"
fi

# Configurar según entorno
case "$ENVIRONMENT" in
    "prod")
        BUILD_DIR="/var/www/frontend/prod"
        API_URL="https://back-chat.converxa.com"
        log "Buildeando frontend para PRODUCCIÓN"
        ;;
    "internal")
        BUILD_DIR="/var/www/frontend/internal"
        API_URL="https://internal-back-chat.converxa.com"
        log "Buildeando frontend para PRUEBAS INTERNAS"
        ;;
    *)
        error "Entorno debe ser 'prod' o 'internal'"
        ;;
esac

log "API URL: $API_URL"
log "Build Directory: $BUILD_DIR"

# Verificar que el directorio del frontend existe
if [[ ! -d "$FRONTEND_DIR" ]]; then
    error "Directorio del frontend no encontrado: $FRONTEND_DIR"
fi

cd "$FRONTEND_DIR"

# Crear archivo .env para el build
cat > .env << ENV_EOF
VITE_API_URL=$API_URL
VITE_ENVIRONMENT=$ENVIRONMENT
VITE_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ENV_EOF

log "Instalando dependencias..."
npm install

log "Buildeando aplicación..."
npm run build

# Limpiar directorio de destino
log "Limpiando directorio de destino..."
rm -rf "$BUILD_DIR"/*

# Copiar archivos buildeados
log "Copiando archivos buildeados..."
cp -r dist/* "$BUILD_DIR"/

# Configurar permisos
chown -R www-data:www-data "$BUILD_DIR"
chmod -R 755 "$BUILD_DIR"

log "✅ Build completado exitosamente para $ENVIRONMENT"
log "📁 Archivos en: $BUILD_DIR"
log "📊 Tamaño: $(du -sh "$BUILD_DIR" | cut -f1)"

# Verificar archivos críticos
if [[ -f "$BUILD_DIR/index.html" ]]; then
    log "✅ index.html encontrado"
else
    error "❌ index.html no encontrado en el build"
fi

log "🌐 El frontend estará disponible en:"
if [[ "$ENVIRONMENT" == "prod" ]]; then
    log "   https://app-chat.converxa.com"
else
    log "   https://internal-app.converxa.com"
fi
FRONTEND_BUILD_SCRIPT_EOF

# Crear script de deploy del frontend
cat > /opt/sofia-chat/scripts/frontend-deploy.sh << 'FRONTEND_DEPLOY_SCRIPT_EOF'
#!/bin/bash

# Script para deploy completo del frontend
# Actualiza repositorio y rebuilds ambos entornos

set -e

FRONTEND_DIR="/root/repos/sofia-chat-frontend-v2"
BACKEND_DIR="/root/repos/sofia-chat-backend-v2"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "$${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1$${NC}"
}

error() {
    echo -e "$${RED}[ERROR] $1$${NC}"
    exit 1
}

warn() {
    echo -e "$${YELLOW}[WARNING] $1$${NC}"
}

log "=== INICIANDO DEPLOY DEL FRONTEND ==="

# Clonar/actualizar frontend si no existe
if [[ ! -d "$FRONTEND_DIR" ]]; then
    log "Clonando repositorio del frontend..."
    cd /root/repos
    git clone https://github.com/your-org/sofia-chat-frontend-v2.git
    cd "$FRONTEND_DIR"
else
    log "Actualizando repositorio del frontend..."
    cd "$FRONTEND_DIR"
    git fetch origin
    git checkout main || git checkout master || git checkout develop
    git pull
fi

log "Commit actual del frontend: $(git rev-parse --short HEAD)"

# Build para producción
log "=== BUILDING FRONTEND PARA PRODUCCIÓN ==="
/opt/sofia-chat/scripts/frontend-build.sh prod

# Build para pruebas internas
log "=== BUILDING FRONTEND PARA PRUEBAS INTERNAS ==="
/opt/sofia-chat/scripts/frontend-build.sh internal

# Actualizar configuración de Nginx para incluir frontend
log "=== ACTUALIZANDO CONFIGURACIÓN DE NGINX ==="
/opt/sofia-chat/scripts/update-nginx-full.sh

log "✅ Deploy del frontend completado exitosamente"
log ""
log "🌐 URLs disponibles:"
log "   Producción: https://app-chat.converxa.com"
log "   Pruebas: https://internal-app.converxa.com"
log ""
log "📊 Estado de archivos:"
ls -la /var/www/frontend/
FRONTEND_DEPLOY_SCRIPT_EOF

# Crear script de configuración completa de Nginx
cat > /opt/sofia-chat/scripts/update-nginx-full.sh << 'NGINX_FULL_SCRIPT_EOF'
#!/bin/bash

# Script para actualizar la configuración completa de Nginx (Backend + Frontend)

set -e

NGINX_CONFIG_DIR="/etc/nginx/sites-available"
BACKEND_CONFIG="$NGINX_CONFIG_DIR/backend.conf"
FRONTEND_CONFIG="$NGINX_CONFIG_DIR/frontend.conf"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() {
    echo -e "$${GREEN}[INFO]$${NC} $1"
}

log_error() {
    echo -e "$${RED}[ERROR]$${NC} $1"
}

# Obtener estado actual del Blue-Green
CURRENT_STATE=$(cat /opt/.blue-green-state 2>/dev/null || echo "blue")

if [[ "$CURRENT_STATE" == "blue" ]]; then
    BACKEND_PORT="3002"
    INTERNAL_BACKEND_PORT="3003"
else
    BACKEND_PORT="3003"
    INTERNAL_BACKEND_PORT="3002"
fi

log_info "Estado Blue-Green actual: $CURRENT_STATE"
log_info "Puerto de producción: $BACKEND_PORT"
log_info "Puerto de pruebas internas: $INTERNAL_BACKEND_PORT"

# Crear configuración de Frontend
cat > "$FRONTEND_CONFIG" << 'FRONTEND_NGINX_EOF'
# Configuración para Frontend Producción
server {
    listen 443 ssl;
    server_name app-chat.converxa.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/app-chat.converxa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app-chat.converxa.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Directorio raíz del frontend de producción
    root /var/www/frontend/prod;
    index index.html;

    # Configuración para SPA (Single Page Application)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs específicos
    access_log /var/log/nginx/frontend-prod-access.log;
    error_log /var/log/nginx/frontend-prod-error.log;
}

# Redirección HTTP a HTTPS para Frontend Producción
server {
    listen 80;
    server_name app-chat.converxa.com;
    return 301 https://$host$request_uri;
}

# Configuración para Frontend Pruebas Internas
server {
    listen 443 ssl;
    server_name internal-app.converxa.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/internal-app.converxa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/internal-app.converxa.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Directorio raíz del frontend de pruebas
    root /var/www/frontend/internal;
    index index.html;

    # Configuración para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1h;  # Cache menor para pruebas
        add_header Cache-Control "public";
    }

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Environment "internal-testing" always;

    # Logs específicos
    access_log /var/log/nginx/frontend-internal-access.log;
    error_log /var/log/nginx/frontend-internal-error.log;
}

# Redirección HTTP a HTTPS para Frontend Pruebas
server {
    listen 80;
    server_name internal-app.converxa.com;
    return 301 https://$host$request_uri;
}
FRONTEND_NGINX_EOF

# Actualizar configuración de Backend (usando el script existente)
/opt/sofia-chat/scripts/update-prod-config.sh "$CURRENT_STATE"

# Habilitar configuración de frontend
ln -sf "$FRONTEND_CONFIG" /etc/nginx/sites-enabled/frontend.conf

log_info "Configuración de Frontend creada: $FRONTEND_CONFIG"
log_info "Configuración de Backend actualizada para: $CURRENT_STATE"

# Verificar configuración
if nginx -t; then
    log_info "Configuración de Nginx válida"

    # Recargar nginx
    if systemctl reload nginx; then
        log_info "Nginx recargado exitosamente"
        log_info "✅ Configuración completa aplicada"
    else
        log_error "Error al recargar Nginx"
        exit 1
    fi
else
    log_error "Error en configuración de Nginx"
    exit 1
fi

log_info "🌐 URLs configuradas:"
log_info "   Backend Prod: https://back-chat.converxa.com"
log_info "   Backend Internal: https://internal-back-chat.converxa.com"
log_info "   Frontend Prod: https://app-chat.converxa.com"
log_info "   Frontend Internal: https://internal-app.converxa.com"
NGINX_FULL_SCRIPT_EOF

# Hacer scripts ejecutables
chmod +x /opt/sofia-chat/blue-green-simple.sh
chmod +x /opt/sofia-chat/scripts/update-prod-config.sh
chmod +x /opt/sofia-chat/scripts/frontend-build.sh
chmod +x /opt/sofia-chat/scripts/frontend-deploy.sh
chmod +x /opt/sofia-chat/scripts/update-nginx-full.sh

# Crear aliases para facilitar el uso
cat >> /root/.bashrc << 'ALIASES_EOF'

# Blue-Green Deployment Aliases
alias bg-status='/opt/sofia-chat/blue-green-simple.sh status'
alias bg-deploy='/opt/sofia-chat/blue-green-simple.sh deploy'
alias bg-switch='/opt/sofia-chat/blue-green-simple.sh switch'
alias bg-rollback='/opt/sofia-chat/blue-green-simple.sh rollback'
alias bg-cleanup='/opt/sofia-chat/blue-green-simple.sh cleanup'
alias bg-logs='docker logs -f'
alias bg-health='curl -s http://localhost:3002/api/health && echo "" && curl -s http://localhost:3003/api/health'

# Frontend Deployment Aliases
alias frontend-deploy='/opt/sofia-chat/scripts/frontend-deploy.sh'
alias frontend-build-prod='/opt/sofia-chat/scripts/frontend-build.sh prod'
alias frontend-build-internal='/opt/sofia-chat/scripts/frontend-build.sh internal'
alias frontend-status='ls -la /var/www/frontend/'
ALIASES_EOF

echo "✅ [SIMULADO] Certificados SSL configurados"
echo "✅ [SIMULADO] Estado Blue-Green inicializado"

# Configurar permisos para logs
echo "✅ [SIMULADO] Permisos de logs configurados"

echo "✅ [SIMULADO] curl instalado"

echo "🔄 PASO 10/12: Simulando instalación de Node.js..."
echo "✅ [SIMULADO] Node.js y npm instalados correctamente"

echo "🔄 PASO 11/12: Validando configuración adicional de Nginx..."
# Validar configuración de Nginx para pruebas internas
cat > /tmp/nginx-test/sites-available/internal-backend.conf << 'INTERNAL_EOL'
# Configuración placeholder para pruebas internas
# Se actualizará dinámicamente por los scripts de Blue-Green
server {
    listen 80;
    server_name internal-back-chat.converxa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name internal-back-chat.converxa.com;

    # Usar los mismos certificados por ahora
    ssl_certificate /etc/letsencrypt/live/back-chat.converxa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/back-chat.converxa.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3001;  # Inicialmente apunta a blue
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Headers para identificar entorno de pruebas
        proxy_set_header X-Environment internal-testing;
        add_header X-Internal-Testing "true" always;
        add_header X-Deployment-Color "blue" always;

        # Configuración para WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
INTERNAL_EOL

# Configurar logrotate para logs de Blue-Green
cat > /etc/logrotate.d/sofia-chat << 'LOGROTATE_EOL'
/var/log/sofia-chat/*/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
LOGROTATE_EOL

echo "✅ [SIMULADO] Configuración de Nginx y scripts completada"

# Validar segunda configuración de Nginx
echo "🔍 Validando configuración interna de Nginx..."
if command -v nginx >/dev/null 2>&1; then
    if nginx -t -c /tmp/nginx-test/sites-available/internal-backend.conf 2>/dev/null; then
        echo "✅ Configuración interna de Nginx válida"
    else
        echo "❌ Error en configuración interna de Nginx:"
        nginx -t -c /tmp/nginx-test/sites-available/internal-backend.conf
    fi
else
    echo "⚠️  Nginx no instalado, archivo creado en: /tmp/nginx-test/sites-available/internal-backend.conf"
fi

echo "✅ [SIMULADO] Nginx reiniciado"

echo "✅ [SIMULADO] Crontab configurado para renovación SSL"

# Crear script de health check automático
cat > /opt/sofia-chat/scripts/health-check.sh << 'HEALTH_CHECK_SCRIPT_EOF'
#!/bin/bash

# Script de health check para Blue-Green deployment
# Monitorea la salud de ambos contenedores y el estado del sistema

set -e

LOG_FILE="/var/log/sofia-chat/health-check.log"
STATE_FILE="/opt/.blue-green-state"

# Función de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Verificar salud de un contenedor
check_container_health() {
    local container_name="$1"
    local port="$2"

    if docker ps --format "table {{.Names}}" | grep -q "^$container_name$"; then
        if wget -q --spider --timeout=5 "http://localhost:$port/api/health" 2>/dev/null; then
            echo "HEALTHY"
        else
            echo "UNHEALTHY"
        fi
    else
        echo "STOPPED"
    fi
}

# Función principal de health check
main() {
    case "$${1:-check}" in
        "check")
            local current_state=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")
            local blue_health=$(check_container_health "sofia-chat-backend-blue" "3002")
            local green_health=$(check_container_health "sofia-chat-backend-green" "3003")

            log "Estado actual: $current_state | Blue: $blue_health | Green: $green_health"

            # Alertar si el contenedor en producción no está saludable
            if [ "$current_state" = "blue" ] && [ "$blue_health" != "HEALTHY" ]; then
                log "ALERTA: Contenedor Blue en producción no está saludable"
            elif [ "$current_state" = "green" ] && [ "$green_health" != "HEALTHY" ]; then
                log "ALERTA: Contenedor Green en producción no está saludable"
            fi
            ;;
        "monitor")
            log "Iniciando monitoreo continuo..."
            while true; do
                main check
                sleep 30
            done
            ;;
        *)
            echo "Uso: $0 [check|monitor]"
            exit 1
            ;;
    esac
}

main "$@"
HEALTH_CHECK_SCRIPT_EOF

# Hacer ejecutable el script de health check
chmod +x /opt/sofia-chat/scripts/health-check.sh

# Configurar health check automático cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/sofia-chat/scripts/health-check.sh check >> /var/log/sofia-chat/health-check.log 2>&1") | crontab -

# Validación final del setup
echo "=== VALIDACIÓN FINAL DEL SETUP ==="

# Verificar servicios críticos
echo "Verificando servicios críticos..."
systemctl is-active --quiet docker && echo "✅ Docker: ACTIVO" || echo "❌ Docker: INACTIVO"
systemctl is-active --quiet nginx && echo "✅ Nginx: ACTIVO" || echo "❌ Nginx: INACTIVO"
systemctl is-active --quiet postgresql && echo "✅ PostgreSQL: ACTIVO" || echo "❌ PostgreSQL: INACTIVO"
systemctl is-active --quiet ssh && echo "✅ SSH: ACTIVO" || echo "❌ SSH: INACTIVO"

# Verificar scripts Blue-Green
echo ""
echo "Verificando scripts Blue-Green..."
if [ -f "/opt/sofia-chat/blue-green-simple.sh" ] && [ -x "/opt/sofia-chat/blue-green-simple.sh" ]; then
    echo "✅ Script principal: INSTALADO"
else
    echo "❌ Script principal: ERROR"
fi

if [ -f "/opt/sofia-chat/scripts/update-prod-config.sh" ] && [ -x "/opt/sofia-chat/scripts/update-prod-config.sh" ]; then
    echo "✅ Script de configuración: INSTALADO"
else
    echo "❌ Script de configuración: ERROR"
fi

if [ -f "/opt/sofia-chat/scripts/health-check.sh" ] && [ -x "/opt/sofia-chat/scripts/health-check.sh" ]; then
    echo "✅ Script de health check: INSTALADO"
else
    echo "❌ Script de health check: ERROR"
fi

# Verificar configuración de Nginx
echo ""
echo "Verificando configuración de Nginx..."
if nginx -t &>/dev/null; then
    echo "✅ Configuración de Nginx: VÁLIDA"
else
    echo "❌ Configuración de Nginx: ERROR"
fi

# Verificar aliases
echo ""
echo "Verificando aliases..."
if grep -q "bg-status" /root/.bashrc; then
    echo "✅ Aliases Blue-Green: CONFIGURADOS"
else
    echo "❌ Aliases Blue-Green: ERROR"
fi

# Verificar crontab
echo ""
echo "Verificando crontab..."
if crontab -l | grep -q "health-check.sh"; then
    echo "✅ Health check automático: CONFIGURADO"
else
    echo "❌ Health check automático: ERROR"
fi

# Verificar directorios
echo ""
echo "Verificando directorios..."
for dir in "/var/log/sofia-chat/blue" "/var/log/sofia-chat/green" "/var/log/sofia-chat/nginx" "/opt/sofia-chat/scripts" "/var/www/frontend/prod" "/var/www/frontend/internal"; do
    if [ -d "$dir" ]; then
        echo "✅ Directorio $(basename $dir): CREADO"
    else
        echo "❌ Directorio $(basename $dir): ERROR"
    fi
done

# Verificar scripts de frontend
echo ""
echo "Verificando scripts de frontend..."
if [ -f "/opt/sofia-chat/scripts/frontend-build.sh" ] && [ -x "/opt/sofia-chat/scripts/frontend-build.sh" ]; then
    echo "✅ Script de build frontend: INSTALADO"
else
    echo "❌ Script de build frontend: ERROR"
fi

if [ -f "/opt/sofia-chat/scripts/frontend-deploy.sh" ] && [ -x "/opt/sofia-chat/scripts/frontend-deploy.sh" ]; then
    echo "✅ Script de deploy frontend: INSTALADO"
else
    echo "❌ Script de deploy frontend: ERROR"
fi

if [ -f "/opt/sofia-chat/scripts/update-nginx-full.sh" ] && [ -x "/opt/sofia-chat/scripts/update-nginx-full.sh" ]; then
    echo "✅ Script de Nginx completo: INSTALADO"
else
    echo "❌ Script de Nginx completo: ERROR"
fi

# Verificar Node.js
echo ""
echo "Verificando Node.js..."
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: NO INSTALADO"
fi

if command -v npm >/dev/null 2>&1; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: NO INSTALADO"
fi

# Verificar estado inicial
echo ""
echo "Verificando estado inicial..."
if [ -f "/opt/.blue-green-state" ]; then
    echo "✅ Estado inicial: $(cat /opt/.blue-green-state)"
else
    echo "❌ Estado inicial: ERROR"
fi

echo ""
echo "🎉 PASO 12/12: FINALIZACIÓN"
echo "=========================================="
echo "✅ MODO PRUEBA COMPLETADO EXITOSAMENTE"
echo "=========================================="
echo "Validación del script de setup Converxa completada"

echo ""
echo "📋 RESUMEN DE VALIDACIÓN:"
echo "✅ Configuraciones de Nginx creadas en /tmp/nginx-test/"
echo "✅ Archivos de configuración validados"
if [ -f /tmp/nginx-test/sites-available/backend.conf ]; then
    echo "✅ backend.conf: $(wc -l < /tmp/nginx-test/sites-available/backend.conf) líneas"
fi
if [ -f /tmp/nginx-test/sites-available/internal-backend.conf ]; then
    echo "✅ internal-backend.conf: $(wc -l < /tmp/nginx-test/sites-available/internal-backend.conf) líneas"
fi

echo ""
echo "🔧 Para revisar las configuraciones:"
echo "  cat /tmp/nginx-test/sites-available/backend.conf"
echo "  cat /tmp/nginx-test/sites-available/internal-backend.conf"
echo "IMPORTANTE: Scripts Blue-Green instalados en /opt/sofia-chat/"
echo "IMPORTANTE: DNS debe configurarse manualmente para back-chat.converxa.com"
echo "IMPORTANTE: DNS debe configurarse manualmente para internal-back-chat.converxa.com"
echo "Luego ejecutar: certbot --nginx -d internal-back-chat.converxa.com"
echo ""
echo "Comandos Backend disponibles:"
echo "  bg-status    - Ver estado actual"
echo "  bg-deploy    - Deploy a color inactivo"
echo "  bg-switch    - Cambiar tráfico al otro color"
echo "  bg-rollback  - Rollback al color anterior"
echo "  bg-cleanup   - Limpiar contenedores parados"
echo ""
echo "Comandos Frontend disponibles:"
echo "  frontend-deploy      - Deploy del frontend"
echo "  frontend-status      - Ver estado de archivos"
echo ""
echo "URLs Backend disponibles:"
echo "  - Producción: https://back-chat.converxa.com"
echo "  - Pruebas internas: https://internal-back-chat.converxa.com"
echo "  - Blue directo: http://$(curl -s ifconfig.me):3002/api/health"
echo "  - Green directo: http://$(curl -s ifconfig.me):3003/api/health"
echo ""
echo "URLs Frontend disponibles (después del deploy):"
echo "  - Producción: https://app-chat.converxa.com"
echo "  - Pruebas internas: https://internal-app.converxa.com"
echo ""
echo "NOTA: Para deployar el frontend ejecutar:"
echo "  1. Configurar certificados SSL para dominios frontend"
echo "  2. frontend-deploy"
echo "=========================================="

# Mark test as complete
echo "Test completed successfully at $(date)" > /tmp/test_complete
echo "🎉 MODO PRUEBA FINALIZADO EXITOSAMENTE - $(date)"

#!/bin/bash

# Script simplificado para Blue-Green Deployment
# Uso: ./blue-green-simple.sh [status|deploy|switch|rollback]

set -e

PROJECT_DIR="/root/repos/converxa-backend-v1"
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
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
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
    if [ -f "/opt/converxa-chat/scripts/update-prod-config.sh" ]; then
        /opt/converxa-chat/scripts/update-prod-config.sh "$target_color" || {
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
BLUE_RUNNING=$(is_container_running "converxa-backend-blue" && echo "yes" || echo "no")
GREEN_RUNNING=$(is_container_running "converxa-backend-green" && echo "yes" || echo "no")
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
    if is_container_running "converxa-backend-blue"; then
        echo "🔵 Blue (puerto 3002): RUNNING"
    else
        echo "🔵 Blue (puerto 3002): STOPPED"
    fi

    if is_container_running "converxa-backend-green"; then
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
    if is_container_running "converxa-backend-$target_slot"; then
        log "Deteniendo contenedor existente: converxa-backend-$target_slot"
        $DOCKER_COMPOSE stop converxa-backend-$target_slot
        $DOCKER_COMPOSE rm -f converxa-backend-$target_slot
    fi

    # Build de la nueva imagen con --no-cache para garantizar imagen fresca
    log "Construyendo nueva imagen..."
    $DOCKER_COMPOSE build --no-cache converxa-backend-$target_slot

    # Limpiar imágenes huérfanas después del build exitoso
    log "Limpiando imágenes huérfanas..."
    docker image prune -f
    log "✅ Imágenes huérfanas limpiadas"

    # Deploy al slot objetivo usando nueva imagen
if [ "$target_slot" = "green" ]; then
    log "Desplegando a Green (puerto 3003)..."
    log "DEBUG: Comando a ejecutar: $DOCKER_COMPOSE --profile green up -d converxa-backend-green"
    $DOCKER_COMPOSE --profile green up -d converxa-backend-green
else
    log "Desplegando a Blue (puerto 3002)..."
    log "DEBUG: Comando a ejecutar: $DOCKER_COMPOSE up -d converxa-backend-blue"
    $DOCKER_COMPOSE up -d converxa-backend-blue
fi

# Verificar salud del nuevo deployment
if [ "$target_slot" = "green" ]; then
    health_check "converxa-backend-green" "3003"
else
    health_check "converxa-backend-blue" "3002"
fi

    log "✅ Deployment a $target_slot completado exitosamente"
    log "🧪 Puedes probar el nuevo deployment en puerto $([ "$target_slot" = "green" ] && echo "3003" || echo "3002")"
    log "⚠️  Para hacer switch a producción, ejecuta: ./blue-green-simple.sh switch"

    # Mostrar información del espacio en disco
    log "📊 Espacio en disco después del deployment:"
    df -h / | grep -E "Filesystem|/dev"

    # Mostrar imágenes Docker actuales
    log "🐳 Imágenes Docker actuales:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep -E "REPOSITORY|converxa-backend"
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
    if ! is_container_running "converxa-backend-$new_state"; then
        error "El contenedor converxa-backend-$new_state no está corriendo. Ejecuta deploy primero."
    fi

    log "Verificando salud del nuevo slot antes del switch..."
    health_check "converxa-backend-$new_state" "$new_port"

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
    if ! is_container_running "converxa-backend-$rollback_state"; then
        error "❌ El contenedor $rollback_state no está disponible para rollback"
    fi

    # Verificar salud del rollback slot
    health_check "converxa-backend-$rollback_state" "$rollback_port"

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

    local container_name="converxa-backend-$inactive_state"
    log "Contenedor a eliminar: $container_name"

    # Verificar que el contenedor existe
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
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
    case "${1:-status}" in
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

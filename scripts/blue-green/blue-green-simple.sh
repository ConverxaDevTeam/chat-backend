#!/bin/bash

# Script simplificado para Blue-Green Deployment
# Uso: ./blue-green-simple.sh [status|deploy|switch|rollback]

set -e

PROJECT_DIR="/root/repos/sofia-chat-backend-v2"
STATE_FILE="$PROJECT_DIR/.blue-green-state"
DOCKER_COMPOSE="docker-compose -f docker-compose.yml"

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
        target_port="3001"
    else
        target_port="3002"
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
    local backup_file="$PROJECT_DIR/.blue-green-backup-$(date +%s)"
    local current_state=$(get_current_state)
    
    log "Creando backup del estado actual y base de datos..."
    
    # Backup de estado
    cat > "$backup_file" << EOF
TIMESTAMP=$(date)
CURRENT_STATE=$current_state
BLUE_RUNNING=$(is_container_running "sofia-chat-backend-blue" && echo "yes" || echo "no")
GREEN_RUNNING=$(is_container_running "sofia-chat-backend-green" && echo "yes" || echo "no")
EOF

    # Backup de base de datos usando las variables del contenedor
    local db_backup_file="$PROJECT_DIR/db-backup-$(date +%s).sql"
    if is_container_running "sofia-chat-backend-blue"; then
        log "Creando backup de base de datos..."
        docker exec sofia-chat-backend-blue bash -c "pg_dump -h \$TYPEORM_HOST -p \$TYPEORM_PORT -U \$TYPEORM_USERNAME -d \$TYPEORM_DB_NAME" > "$db_backup_file" 2>/dev/null || {
            warn "No se pudo crear backup de base de datos - continuando sin backup de DB"
            rm -f "$db_backup_file"
        }
        if [ -f "$db_backup_file" ]; then
            log "Backup de DB guardado en: $db_backup_file"
            echo "DB_BACKUP_FILE=$db_backup_file" >> "$backup_file"
        fi
    fi
    
    log "Backup guardado en: $backup_file"
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
        echo "🔵 Blue (puerto 3001): RUNNING"
    else
        echo "🔵 Blue (puerto 3001): STOPPED"
    fi
    
    if is_container_running "sofia-chat-backend-green"; then
        echo "🟢 Green (puerto 3002): RUNNING"
    else
        echo "🟢 Green (puerto 3002): STOPPED"
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
    

    
    # Build de la nueva imagen
    log "Construyendo nueva imagen..."
    $DOCKER_COMPOSE build sofia-chat-backend-$target_slot
    
    # Deploy al slot objetivo
    if [ "$target_slot" = "green" ]; then
        log "Desplegando a Green (puerto 3002)..."
        log "DEBUG: Comando a ejecutar: $DOCKER_COMPOSE --profile green up -d sofia-chat-backend-green"
        $DOCKER_COMPOSE --profile green up -d sofia-chat-backend-green
    else
        log "Desplegando a Blue (puerto 3001)..."
        log "DEBUG: Comando a ejecutar: $DOCKER_COMPOSE up -d sofia-chat-backend-blue"
        $DOCKER_COMPOSE up -d sofia-chat-backend-blue
    fi
    
    # Verificar salud del nuevo deployment
    if [ "$target_slot" = "green" ]; then
        health_check "sofia-chat-backend-green" "3002"
    else
        health_check "sofia-chat-backend-blue" "3001"
    fi
    
    log "✅ Deployment a $target_slot completado exitosamente"
    log "🧪 Puedes probar el nuevo deployment en puerto $([ "$target_slot" = "green" ] && echo "3002" || echo "3001")"
    log "⚠️  Para hacer switch a producción, ejecuta: ./blue-green-simple.sh switch"
}

# Hacer switch entre blue y green
switch() {
    local current_state=$(get_current_state)
    local new_state=""
    
    if [ "$current_state" = "blue" ]; then
        new_state="green"
        local new_port="3002"
    else
        new_state="blue"
        local new_port="3001"
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
        rollback_port="3002"
    else
        rollback_state="blue"
        rollback_port="3001"
    fi
    
    warn "Haciendo rollback de $current_state a $rollback_state..."
    
    # Cambiar al directorio del proyecto
    cd "$PROJECT_DIR" || error "No se pudo cambiar al directorio $PROJECT_DIR"
    
    # Crear backup antes del rollback
    backup_state
    
    # Verificar que el rollback slot esté disponible
    if ! is_container_running "sofia-chat-backend-$rollback_state"; then
        error "❌ El contenedor $rollback_state no está disponible para rollback"
    fi
    
    # Verificar salud del rollback slot
    health_check "sofia-chat-backend-$rollback_state" "$rollback_port"
    
    # Hacer rollback
    save_state "$rollback_state"
    
    log "✅ Rollback completado: $current_state → $rollback_state"
    log "🔗 Estado restaurado: $rollback_state (puerto $rollback_port)"
}

# Limpiar slot inactivo
cleanup() {
    local current_state=$(get_current_state)
    local inactive_slot=""
    
    if [ "$current_state" = "blue" ]; then
        inactive_slot="green"
    else
        inactive_slot="blue"
    fi
    
    log "Limpiando slot inactivo: $inactive_slot"
    
    # Cambiar al directorio del proyecto para ejecutar docker-compose
    cd "$PROJECT_DIR" || error "No se pudo cambiar al directorio $PROJECT_DIR"
    
    if is_container_running "sofia-chat-backend-$inactive_slot"; then
        $DOCKER_COMPOSE stop "sofia-chat-backend-$inactive_slot"
        $DOCKER_COMPOSE rm -f "sofia-chat-backend-$inactive_slot"
        log "✅ Slot $inactive_slot limpiado"
    else
        log "Slot $inactive_slot ya estaba detenido"
    fi
    
    # Limpiar imágenes huérfanas
    docker image prune -f
    log "✅ Imágenes huérfanas limpiadas"
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
        "help"|"h"|"-h"|"--help")
            echo "Uso: $0 [comando]"
            echo ""
            echo "Comandos:"
            echo "  status    - Mostrar estado actual (default)"
            echo "  deploy    - Desplegar a slot inactivo"
            echo "  switch    - Cambiar tráfico al nuevo slot"
            echo "  rollback  - Volver al slot anterior"
            echo "  cleanup   - Limpiar slot inactivo"
            echo "  help      - Mostrar esta ayuda"
            ;;
        *)
            error "Comando desconocido: $1. Usa 'help' para ver opciones disponibles."
            ;;
    esac
}

# Ejecutar función principal
main "$@"
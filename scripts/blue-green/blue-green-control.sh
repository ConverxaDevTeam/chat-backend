#!/bin/bash

# Blue-Green Deployment Control Script
# Gestiona el ciclo completo de despliegue Blue-Green

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
STATE_FILE="$PROJECT_DIR/.blue-green-state"
LOG_DIR="$PROJECT_DIR/logs/blue-green"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_blue() {
    echo -e "${BLUE}[BLUE]${NC} $1"
}

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Función para obtener el estado actual
get_current_state() {
    if [[ -f "$STATE_FILE" ]]; then
        cat "$STATE_FILE"
    else
        echo "blue"  # Estado inicial por defecto
    fi
}

# Función para establecer el estado
set_current_state() {
    echo "$1" > "$STATE_FILE"
    log_info "Estado cambiado a: $1"
}

# Función para verificar si un contenedor está corriendo
is_container_running() {
    local container_name="$1"
    docker ps --format '{{.Names}}' | grep -q "^${container_name}$"
}

# Función para verificar salud de un contenedor
check_container_health() {
    local container_name="$1"
    local port="$2"

    if ! is_container_running "$container_name"; then
        return 1
    fi

    # Verificar health check de Docker
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")

    if [[ "$health_status" == "healthy" ]]; then
        return 0
    elif [[ "$health_status" == "none" ]]; then
        # Si no hay health check de Docker, verificar manualmente
        wget --quiet --spider "http://localhost:$port/api/health" 2>/dev/null
        return $?
    else
        return 1
    fi
}

# Función para mostrar el estado actual
show_status() {
    local current_state=$(get_current_state)

    echo "=================================="
    echo "   BLUE-GREEN DEPLOYMENT STATUS"
    echo "=================================="
    echo

    log_info "Estado actual: $current_state"
    echo

    # Verificar contenedores
    echo "Estado de Contenedores:"
    echo "----------------------"

    if is_container_running "sofia-chat-backend-blue"; then
        if check_container_health "sofia-chat-backend-blue" "3001"; then
            log_blue "BLUE (puerto 3001): CORRIENDO y SALUDABLE"
        else
            echo -e "${BLUE}BLUE (puerto 3001):${NC} ${YELLOW}CORRIENDO pero NO SALUDABLE${NC}"
        fi
    else
        echo -e "${BLUE}BLUE (puerto 3001):${NC} ${RED}DETENIDO${NC}"
    fi

    if is_container_running "sofia-chat-backend-green"; then
        if check_container_health "sofia-chat-backend-green" "3002"; then
            echo -e "${GREEN}GREEN (puerto 3002): CORRIENDO y SALUDABLE${NC}"
        else
            echo -e "${GREEN}GREEN (puerto 3002):${NC} ${YELLOW}CORRIENDO pero NO SALUDABLE${NC}"
        fi
    else
        echo -e "${GREEN}GREEN (puerto 3002):${NC} ${RED}DETENIDO${NC}"
    fi

    echo

    # Verificar configuración de Nginx
    echo "Configuración de Nginx:"
    echo "----------------------"
    if [[ -f "$NGINX_CONFIG_DIR/backend.conf" ]]; then
        local active_port=$(grep -o "localhost:[0-9]*" "$NGINX_CONFIG_DIR/backend.conf" | head -1 | cut -d: -f2)
        if [[ "$active_port" == "3001" ]]; then
            log_blue "Producción apunta a: BLUE (puerto 3001)"
        elif [[ "$active_port" == "3002" ]]; then
            echo -e "${GREEN}Producción apunta a: GREEN (puerto 3002)${NC}"
        else
            log_warn "Configuración de producción desconocida"
        fi
    else
        log_error "Archivo de configuración de Nginx no encontrado"
    fi

    if [[ -f "$NGINX_CONFIG_DIR/internal-backend.conf" ]]; then
        local internal_port=$(grep -o "localhost:[0-9]*" "$NGINX_CONFIG_DIR/internal-backend.conf" | head -1 | cut -d: -f2)
        if [[ "$internal_port" == "3001" ]]; then
            log_blue "Pruebas internas apuntan a: BLUE (puerto 3001)"
        elif [[ "$internal_port" == "3002" ]]; then
            echo -e "${GREEN}Pruebas internas apuntan a: GREEN (puerto 3002)${NC}"
        else
            log_warn "Configuración de pruebas internas desconocida"
        fi
    else
        log_warn "Configuración de pruebas internas no encontrada"
    fi

    echo "=================================="
}

# Función para desplegar a un slot específico
deploy_to_slot() {
    local target_color="$1"
    local image_tag="${2:-latest}"

    log_info "Iniciando deploy a slot $target_color..."

    # Determinar nombres y puertos
    local container_name="sofia-chat-backend-$target_color"
    local port
    if [[ "$target_color" == "blue" ]]; then
        port="3001"
    else
        port="3002"
    fi

    # Detener contenedor existente si está corriendo
    if is_container_running "$container_name"; then
        log_warn "Deteniendo contenedor existente: $container_name"
        docker stop "$container_name" || true
        docker rm "$container_name" || true
    fi

    # Construir nueva imagen si es necesario
    log_info "Construyendo imagen Docker..."
    cd "$PROJECT_DIR"
    docker build --no-cache -t "sofia-chat-backend:$image_tag" .

    # Iniciar nuevo contenedor
    log_info "Iniciando contenedor $container_name en puerto $port..."

    if [[ "$target_color" == "green" ]]; then
        docker-compose --profile green up -d sofia-chat-backend-green
    else
        docker-compose --profile blue up -d sofia-chat-backend-blue
    fi

    # Esperar a que el contenedor esté saludable
    log_info "Esperando a que el contenedor esté saludable..."
    local attempts=0
    local max_attempts=30

    while [[ $attempts -lt $max_attempts ]]; do
        if check_container_health "$container_name" "$port"; then
            log_info "Contenedor $container_name está saludable!"
            break
        fi

        attempts=$((attempts + 1))
        log_warn "Intento $attempts/$max_attempts - Esperando..."
        sleep 10
    done

    if [[ $attempts -eq $max_attempts ]]; then
        log_error "El contenedor no pasó las verificaciones de salud después de $max_attempts intentos"
        return 1
    fi

    # Actualizar configuración de pruebas internas para apuntar al nuevo slot
    "$SCRIPT_DIR/update-internal-config.sh" "$target_color"

    log_info "Deploy completado exitosamente en slot $target_color"
    log_info "Puedes probar en: https://internal-dev-sofia-chat.sofiacall.com"
}

# Función para cambiar el tráfico de producción
switch_traffic() {
    local current_state=$(get_current_state)
    local new_state

    if [[ "$current_state" == "blue" ]]; then
        new_state="green"
    else
        new_state="blue"
    fi

    log_info "Cambiando tráfico de producción de $current_state a $new_state..."

    # Verificar que el contenedor destino esté saludable
    local container_name="sofia-chat-backend-$new_state"
    local port
    if [[ "$new_state" == "blue" ]]; then
        port="3001"
    else
        port="3002"
    fi

    if ! check_container_health "$container_name" "$port"; then
        log_error "El contenedor $new_state no está saludable. Abortando switch."
        return 1
    fi

    # Hacer backup de la configuración actual
    cp "$NGINX_CONFIG_DIR/backend.conf" "$NGINX_CONFIG_DIR/backend.conf.backup.$(date +%s)"

    # Actualizar configuración de producción
    "$SCRIPT_DIR/update-prod-config.sh" "$new_state"

    # Verificar configuración de Nginx
    if ! nginx -t; then
        log_error "Error en configuración de Nginx. Restaurando backup..."
        cp "$NGINX_CONFIG_DIR/backend.conf.backup."* "$NGINX_CONFIG_DIR/backend.conf"
        return 1
    fi

    # Recargar Nginx
    systemctl reload nginx

    # Actualizar estado
    set_current_state "$new_state"

    log_info "Tráfico cambiado exitosamente a $new_state"

    # Verificar que el nuevo entorno responda correctamente
    sleep 5
    if wget --quiet --spider "https://dev-sofia-chat.sofiacall.com/api/health" 2>/dev/null; then
        log_info "Verificación post-switch exitosa"
    else
        log_error "Verificación post-switch falló. Considera hacer rollback."
    fi
}

# Función para rollback
rollback() {
    local current_state=$(get_current_state)
    local previous_state

    if [[ "$current_state" == "blue" ]]; then
        previous_state="green"
    else
        previous_state="blue"
    fi

    log_warn "Iniciando rollback de $current_state a $previous_state..."

    # Verificar que el contenedor anterior esté disponible
    local container_name="sofia-chat-backend-$previous_state"
    local port
    if [[ "$previous_state" == "blue" ]]; then
        port="3001"
    else
        port="3002"
    fi

    if ! is_container_running "$container_name"; then
        log_error "El contenedor $previous_state no está corriendo. No se puede hacer rollback."
        return 1
    fi

    # Restaurar configuración de Nginx
    if [[ -f "$NGINX_CONFIG_DIR/backend.conf.backup."* ]]; then
        local latest_backup=$(ls -t "$NGINX_CONFIG_DIR"/backend.conf.backup.* | head -1)
        cp "$latest_backup" "$NGINX_CONFIG_DIR/backend.conf"

        # Verificar y recargar
        if nginx -t; then
            systemctl reload nginx
            set_current_state "$previous_state"
            log_info "Rollback completado a $previous_state"
        else
            log_error "Error al restaurar configuración de Nginx"
            return 1
        fi
    else
        log_error "No se encontró backup de configuración"
        return 1
    fi
}

# Función para limpiar entorno inactivo
cleanup() {
    local current_state=$(get_current_state)
    local inactive_state

    if [[ "$current_state" == "blue" ]]; then
        inactive_state="green"
    else
        inactive_state="blue"
    fi

    log_info "Limpiando entorno inactivo: $inactive_state"

    local container_name="sofia-chat-backend-$inactive_state"

    if is_container_running "$container_name"; then
        log_info "Deteniendo contenedor: $container_name"
        docker stop "$container_name"
        docker rm "$container_name"
    fi

    # Limpiar imágenes no utilizadas
    docker image prune -f

    log_info "Limpieza completada"
}

# Función principal
main() {
    case "${1:-}" in
        "status")
            show_status
            ;;
        "deploy")
            local current_state=$(get_current_state)
            local target_state
            if [[ "$current_state" == "blue" ]]; then
                target_state="green"
            else
                target_state="blue"
            fi
            deploy_to_slot "$target_state" "${2:-latest}"
            ;;
        "switch")
            switch_traffic
            ;;
        "rollback")
            rollback
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Uso: $0 {status|deploy [tag]|switch|rollback|cleanup}"
            echo
            echo "Comandos:"
            echo "  status   - Mostrar estado actual de Blue-Green"
            echo "  deploy   - Desplegar al slot inactivo"
            echo "  switch   - Cambiar tráfico de producción"
            echo "  rollback - Revertir al estado anterior"
            echo "  cleanup  - Limpiar entorno inactivo"
            exit 1
            ;;
    esac
}

# Verificar que se ejecute como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script debe ejecutarse como root"
   exit 1
fi

# Ejecutar función principal
main "$@"

#!/bin/bash

# Health Check Script para Blue-Green Deployment
# Verifica la salud de los contenedores y servicios

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$PROJECT_DIR/logs/blue-green/health-check.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Funciones de logging
log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${GREEN}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

log_warn() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1"
    echo -e "${YELLOW}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}$msg${NC}"
    echo "$msg" >> "$LOG_FILE"
}

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

# Función para verificar si un contenedor está corriendo
is_container_running() {
    local container_name="$1"
    docker ps --format '{{.Names}}' | grep -q "^${container_name}$"
}

# Función para verificar el health check de Docker
check_docker_health() {
    local container_name="$1"
    
    if ! is_container_running "$container_name"; then
        return 1
    fi
    
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
    
    case "$health_status" in
        "healthy")
            return 0
            ;;
        "unhealthy")
            return 1
            ;;
        "starting")
            return 2  # Código especial para "iniciando"
            ;;
        *)
            return 3  # Sin health check configurado
            ;;
    esac
}

# Función para verificar endpoint HTTP
check_http_endpoint() {
    local url="$1"
    local timeout="${2:-10}"
    
    local response=$(curl -s -w "%{http_code}" -m "$timeout" "$url" -o /dev/null 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        return 0
    else
        return 1
    fi
}

# Función para verificar conectividad de base de datos
check_database() {
    local container_name="sofia-chat-backend-blue"
    
    if is_container_running "$container_name"; then
        # Intentar conectar a la DB desde el contenedor
        local db_check=$(docker exec "$container_name" node -e "
            const { Pool } = require('pg');
            const pool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'sofia_chat',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD
            });
            pool.query('SELECT 1')
                .then(() => console.log('OK'))
                .catch(err => console.log('ERROR'))
                .finally(() => pool.end());
        " 2>/dev/null || echo "ERROR")
        
        if [[ "$db_check" == "OK" ]]; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Función para verificar salud completa de un contenedor
check_container_complete_health() {
    local container_name="$1"
    local port="$2"
    local color="$3"
    
    local status="UNKNOWN"
    local issues=()
    
    # Verificar si el contenedor está corriendo
    if ! is_container_running "$container_name"; then
        status="STOPPED"
        issues+=("Contenedor no está corriendo")
        return 1
    fi
    
    # Verificar Docker health check
    check_docker_health "$container_name"
    local docker_health=$?
    
    case $docker_health in
        0)
            log_info "$color: Docker health check OK"
            ;;
        1)
            issues+=("Docker health check FAILED")
            ;;
        2)
            issues+=("Docker health check STARTING")
            ;;
        3)
            log_warn "$color: Sin Docker health check configurado"
            ;;
    esac
    
    # Verificar endpoint HTTP local
    if check_http_endpoint "http://localhost:$port/health" 5; then
        log_info "$color: HTTP health endpoint OK"
    else
        issues+=("HTTP health endpoint no responde")
    fi
    
    # Verificar respuesta de aplicación
    local app_response=$(curl -s -m 5 "http://localhost:$port/health" 2>/dev/null || echo "")
    if [[ -n "$app_response" ]]; then
        log_info "$color: Aplicación responde correctamente"
    else
        issues+=("Aplicación no responde")
    fi
    
    # Verificar memoria y CPU del contenedor
    local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$container_name" 2>/dev/null || echo "")
    if [[ -n "$stats" ]]; then
        log_info "$color: Stats del contenedor disponibles"
    else
        issues+=("No se pueden obtener estadísticas del contenedor")
    fi
    
    # Determinar estado final
    if [[ ${#issues[@]} -eq 0 ]]; then
        status="HEALTHY"
        return 0
    elif [[ $docker_health -eq 2 ]]; then
        status="STARTING"
        return 2
    else
        status="UNHEALTHY"
        for issue in "${issues[@]}"; do
            log_error "$color: $issue"
        done
        return 1
    fi
}

# Función para verificar configuración de Nginx
check_nginx_config() {
    log_info "Verificando configuración de Nginx..."
    
    # Verificar que Nginx esté corriendo
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx no está corriendo"
        return 1
    fi
    
    # Verificar configuración sintáctica
    if ! nginx -t &>/dev/null; then
        log_error "Configuración de Nginx tiene errores sintácticos"
        return 1
    fi
    
    # Verificar que los archivos de configuración existan
    local config_files=(
        "/etc/nginx/sites-available/backend.conf"
        "/etc/nginx/sites-enabled/backend.conf"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ ! -f "$config_file" ]]; then
            log_error "Archivo de configuración no encontrado: $config_file"
            return 1
        fi
    done
    
    log_info "Configuración de Nginx OK"
    return 0
}

# Función para verificar certificados SSL
check_ssl_certificates() {
    log_info "Verificando certificados SSL..."
    
    local cert_file="/etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/fullchain.pem"
    local key_file="/etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/privkey.pem"
    
    if [[ ! -f "$cert_file" ]]; then
        log_error "Certificado SSL no encontrado: $cert_file"
        return 1
    fi
    
    if [[ ! -f "$key_file" ]]; then
        log_error "Clave privada SSL no encontrada: $key_file"
        return 1
    fi
    
    # Verificar expiración del certificado
    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_left=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    if [[ $days_left -lt 30 ]]; then
        log_warn "Certificado SSL expira en $days_left días"
    else
        log_info "Certificado SSL válido por $days_left días"
    fi
    
    return 0
}

# Función principal de verificación
perform_health_check() {
    local target_color="$1"
    local exit_code=0
    
    log_info "Iniciando verificación de salud completa..."
    
    if [[ -n "$target_color" ]]; then
        # Verificar solo un color específico
        log_info "Verificando solo entorno: $target_color"
        
        local container_name="sofia-chat-backend-$target_color"
        local port
        if [[ "$target_color" == "blue" ]]; then
            port="3001"
        else
            port="3002"
        fi
        
        if ! check_container_complete_health "$container_name" "$port" "$target_color"; then
            exit_code=1
        fi
    else
        # Verificar ambos entornos
        log_info "Verificando todos los entornos..."
        
        # Verificar Blue
        if is_container_running "sofia-chat-backend-blue"; then
            if ! check_container_complete_health "sofia-chat-backend-blue" "3001" "BLUE"; then
                exit_code=1
            fi
        else
            log_warn "Contenedor BLUE no está corriendo"
        fi
        
        # Verificar Green
        if is_container_running "sofia-chat-backend-green"; then
            if ! check_container_complete_health "sofia-chat-backend-green" "3002" "GREEN"; then
                exit_code=1
            fi
        else
            log_info "Contenedor GREEN no está corriendo (puede ser normal)"
        fi
    fi
    
    # Verificar base de datos
    if check_database; then
        log_info "Conexión a base de datos OK"
    else
        log_error "Problema con conexión a base de datos"
        exit_code=1
    fi
    
    # Verificar Nginx
    if ! check_nginx_config; then
        exit_code=1
    fi
    
    # Verificar SSL
    if ! check_ssl_certificates; then
        exit_code=1
    fi
    
    # Resumen final
    if [[ $exit_code -eq 0 ]]; then
        log_info "✅ Todas las verificaciones de salud pasaron exitosamente"
    else
        log_error "❌ Se encontraron problemas en las verificaciones de salud"
    fi
    
    return $exit_code
}

# Función para monitoreo continuo
continuous_monitoring() {
    local interval="${1:-30}"
    
    log_info "Iniciando monitoreo continuo cada $interval segundos..."
    log_info "Presiona Ctrl+C para detener"
    
    while true; do
        echo "==================== $(date) ===================="
        perform_health_check
        echo
        sleep "$interval"
    done
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
Uso: $0 [OPCIONES] [COMANDO]

COMANDOS:
    check [color]    - Realizar verificación de salud (blue/green/all)
    monitor [sec]    - Monitoreo continuo (intervalo en segundos, default: 30)
    help            - Mostrar esta ayuda

EJEMPLOS:
    $0 check                    # Verificar todos los entornos
    $0 check blue              # Verificar solo entorno blue
    $0 monitor 60              # Monitoreo cada 60 segundos

CÓDIGOS DE SALIDA:
    0 - Todas las verificaciones exitosas
    1 - Se encontraron problemas
    2 - Entorno iniciando
EOF
}

# Función principal
main() {
    case "${1:-check}" in
        "check")
            perform_health_check "$2"
            ;;
        "monitor")
            continuous_monitoring "$2"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Comando desconocido: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal
main "$@"
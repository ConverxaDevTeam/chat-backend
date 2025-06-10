#!/bin/bash

# Script para conectar al servidor y ejecutar comandos de Blue-Green
# Facilita la gestión remota del deployment

set -e

# Configuración
SERVER_HOST="137.184.227.234"
SSH_KEY="$HOME/.ssh/digitalOcean"
SSH_USER="root"
PROJECT_PATH="/root/repos/sofia-chat-backend-v2"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Verificar que la clave SSH existe
if [[ ! -f "$SSH_KEY" ]]; then
    log_error "Clave SSH no encontrada en: $SSH_KEY"
    log_info "Asegúrate de que la clave digitalOcean esté en ~/.ssh/"
    exit 1
fi

# Función para ejecutar comandos remotos
remote_exec() {
    ssh -i "$SSH_KEY" "$SSH_USER@$SERVER_HOST" "$@"
}

# Función para conectar al servidor
connect() {
    log_info "Conectando al servidor $SERVER_HOST..."
    ssh -i "$SSH_KEY" "$SSH_USER@$SERVER_HOST"
}

# Función para ver estado
status() {
    log_info "Consultando estado del Blue-Green deployment..."
    remote_exec "/opt/sofia-chat/scripts/blue-green-control.sh status" 2>/dev/null || {
        log_warn "Scripts de Blue-Green no instalados. Usar: $0 install"
    }
}

# Función para instalar Blue-Green
install() {
    log_step "Instalando Blue-Green deployment en el servidor..."
    
    # Subir scripts
    log_info "1. Subiendo scripts al servidor..."
    scp -i "$SSH_KEY" -r scripts/blue-green/ "$SSH_USER@$SERVER_HOST:/tmp/"
    
    # Ejecutar instalación
    log_info "2. Ejecutando instalación..."
    remote_exec "chmod +x /tmp/blue-green/*.sh && /tmp/blue-green/install-blue-green.sh"
    
    log_info "✅ Instalación completada"
    log_warn "IMPORTANTE: Configurar DNS para internal-dev-sofia-chat.sofiacall.com"
    log_warn "Luego ejecutar: $0 setup-ssl"
}

# Función para configurar SSL
setup_ssl() {
    log_step "Configurando certificados SSL..."
    remote_exec "certbot --nginx -d internal-dev-sofia-chat.sofiacall.com --non-interactive --agree-tos --email admin@sofiacall.com"
    log_info "✅ SSL configurado"
}

# Función para hacer deployment
deploy() {
    log_step "Ejecutando deployment al slot inactivo..."
    remote_exec "cd $PROJECT_PATH && git pull origin develop && /opt/sofia-chat/scripts/blue-green-control.sh deploy"
    log_info "✅ Deployment completado"
    log_warn "Probar en: https://internal-dev-sofia-chat.sofiacall.com"
}

# Función para switch
switch() {
    log_warn "⚠️  CAMBIO DE TRÁFICO DE PRODUCCIÓN"
    echo -n "¿Confirmas cambiar el tráfico? [y/N]: "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_step "Cambiando tráfico de producción..."
        remote_exec "/opt/sofia-chat/scripts/blue-green-control.sh switch"
        log_info "✅ Tráfico cambiado exitosamente"
    else
        log_info "Operación cancelada"
    fi
}

# Función para rollback
rollback() {
    log_warn "⚠️  ROLLBACK DE PRODUCCIÓN"
    echo -n "¿Confirmas hacer rollback? [y/N]: "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_step "Ejecutando rollback..."
        remote_exec "/opt/sofia-chat/scripts/blue-green-control.sh rollback"
        log_info "✅ Rollback completado"
    else
        log_info "Operación cancelada"
    fi
}

# Función para ver logs
logs() {
    log_info "Mostrando logs de Blue-Green (Ctrl+C para salir)..."
    remote_exec "tail -f /var/log/sofia-chat/blue-green/*.log"
}

# Función para health check
health() {
    log_info "Verificando salud de contenedores..."
    remote_exec "/opt/sofia-chat/scripts/health-check.sh check"
}

# Función para cleanup
cleanup() {
    log_info "Limpiando slot inactivo..."
    remote_exec "/opt/sofia-chat/scripts/blue-green-control.sh cleanup"
    log_info "✅ Limpieza completada"
}

# Función para setup inicial completo
full_setup() {
    log_step "SETUP COMPLETO DE BLUE-GREEN DEPLOYMENT"
    echo "========================================"
    
    log_info "1. Verificando conexión al servidor..."
    if ! remote_exec "echo 'Conexión exitosa'"; then
        log_error "No se puede conectar al servidor"
        exit 1
    fi
    
    log_info "2. Creando backup de seguridad..."
    remote_exec "
        mkdir -p /root/backups/\$(date +%Y%m%d)
        cp -r /etc/nginx/sites-available /root/backups/\$(date +%Y%m%d)/ 2>/dev/null || true
        cp -r /etc/nginx/sites-enabled /root/backups/\$(date +%Y%m%d)/ 2>/dev/null || true
        echo 'Backup creado en /root/backups/\$(date +%Y%m%d)'
    "
    
    log_info "3. Instalando Blue-Green scripts..."
    install
    
    log_info "4. Verificando instalación..."
    status
    
    echo
    log_info "🎉 SETUP COMPLETADO"
    echo "==================="
    echo "Próximos pasos:"
    echo "1. Configurar DNS para internal-dev-sofia-chat.sofiacall.com"
    echo "2. Ejecutar: $0 setup-ssl"
    echo "3. Hacer primer deployment: $0 deploy"
    echo "4. Probar en: https://internal-dev-sofia-chat.sofiacall.com"
    echo "5. Si todo OK: $0 switch"
    echo
}

# Función para quick start
quick_start() {
    echo "======================================"
    echo "   SOFIA CHAT - BLUE-GREEN MANAGER"
    echo "======================================"
    echo
    echo "Comandos disponibles:"
    echo "  status    - Ver estado actual"
    echo "  deploy    - Desplegar a slot inactivo"
    echo "  switch    - Cambiar tráfico (PRODUCCIÓN)"
    echo "  rollback  - Revertir cambios"
    echo "  health    - Verificar salud"
    echo "  logs      - Ver logs en tiempo real"
    echo "  cleanup   - Limpiar slot inactivo"
    echo "  connect   - Conectar vía SSH"
    echo
    echo "Comandos de setup:"
    echo "  install      - Instalar Blue-Green"
    echo "  setup-ssl    - Configurar certificados"
    echo "  full-setup   - Setup completo"
    echo
    echo "Ejemplos:"
    echo "  $0 status"
    echo "  $0 deploy"
    echo "  $0 switch"
    echo
}

# Función principal
main() {
    case "${1:-help}" in
        "status"|"s")
            status
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
        "health"|"h")
            health
            ;;
        "logs"|"l")
            logs
            ;;
        "cleanup"|"c")
            cleanup
            ;;
        "connect"|"ssh")
            connect
            ;;
        "install")
            install
            ;;
        "setup-ssl")
            setup_ssl
            ;;
        "full-setup")
            full_setup
            ;;
        "help"|"--help"|"-h")
            quick_start
            ;;
        *)
            quick_start
            ;;
    esac
}

# Verificar argumentos y ejecutar
main "$@"
#!/bin/bash

# Script de instalación inicial para Blue-Green Deployment
# Configura el servidor para soportar despliegue Blue-Green

set -e

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SOFIA_DIR="/opt/sofia-chat"
LOG_DIR="/var/log/sofia-chat"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Verificar que se ejecute como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script debe ejecutarse como root"
   exit 1
fi

log_info "Iniciando instalación de Blue-Green Deployment para Sofia Chat Backend"
echo "=================================================================="

# Paso 1: Crear estructura de directorios
log_step "1. Creando estructura de directorios..."

mkdir -p "$SOFIA_DIR"/{scripts,backups,state}
mkdir -p "$LOG_DIR"/{blue,green,nginx,blue-green}
mkdir -p /etc/sofia-chat

log_info "Directorios creados exitosamente"

# Paso 2: Copiar scripts
log_step "2. Copiando scripts de Blue-Green..."

cp "$SCRIPT_DIR"/*.sh "$SOFIA_DIR/scripts/"
chmod +x "$SOFIA_DIR/scripts"/*.sh

log_info "Scripts copiados y configurados"

# Paso 3: Configurar permisos
log_step "3. Configurando permisos..."

chown -R www-data:www-data "$LOG_DIR"
chmod -R 755 "$LOG_DIR"
chown -R root:root "$SOFIA_DIR"
chmod -R 755 "$SOFIA_DIR"

log_info "Permisos configurados"

# Paso 4: Crear archivo de estado inicial
log_step "4. Configurando estado inicial..."

echo "blue" > "$SOFIA_DIR/.blue-green-state"
echo "$(date)" > "$SOFIA_DIR/.installation-date"

log_info "Estado inicial configurado (BLUE activo)"

# Paso 5: Configurar logrotate
log_step "5. Configurando rotación de logs..."

cat > /etc/logrotate.d/sofia-chat << 'LOGROTATE_EOF'
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

/var/log/sofia-chat/blue-green/*.log {
    daily
    missingok
    rotate 15
    compress
    notifempty
    create 644 root root
}
LOGROTATE_EOF

log_info "Rotación de logs configurada"

# Paso 6: Configurar cron jobs
log_step "6. Configurando monitoreo automático..."

# Health check cada 5 minutos
(crontab -l 2>/dev/null | grep -v "sofia-chat.*health-check"; echo "*/5 * * * * $SOFIA_DIR/scripts/health-check.sh check >> $LOG_DIR/blue-green/health-check.log 2>&1") | crontab -

# Cleanup de logs antiguos diariamente
(crontab -l 2>/dev/null | grep -v "sofia-chat.*cleanup"; echo "0 2 * * * find $LOG_DIR -name '*.log' -mtime +30 -delete") | crontab -

log_info "Monitoreo automático configurado"

# Paso 7: Crear configuración de Nginx para pruebas internas
log_step "7. Configurando Nginx para pruebas internas..."

# Backup de configuración existente si existe
if [[ -f "$NGINX_CONFIG_DIR/backend.conf" ]]; then
    cp "$NGINX_CONFIG_DIR/backend.conf" "$SOFIA_DIR/backups/backend.conf.$(date +%s)"
    log_info "Backup de configuración existente creado"
fi

# Crear configuración para pruebas internas
cat > "$NGINX_CONFIG_DIR/internal-backend.conf" << 'INTERNAL_NGINX_EOF'
# Configuración para pruebas internas Blue-Green
server {
    listen 80;
    server_name internal-dev-sofia-chat.sofiacall.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name internal-dev-sofia-chat.sofiacall.com;

    # Certificados SSL (usar los mismos del dominio principal inicialmente)
    ssl_certificate /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de seguridad
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

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

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_set_header Host $host;
        access_log off;
        add_header X-Internal-Testing "true" always;
    }

    # Endpoint para información del deployment
    location /deployment-info {
        add_header Content-Type "application/json" always;
        add_header X-Internal-Testing "true" always;
        return 200 '{"color": "blue", "port": 3001, "environment": "internal-testing", "timestamp": "$time_iso8601"}';
    }
}
INTERNAL_NGINX_EOF

# Habilitar configuración de pruebas internas
if [[ ! -L "$NGINX_ENABLED_DIR/internal-backend.conf" ]]; then
    ln -sf "$NGINX_CONFIG_DIR/internal-backend.conf" "$NGINX_ENABLED_DIR/internal-backend.conf"
fi

log_info "Configuración de Nginx para pruebas internas creada"

# Paso 8: Verificar y recargar Nginx
log_step "8. Verificando configuración de Nginx..."

if nginx -t; then
    systemctl reload nginx
    log_info "Nginx recargado exitosamente"
else
    log_error "Error en configuración de Nginx"
    exit 1
fi

# Paso 9: Crear script de utilidades
log_step "9. Creando script de utilidades..."

cat > "$SOFIA_DIR/scripts/bg-utils.sh" << 'UTILS_EOF'
#!/bin/bash

# Utilidades para Blue-Green Deployment

# Función para obtener el color activo
get_active_color() {
    if [[ -f /opt/sofia-chat/.blue-green-state ]]; then
        cat /opt/sofia-chat/.blue-green-state
    else
        echo "blue"
    fi
}

# Función para obtener el puerto del color
get_color_port() {
    local color="$1"
    if [[ "$color" == "blue" ]]; then
        echo "3001"
    else
        echo "3002"
    fi
}

# Función para verificar si un contenedor está corriendo
is_container_healthy() {
    local container="$1"
    local port="$2"
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        curl -sf "http://localhost:$port/health" > /dev/null 2>&1
        return $?
    else
        return 1
    fi
}

# Función para obtener estadísticas rápidas
quick_stats() {
    echo "=== BLUE-GREEN STATUS ==="
    echo "Active: $(get_active_color)"
    echo "Blue: $(is_container_healthy 'sofia-chat-backend-blue' '3001' && echo 'HEALTHY' || echo 'DOWN')"
    echo "Green: $(is_container_healthy 'sofia-chat-backend-green' '3002' && echo 'HEALTHY' || echo 'DOWN')"
    echo "========================="
}

# Exportar funciones si se sourcea el script
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    export -f get_active_color get_color_port is_container_healthy quick_stats
fi
UTILS_EOF

chmod +x "$SOFIA_DIR/scripts/bg-utils.sh"

log_info "Script de utilidades creado"

# Paso 10: Crear alias útiles
log_step "10. Configurando aliases..."

cat >> /root/.bashrc << 'ALIASES_EOF'

# Sofia Chat Blue-Green Aliases
alias bg-status='/opt/sofia-chat/scripts/blue-green-control.sh status'
alias bg-deploy='/opt/sofia-chat/scripts/blue-green-control.sh deploy'
alias bg-switch='/opt/sofia-chat/scripts/blue-green-control.sh switch'
alias bg-rollback='/opt/sofia-chat/scripts/blue-green-control.sh rollback'
alias bg-cleanup='/opt/sofia-chat/scripts/blue-green-control.sh cleanup'
alias bg-health='/opt/sofia-chat/scripts/health-check.sh check'
alias bg-logs='tail -f /var/log/sofia-chat/blue-green/*.log'

ALIASES_EOF

log_info "Aliases configurados"

# Paso 11: Verificar instalación
log_step "11. Verificando instalación..."

# Verificar que todos los scripts existen y son ejecutables
REQUIRED_SCRIPTS=(
    "blue-green-control.sh"
    "update-prod-config.sh"
    "update-internal-config.sh"
    "health-check.sh"
    "bg-utils.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ -x "$SOFIA_DIR/scripts/$script" ]]; then
        log_info "✓ $script configurado correctamente"
    else
        log_error "✗ $script no encontrado o no ejecutable"
        exit 1
    fi
done

# Verificar estructura de directorios
REQUIRED_DIRS=(
    "$SOFIA_DIR"
    "$SOFIA_DIR/scripts"
    "$SOFIA_DIR/backups"
    "$LOG_DIR/blue"
    "$LOG_DIR/green"
    "$LOG_DIR/blue-green"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        log_info "✓ Directorio $dir existe"
    else
        log_error "✗ Directorio $dir no encontrado"
        exit 1
    fi
done

# Paso 12: Resumen final
echo
echo "=================================================================="
log_info "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE"
echo "=================================================================="
echo
echo "📋 RESUMEN DE CONFIGURACIÓN:"
echo "   • Directorio base: $SOFIA_DIR"
echo "   • Logs: $LOG_DIR"
echo "   • Estado inicial: BLUE activo"
echo "   • Scripts disponibles en: $SOFIA_DIR/scripts/"
echo
echo "🔧 COMANDOS DISPONIBLES:"
echo "   • bg-status    - Ver estado actual"
echo "   • bg-deploy    - Desplegar a slot inactivo"
echo "   • bg-switch    - Cambiar tráfico de producción"
echo "   • bg-rollback  - Revertir cambios"
echo "   • bg-cleanup   - Limpiar entorno inactivo"
echo "   • bg-health    - Verificar salud"
echo
echo "🌐 DOMINIOS CONFIGURADOS:"
echo "   • Producción: dev-sofia-chat.sofiacall.com"
echo "   • Pruebas: internal-dev-sofia-chat.sofiacall.com"
echo
echo "⚠️  PASOS SIGUIENTES:"
echo "   1. Configurar DNS para internal-dev-sofia-chat.sofiacall.com"
echo "   2. Obtener certificado SSL: certbot --nginx -d internal-dev-sofia-chat.sofiacall.com"
echo "   3. Actualizar docker-compose.yml para usar docker-compose.blue-green.yml"
echo "   4. Ejecutar primer deployment: bg-deploy"
echo
echo "📚 DOCUMENTACIÓN:"
echo "   Ver: $PROJECT_DIR/docu/flujo-blue-green-deployment.md"
echo
echo "=================================================================="

# Mostrar próximos pasos
log_warn "IMPORTANTE: Recarga tu shell para usar los nuevos aliases:"
log_warn "source /root/.bashrc"

log_info "Blue-Green Deployment instalado y configurado exitosamente!"
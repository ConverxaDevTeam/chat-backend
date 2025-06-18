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
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
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
if [[ "$TARGET_COLOR" == "blue" ]]; then
    TARGET_PORT="3002"
else
    TARGET_PORT="3003"
fi

log_info "Actualizando configuración de producción para apuntar a $TARGET_COLOR (puerto $TARGET_PORT)"

# Crear configuración de Nginx para producción
cat > "$CONFIG_FILE" << EOL
# Configuración para HTTPS (backend)
server {
    listen 443 ssl;
    server_name dev-sofia-chat.sofiacall.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/privkey.pem; # managed by Certbot
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
    server_name dev-sofia-chat.sofiacall.com;

    # Redirige todo el tráfico HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}
EOL

log_info "Configuración de producción actualizada exitosamente"
log_info "Producción ahora apunta a: $TARGET_COLOR (puerto $TARGET_PORT)"

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

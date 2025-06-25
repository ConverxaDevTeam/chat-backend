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
# Blue=3002, Green=3003
if [[ "$TARGET_COLOR" == "blue" ]]; then
    TARGET_PORT="3002"
    INTERNAL_PORT="3003"  # Puerto inactivo para pruebas internas
else
    TARGET_PORT="3003"
    INTERNAL_PORT="3002"  # Puerto inactivo para pruebas internas
fi

# Detectar entorno para logging
if [ -f "/root/repos/converxa-chat-backend-v2/docker-compose.prod.yml" ] && [ "$NODE_ENV" = "production" ]; then
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
    server_name back-chat.converxa.net;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/back-chat.converxa.net/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/back-chat.converxa.net/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    # Configuración para uploads de imágenes
    client_max_body_size 10M;

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
    server_name back-chat.converxa.net;

    # Redirige todo el tráfico HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}

# Configuración para HTTPS (internal testing)
server {
    listen 443 ssl;
    server_name internal-back-chat.converxa.net;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/internal-back-chat.converxa.net/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/internal-back-chat.converxa.net/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    # Configuración para uploads de imágenes
    client_max_body_size 10M;

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
    server_name internal-back-chat.converxa.net;

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

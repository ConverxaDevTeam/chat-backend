#!/bin/bash
set -e

# Actualizar sistema
apt update && apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

# Instalar dependencias básicas
apt install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    ufw \
    git \
    build-essential

# Instalar Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Habilitar Docker
systemctl enable docker
systemctl start docker

# Instalar Docker Compose standalone
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Nginx
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
    echo "Esperando a que apt/dpkg esté libre..."
    sleep 3
done
apt-get update
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# Instalar PostgreSQL y pgvector
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Instalar pgvector
apt-get install -y postgresql-16-pgvector

# Configurar firewall
ufw allow 'Nginx Full'
ufw allow 22
ufw allow 5432
ufw allow 3001
ufw --force enable



# Asegurar que SSH quede activo y configurado correctamente
# CRÍTICO: Sin SSH habilitado no se puede acceder remotamente al servidor
systemctl enable ssh
systemctl start ssh
systemctl restart ssh
# Verificar que SSH esté corriendo
systemctl status ssh --no-pager

# Configurar Nginx para el backend
cat > /etc/nginx/sites-available/backend.conf << 'EOL'
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
        proxy_pass http://localhost:3001;  # Redirige al backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Asegúrate de que las solicitudes OPTIONS lleguen al backend
        if ($request_method = 'OPTIONS') {
            proxy_pass http://localhost:3001;
        }

 	#Configuración para WebSockets (WSS)
        #proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
	proxy_cache_bypass $http_upgrade;
        #proxy_cache off;
    }
}

# Redirección de HTTP a HTTPS (backend)
server {
    listen 80;
    server_name dev-sofia-chat.sofiacall.com;

    # Redirige todo el tráfico HTTP a HTTPS
    return 301 https://$host$request_uri;
}
EOL

# Habilitar los sitios
ln -sf /etc/nginx/sites-available/backend.conf /etc/nginx/sites-enabled/backend.conf


# Verificar configuración de Nginx
nginx -t

# Instalar Certbot para SSL
apt install -y certbot python3-certbot-nginx

# Crear directorio para repositorios
mkdir -p /root/repos

# Crear directorios para Blue-Green deployment
mkdir -p /var/log/sofia-chat/blue
mkdir -p /var/log/sofia-chat/green
mkdir -p /var/log/sofia-chat/nginx
mkdir -p /opt/sofia-chat/scripts

# Configurar certificados SSL para el dominio de pruebas internas
# Nota: Se debe configurar el DNS para internal-dev-sofia-chat.sofiacall.com primero
# certbot --nginx -d internal-dev-sofia-chat.sofiacall.com --non-interactive --agree-tos --email admin@sofiacall.com

# Crear archivo de estado inicial para Blue-Green
echo "blue" > /opt/sofia-chat/.blue-green-state

# Configurar permisos para logs
chown -R www-data:www-data /var/log/sofia-chat/
chmod -R 755 /var/log/sofia-chat/

# Instalar curl si no está instalado (necesario para health checks)
apt install -y curl

# Crear configuración inicial de Nginx para pruebas internas (placeholder)
cat > /etc/nginx/sites-available/internal-backend.conf << 'INTERNAL_EOL'
# Configuración placeholder para pruebas internas
# Se actualizará dinámicamente por los scripts de Blue-Green
server {
    listen 80;
    server_name internal-dev-sofia-chat.sofiacall.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name internal-dev-sofia-chat.sofiacall.com;

    # Usar los mismos certificados por ahora
    ssl_certificate /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/privkey.pem;
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

# Restart Nginx
systemctl restart nginx

# Configurar renovación automática de certificados SSL
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Configurar health check automático cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/sofia-chat/scripts/health-check.sh check >> /var/log/sofia-chat/health-check.log 2>&1") | crontab -

echo "Setup del droplet backend con Blue-Green deployment completado"
echo "IMPORTANTE: Configurar DNS para internal-dev-sofia-chat.sofiacall.com antes de usar"
echo "Luego ejecutar: certbot --nginx -d internal-dev-sofia-chat.sofiacall.com"
# Infraestructura Unificada Converxa Chat Full Stack v2

Este directorio contiene la configuración de Terraform para desplegar la infraestructura completa (Backend + Frontend) de Converxa Chat en DigitalOcean con soporte para Blue-Green deployment.

## 🏗️ Arquitectura del Sistema

### Componentes Desplegados
- **Backend**: API con Blue-Green deployment (puertos 3002/3003)
- **Frontend**: Aplicación React/Vite servida como archivos estáticos
- **Base de Datos**: PostgreSQL con pgvector
- **Proxy Reverso**: Nginx con configuración SSL automática
- **DNS**: Configuración automática de 4 dominios

### Dominios Configurados Automáticamente

| Propósito | Dominio | Descripción |
|-----------|---------|-------------|
| **Backend Producción** | `dev-converxa-chat.converxa.com` | API en producción (Blue/Green activo) |
| **Backend Pruebas** | `internal-dev-converxa-chat.converxa.com` | API de pruebas (Blue/Green inactivo) |
| **Frontend Producción** | `app-converxa-chat.converxa.com` | App conectada al backend de producción |
| **Frontend Pruebas** | `internal-app-converxa-chat.converxa.com` | App conectada al backend de pruebas |

## 🚀 Inicio Rápido

### 1. Prerrequisitos
- Terraform v1.0+
- Cuenta DigitalOcean con API token
- SSH Key configurada en DigitalOcean
- Dominio `converxa.com` en DigitalOcean DNS

### 2. Configuración
```bash
# Copiar y configurar variables
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con tus valores
```

### 3. Despliegue Completo
```bash
# Opción 1: Script automático (recomendado)
./deploy.sh full-deploy

# Opción 2: Manual
terraform init
terraform plan
terraform apply
```

### 4. Configurar SSL
```bash
# SSL para todos los dominios
./deploy.sh ssl

# O solo para frontend
./deploy.sh ssl-frontend
```

### 5. Deploy del Frontend
```bash
# Deploy inicial del frontend
./deploy.sh frontend-deploy
```

### 6. Verificar Sistema
```bash
# Ver todas las URLs
./deploy.sh urls

# Estado del backend Blue-Green
./deploy.sh bg-status

# Estado del frontend
./deploy.sh frontend-status
```

## 📁 Estructura del Proyecto

```
infrastructure-unified/
├── main.tf                     # Configuración principal
├── variables.tf                # Variables para backend y frontend
├── outputs.tf                  # Outputs completos del sistema
├── deploy.sh                   # Script de utilidades
├── terraform.tfvars.example    # Ejemplo de configuración
├── modules/
│   ├── droplet/               # Configuración del servidor
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── setup.sh           # Setup Backend + Frontend
│   └── dns/                   # Configuración DNS (4 dominios)
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── README.md                  # Este archivo
```

## 🛠️ Comandos Disponibles

### Terraform
```bash
./deploy.sh init         # Inicializar
./deploy.sh plan         # Planificar
./deploy.sh apply        # Aplicar
./deploy.sh destroy      # Destruir
./deploy.sh full-deploy  # Todo en uno
```

### Backend (Blue-Green)
```bash
./deploy.sh bg-status    # Estado actual
./deploy.sh bg-check     # Verificar salud
```

### Frontend
```bash
./deploy.sh frontend-deploy    # Deploy completo
./deploy.sh frontend-status    # Ver estado
./deploy.sh frontend-build     # Build ambos entornos
```

### SSL y Conexión
```bash
./deploy.sh ssl          # SSL todos los dominios
./deploy.sh ssl-frontend # SSL solo frontend
./deploy.sh connect      # Conectar al servidor
./deploy.sh urls         # Ver todas las URLs
```

## ⚙️ Variables de Configuración

### Requeridas
```hcl
# DigitalOcean
do_token = "dop_v1_your_token"
ssh_key = "aa:bb:cc:dd:ee:ff:..."
private_key_path = "/path/to/ssh/key"

# Repositorios
frontend_repo_url = "https://github.com/org/converxa-chat-frontend-v2.git"
backend_repo_url = "https://github.com/org/converxa-chat-backend-v2.git"
```

### Opcionales
```hcl
# Servidor
region = "sfo3"
droplet_size = "s-2vcpu-2gb"
image = "ubuntu-24-10-x64"

# URLs de API para Frontend
frontend_prod_api_url = "https://dev-converxa-chat.converxa.com"
frontend_internal_api_url = "https://internal-dev-converxa-chat.converxa.com"
```

## 🔄 Flujo de Trabajo

### Deployment de Backend
```bash
# Desde el proyecto backend
cd ../converxa-chat-backend-v2
make deploy     # Deploy a slot inactivo
make switch     # Cambiar tráfico
```

### Deployment de Frontend
```bash
# Desde infraestructura
./deploy.sh frontend-deploy
```

### Desarrollo Diario
1. **Backend**: Push a `develop-v1` → GitHub Actions → Blue-Green deploy
2. **Frontend**: Push a `main` → Deploy manual con `frontend-deploy`

## 📊 Recursos Creados

### Servidor (1x Droplet)
- **Especificaciones**: s-2vcpu-2gb, Ubuntu 24.10
- **Software**: Docker, Nginx, PostgreSQL, Node.js
- **Blue-Green**: Scripts instalados en `/opt/converxa-chat/`
- **Frontend**: Node.js para build, archivos en `/var/www/frontend/`

### DNS (4x Registros A)
- Backend: `dev-converxa-chat` + `internal-dev-converxa-chat`
- Frontend: `app-converxa-chat` + `internal-app-converxa-chat`

### Configuración Nginx
- **Backend**: Proxy reverso a contenedores Docker
- **Frontend**: Servido como archivos estáticos con SPA support
- **SSL**: Let's Encrypt automático para todos los dominios

## 🌐 URLs del Sistema

### Después del Deploy Completo
```
🖥️  BACKEND:
   🔴 Producción: https://dev-converxa-chat.converxa.com/api/health
   🔵 Pruebas: https://internal-dev-converxa-chat.converxa.com/api/health

🌐 FRONTEND:
   🔴 Producción: https://app-converxa-chat.converxa.com
   🔵 Pruebas: https://internal-app-converxa-chat.converxa.com

🛠️  DIRECTO (desarrollo):
   Blue: http://IP:3002/api/health
   Green: http://IP:3003/api/health
```

## 🔧 Configuración del Frontend

### Build Automático
El frontend se buildea dos veces:

1. **Producción**: Conecta a `https://dev-converxa-chat.converxa.com`
2. **Pruebas**: Conecta a `https://internal-dev-converxa-chat.converxa.com`

### Variables de Entorno
```bash
# Producción
VITE_API_URL=https://dev-converxa-chat.converxa.com
VITE_ENVIRONMENT=prod

# Pruebas Internas
VITE_API_URL=https://internal-dev-converxa-chat.converxa.com
VITE_ENVIRONMENT=internal
```

### Archivos Servidos
```
/var/www/frontend/
├── prod/          # Build para producción
│   ├── index.html
│   ├── assets/
│   └── ...
└── internal/      # Build para pruebas
    ├── index.html
    ├── assets/
    └── ...
```

## 📋 Outputs Importantes

```bash
# Información del servidor
terraform output droplet_ip
terraform output ssh_connection

# URLs principales
terraform output backend_production_url
terraform output frontend_production_url

# Todas las URLs
terraform output all_urls

# Comandos útiles
terraform output deployment_commands
```

## 🔍 Troubleshooting

### Error de SSL
```bash
# Verificar certificados
./deploy.sh connect
certbot certificates

# Reconfigurar SSL
./deploy.sh ssl
```

### Frontend no carga
```bash
# Verificar archivos
./deploy.sh frontend-status

# Rebuild frontend
./deploy.sh frontend-build

# Ver logs de Nginx
./deploy.sh connect
tail -f /var/log/nginx/frontend-*
```

### Backend no responde
```bash
# Verificar Blue-Green
./deploy.sh bg-status

# Desde el backend project
make health
make rollback  # Si es necesario
```

### DNS no resuelve
```bash
# Verificar registros DNS
doctl compute domain records list converxa.com

# Verificar configuración
terraform output all_urls
```

## 🛡️ Seguridad

### Firewall (UFW)
- 22: SSH (key-based auth)
- 80/443: HTTP/HTTPS (público)
- 3002/3003: Blue-Green containers
- 5432: PostgreSQL (solo interno)

### SSL/TLS
- Let's Encrypt para todos los dominios
- Renovación automática
- HTTPS redirect configurado

### Headers de Seguridad
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

## 🎯 Ventajas del Sistema Unificado

### vs. Infraestructura Separada
- ✅ **Gestión Centralizada**: Un solo Terraform para todo
- ✅ **Costo Optimizado**: Un servidor para backend + frontend
- ✅ **Configuración Coherente**: DNS y SSL unificados
- ✅ **Deploy Coordinado**: Backend y frontend en sync

### vs. Deploy Manual
- ✅ **Automatización Completa**: Scripts instalados desde el inicio
- ✅ **Blue-Green Backend**: Zero downtime deployments
- ✅ **Frontend Multi-Environment**: Prod + testing environments
- ✅ **SSL Automático**: Certificados para todos los dominios

## 🔄 Flujo de Actualización

### Backend (Blue-Green)
1. Push a `develop-v1`
2. GitHub Actions → Blue-Green deploy
3. Test en URL de pruebas
4. Switch con `make switch`

### Frontend
1. Push a repositorio
2. `./deploy.sh frontend-deploy`
3. Actualización automática en ambos environments

### Infraestructura
1. Modificar Terraform
2. `./deploy.sh plan`
3. `./deploy.sh apply`

## 📚 Documentación Relacionada

- **Backend Blue-Green**: `../docs/flujo-blue-green-automatizado.md`
- **Arquitectura**: `../docs/ARQUITECTURA.md` 
- **Frontend Build**: Scripts en `/opt/converxa-chat/scripts/`

## 🆘 Comandos de Emergencia

### Restaurar Backend
```bash
# Desde backend project
make emergency-restore
```

### Restaurar Frontend
```bash
./deploy.sh connect
nginx -t
systemctl reload nginx
```

### Acceso de Emergencia
```bash
# SSH directo
ssh -i ~/.ssh/digitalOcean root@$(terraform output -raw droplet_ip)

# Ver todos los servicios
systemctl status docker nginx postgresql
```

---

**🎉 Sistema Full Stack completamente automatizado y listo para producción!**

**Backend + Frontend + Blue-Green + SSL + DNS = Todo en uno! 🚀**
# Infraestructura Converxa Chat Backend v2 - Blue-Green Deployment

Este directorio contiene la configuración de Terraform para desplegar la infraestructura del backend en DigitalOcean con soporte completo para Blue-Green deployment.

## 🏗️ Estructura

```
infrastructure/
├── main.tf                     # Configuración principal de Terraform
├── variables.tf                # Variables de entrada
├── outputs.tf                  # Valores de salida
├── deploy.sh                   # Script de utilidades para deployment
├── terraform.tfvars.example    # Ejemplo de variables
├── modules/
│   ├── droplet/               # Módulo para crear el droplet
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── setup.sh           # Script de configuración inicial Blue-Green
│   └── dns/                   # Módulo para configurar DNS
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── README.md                  # Este archivo
```

## 🚀 Características Blue-Green

### Lo que se Instala Automáticamente
- ✅ **Scripts Blue-Green**: Instalados permanentemente en `/opt/converxa-chat/`
- ✅ **Configuración Nginx**: Preparada para Blue-Green switching
- ✅ **Health Checks**: Monitoreo automático cada 5 minutos
- ✅ **Aliases de Comandos**: `bg-status`, `bg-deploy`, `bg-switch`, etc.
- ✅ **Dominios DNS**: Configuración automática para producción y pruebas
- ✅ **Backup Automático**: Base de datos y estado antes de cada switch

### Dominios Configurados
- `dev-converxa-chat.converxa.com` → Producción (tráfico de usuarios)
- `internal-dev-converxa-chat.converxa.com` → Pruebas internas (slot inactivo)

## 📋 Requisitos Previos

1. **Terraform instalado** (v1.0+)
2. **Cuenta de DigitalOcean** con API token
3. **SSH Key configurada** en DigitalOcean
4. **Dominio `converxa.com`** registrado en DigitalOcean DNS

## ⚡ Inicio Rápido

### 1. Configuración Inicial
```bash
cd converxa-chat-backend-v2/infrastructure

# Copiar y configurar variables
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con tus valores reales
```

### 2. Despliegue Completo
```bash
# Usando el script helper (recomendado)
./deploy.sh full-deploy

# O manualmente
terraform init
terraform plan
terraform apply
```

### 3. Configurar SSL
```bash
# Configurar SSL para ambos dominios
./deploy.sh ssl
```

### 4. Verificar Instalación
```bash
# Ver estado Blue-Green
./deploy.sh bg-status

# Ver todas las URLs
./deploy.sh urls
```

## 🛠️ Comandos Disponibles

### Script de Deploy (`./deploy.sh`)

**Comandos de Terraform:**
```bash
./deploy.sh init         # Inicializar Terraform
./deploy.sh plan         # Planificar cambios
./deploy.sh apply        # Aplicar cambios
./deploy.sh destroy      # Destruir infraestructura
./deploy.sh full-deploy  # Despliegue completo
```

**Comandos de Servidor:**
```bash
./deploy.sh info         # Información de conexión
./deploy.sh urls         # Mostrar todas las URLs
./deploy.sh ssl          # Configurar SSL (ambos dominios)
./deploy.sh connect      # Conectar via SSH
./deploy.sh status       # Verificar estado del servidor
```

**Comandos Blue-Green:**
```bash
./deploy.sh bg-status    # Estado Blue-Green deployment
```

### Desde el Proyecto Principal (`make`)
```bash
make status              # Ver estado Blue-Green
make deploy              # Desplegar nueva versión
make switch              # Cambiar tráfico (con confirmación)
make rollback            # Rollback (con confirmación)
make health              # Verificar salud de contenedores
make test-endpoints      # Probar todos los endpoints
make connect             # Conectar al servidor
```

## 📊 Recursos Creados

### 1. **Droplet (Servidor Virtual)**
- **Nombre**: `converxa-chat-backend-dev-v2`
- **Imagen**: Ubuntu 24.10 x64
- **Tamaño**: s-2vcpu-2gb (configurable)
- **Región**: sfo3 (configurable)

### 2. **Registros DNS Automáticos**
- `dev-converxa-chat.converxa.com` → IP del droplet
- `internal-dev-converxa-chat.converxa.com` → IP del droplet

### 3. **Configuración Automática del Servidor**

**Software Instalado:**
- Docker y Docker Compose
- Nginx con configuración Blue-Green
- PostgreSQL con pgvector
- Certbot para SSL automático
- Git y herramientas de desarrollo

**Blue-Green Setup:**
- Scripts en `/opt/converxa-chat/`
- Configuración Nginx dinámica
- Health checks automáticos
- Logging estructurado
- Backup automático de BD

**Puertos Configurados:**
- 80/443: Nginx (público)
- 3002: Blue container
- 3003: Green container
- 5432: PostgreSQL (interno)

## 🔧 Variables de Configuración

| Variable | Descripción | Valor por defecto | Requerido |
|----------|-------------|-------------------|-----------|
| `do_token` | Token API de DigitalOcean | - | ✅ |
| `ssh_key` | Fingerprint de SSH key | - | ✅ |
| `private_key_path` | Ruta a llave privada SSH | - | ✅ |
| `region` | Región de DigitalOcean | sfo3 | ❌ |
| `droplet_size` | Tamaño del droplet | s-2vcpu-2gb | ❌ |
| `image` | Imagen del SO | ubuntu-24-10-x64 | ❌ |

### Ejemplo de `terraform.tfvars`
```hcl
# Token de API de DigitalOcean
do_token = "dop_v1_your_token_here"

# Fingerprint de tu SSH key en DigitalOcean
ssh_key = "aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99"

# Ruta a tu llave privada SSH
private_key_path = "/home/user/.ssh/digitalOcean"

# Opcional: personalizar región y tamaño
region = "sfo3"
droplet_size = "s-2vcpu-2gb"
```

## 📤 Outputs Disponibles

Después de aplicar Terraform:

```bash
# Información básica
terraform output droplet_ip              # IP pública del droplet
terraform output ssh_connection          # Comando SSH para conectar

# URLs del sistema
terraform output production_url          # URL de producción
terraform output internal_testing_url    # URL de pruebas internas
terraform output blue_direct_url         # URL directa Blue container
terraform output green_direct_url        # URL directa Green container

# Para Blue-Green
terraform output blue_green_status       # Comando para verificar estado
```

## 🔄 Flujo de Deployment

### 1. **Servidor Nuevo (Una vez)**
```bash
# 1. Desplegar infraestructura
./deploy.sh full-deploy

# 2. Configurar SSL
./deploy.sh ssl

# 3. Verificar que todo funciona
./deploy.sh bg-status
./deploy.sh urls
```

### 2. **Desarrollo Diario**
```bash
# Desde el proyecto principal
make deploy     # Deploy a slot inactivo
make health     # Verificar que funciona
make switch     # Cambiar tráfico (con confirmación)
```

### 3. **En Caso de Problemas**
```bash
make rollback   # Rollback inmediato
make logs       # Ver logs para debugging
```

## 🎯 URLs del Sistema

Una vez desplegado, tendrás acceso a:

| Propósito | URL | Uso |
|-----------|-----|-----|
| **Producción** | `https://dev-converxa-chat.converxa.com` | Tráfico de usuarios |
| **Pruebas Internas** | `https://internal-dev-converxa-chat.converxa.com` | Probar slot inactivo |
| **Blue Directo** | `http://IP:3002/api/health` | Debug Blue container |
| **Green Directo** | `http://IP:3003/api/health` | Debug Green container |

## 🛡️ Seguridad

### Firewall Configurado
- **22**: SSH (con key-based auth)
- **80/443**: HTTP/HTTPS público
- **3002/3003**: Blue-Green containers
- **5432**: PostgreSQL (solo interno)

### SSL/TLS Automático
- Certificados Let's Encrypt
- Renovación automática
- HTTPS redirect configurado

### Acceso Seguro
- SSH key-based authentication
- PostgreSQL con acceso restringido
- Firewall UFW configurado

## 🔍 Troubleshooting

### Error de SSH Key
```bash
# Verificar SSH keys en DigitalOcean
doctl compute ssh-key list

# Verificar archivo local
ls -la ~/.ssh/
chmod 600 ~/.ssh/digitalOcean
```

### Error de DNS
```bash
# Verificar dominio en DigitalOcean
doctl compute domain list

# Verificar registros
doctl compute domain records list converxa.com
```

### Error de Provisioning
```bash
# Conectar y revisar logs
./deploy.sh connect
tail -f /var/log/cloud-init-output.log
```

### Problemas Blue-Green
```bash
# Verificar estado
./deploy.sh bg-status

# Conectar y revisar scripts
./deploy.sh connect
ls -la /opt/converxa-chat/
bg-status
```

## 📚 Documentación Adicional

- **Flujo Blue-Green Detallado**: `../docs/flujo-blue-green-automatizado.md`
- **Guía de Implementación**: `../docs/guia-implementacion-blue-green.md`
- **Arquitectura del Sistema**: `../docs/ARQUITECTURA.md`

## 🚨 Comandos de Emergencia

### Restaurar Configuración Básica
```bash
# Desde el proyecto
make emergency-restore

# O manualmente en el servidor
echo "blue" > /opt/.blue-green-state
/opt/converxa-chat/scripts/update-prod-config.sh blue
systemctl reload nginx
```

### Acceso Manual al Servidor
```bash
# Via script helper
./deploy.sh connect

# O directamente
ssh -i ~/.ssh/digitalOcean root@$(terraform output -raw droplet_ip)
```

## 🎉 Ventajas del Sistema

- ✅ **Zero Downtime**: Deployment sin interrupciones
- ✅ **Rollback Rápido**: Un comando para volver atrás
- ✅ **Testing Seguro**: Probar antes de hacer switch
- ✅ **Automatización Completa**: Scripts instalados desde el inicio
- ✅ **Monitoreo Continuo**: Health checks automáticos
- ✅ **Backup Automático**: BD y estado respaldados
- ✅ **Multi-Environment**: Producción y pruebas separadas

---

**¡Blue-Green Deployment completamente automatizado y listo para producción! 🚀**
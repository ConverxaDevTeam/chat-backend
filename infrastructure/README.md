# Infraestructura Sofia Chat Backend v2

Este directorio contiene la configuración de Terraform para desplegar la infraestructura del backend en DigitalOcean.

## Estructura

```
infrastructure/
├── main.tf                     # Configuración principal de Terraform
├── variables.tf                # Variables de entrada
├── outputs.tf                  # Valores de salida
├── terraform.tfvars.example    # Ejemplo de variables
├── .env.example               # Ejemplo de variables de entorno
├── modules/
│   ├── droplet/               # Módulo para crear el droplet
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── setup.sh           # Script de configuración inicial
│   └── dns/                   # Módulo para configurar DNS
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/              # Configuraciones por ambiente (futuro)
```

## Requisitos Previos

1. **Terraform instalado** (v1.0+)
2. **Cuenta de DigitalOcean** con API token
3. **SSH Key configurada** en DigitalOcean
4. **Dominio registrado** en DigitalOcean DNS

## Configuración Inicial

### 1. Clonar configuración

```bash
cd sofia-chat-backend-v2/infrastructure
```

### 2. Configurar variables

**Opción A: Usando terraform.tfvars**
```bash
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con tus valores
```

**Opción B: Usando variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores
source .env
```

### 3. Obtener SSH Key Fingerprint

```bash
# Listar tus SSH keys en DigitalOcean
doctl compute ssh-key list
# O desde el dashboard: Settings → Security → SSH Keys
```

## Uso

### Inicializar Terraform

```bash
terraform init
```

### Planificar cambios

```bash
terraform plan
```

### Aplicar configuración

```bash
terraform apply
```

### Destruir infraestructura

```bash
terraform destroy
```

## Recursos Creados

Esta configuración crea:

1. **Droplet** (servidor virtual)
   - Nombre: `sofia-chat-backend-dev-v2`
   - Imagen: Ubuntu 24.10 x64
   - Tamaño: s-2vcpu-2gb (por defecto)
   - Región: sfo3 (por defecto)

2. **Registro DNS**
   - Subdominio: `dev-sofia-chat.sofiacall.com`
   - Tipo: A record
   - TTL: 3600 segundos

3. **Configuración Automática**
   - Docker y Docker Compose
   - Nginx con configuración SSL
   - PostgreSQL con pgvector
   - Node.js via NVM
   - Firewall configurado
   - Certificado SSL (Let's Encrypt)

## Configuración Post-Despliegue

Después de aplicar Terraform, necesitas:

### 1. Conectarte al servidor

```bash
# El output de terraform te dará el comando SSH
ssh -i ~/.ssh/digitalOcean root@<IP_DEL_DROPLET>
```

### 2. Configurar SSL

```bash
# Obtener certificado SSL
certbot --nginx --non-interactive --agree-tos --redirect \
  --email tu-email@dominio.com -d dev-sofia-chat.sofiacall.com
```

### 3. Clonar y configurar el repositorio

```bash
cd /root/repos
git clone https://github.com/tu-usuario/sofia-chat-backend-v2.git
cd sofia-chat-backend-v2

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las configuraciones de producción
```

### 4. Construir y ejecutar

```bash
docker-compose build
docker-compose up -d
```

## Variables Importantes

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `do_token` | Token API de DigitalOcean | - |
| `ssh_key` | Fingerprint de SSH key | - |
| `region` | Región de DigitalOcean | sfo3 |
| `droplet_size` | Tamaño del droplet | s-2vcpu-2gb |
| `image` | Imagen del SO | ubuntu-24-10-x64 |
| `private_key_path` | Ruta a llave privada SSH | - |

## Outputs

Después de aplicar Terraform, obtienes:

- `droplet_ip`: IP pública del droplet
- `droplet_id`: ID del droplet en DigitalOcean
- `dns_record_fqdn`: FQDN completo del DNS
- `ssh_connection`: Comando SSH para conectar

## Troubleshooting

### Error de SSH Key
```bash
# Verificar que la SSH key existe en DigitalOcean
doctl compute ssh-key list

# Verificar que la ruta de la llave privada es correcta
ls -la ~/.ssh/
```

### Error de DNS
```bash
# Verificar que el dominio está en DigitalOcean
doctl compute domain list

# Verificar registros DNS
doctl compute domain records list sofiacall.com
```

### Error de provisioning
```bash
# Conectar manualmente y revisar logs
ssh -i ~/.ssh/digitalOcean root@<IP>
tail -f /var/log/cloud-init-output.log
```

## Siguientes Pasos

Esta infraestructura está preparada para:

1. **Blue-Green Deployment**: Configuración multi-contenedor
2. **Monitoring**: Integración con herramientas de monitoreo
3. **Backup**: Configuración de respaldos automáticos
4. **Scaling**: Escalamiento horizontal con load balancer

## Seguridad

- Firewall configurado (puertos 22, 80, 443, 3001, 5432)
- SSL/TLS automático con Let's Encrypt
- SSH key-based authentication
- Postgres con acceso restringido
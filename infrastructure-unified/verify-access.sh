#!/bin/bash

# =================================================================
# SCRIPT DE VERIFICACIÓN Y SOLUCIÓN DE ACCESO A DIGITALOCEAN
# =================================================================
# Este script ayuda a diagnosticar y solucionar problemas de acceso
# a los recursos de DigitalOcean desde la consola web
# =================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "terraform.tfvars" ]; then
    error "Este script debe ejecutarse desde el directorio infrastructure-unified"
    exit 1
fi

# Función para verificar terraform
check_terraform() {
    log "Verificando configuración de Terraform..."

    if ! command -v terraform &> /dev/null; then
        error "Terraform no está instalado"
        exit 1
    fi

    terraform --version

    if [ ! -f "terraform.tfstate" ]; then
        error "No se encuentra terraform.tfstate. La infraestructura no está desplegada."
        exit 1
    fi

    log "✅ Terraform configurado correctamente"
}

# Función para obtener información del droplet
get_droplet_info() {
    log "Obteniendo información del droplet..."

    # Obtener información básica del droplet
    DROPLET_ID=$(terraform output -raw droplet_id 2>/dev/null || echo "N/A")
    DROPLET_IP=$(terraform output -raw droplet_ip 2>/dev/null || echo "N/A")
    PROJECT_ID=$(terraform show | grep -A 5 "digitalocean_project_resources" | grep "project" | head -1 | awk '{print $3}' | tr -d '"' || echo "N/A")

    echo "========================================"
    echo "   INFORMACIÓN DEL DROPLET ACTUAL"
    echo "========================================"
    echo "🆔 Droplet ID: $DROPLET_ID"
    echo "🌐 IP Address: $DROPLET_IP"
    echo "📁 Project ID: $PROJECT_ID"
    echo "📍 Region: $(terraform output -json | jq -r '.deployment_commands.value.ssh_connect' | grep -o 'sfo3\|nyc1\|ams3\|sgp1\|lon1\|fra1\|tor1\|blr1' || echo 'sfo3')"
    echo "========================================"

    # Verificar si el droplet está corriendo
    info "Verificando estado del droplet..."
    if ssh -i /home/frank/.ssh/converxa_digitalocean -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH OK'" 2>/dev/null; then
        echo "✅ Droplet accesible via SSH"
    else
        warn "❌ Droplet no accesible via SSH"
    fi
}

# Función para verificar con doctl
check_with_doctl() {
    log "Verificando con doctl (DigitalOcean CLI)..."

    if ! command -v doctl &> /dev/null; then
        warn "doctl no está instalado. Instalando..."

        # Detectar sistema operativo
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            wget -O doctl.tar.gz https://github.com/digitalocean/doctl/releases/latest/download/doctl-*-linux-amd64.tar.gz
            tar xf doctl.tar.gz
            sudo mv doctl /usr/local/bin
            rm doctl.tar.gz
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install doctl
        else
            error "Sistema operativo no soportado para instalación automática de doctl"
            echo "Por favor instala doctl manualmente: https://docs.digitalocean.com/reference/doctl/how-to/install/"
            return 1
        fi
    fi

    # Configurar doctl si no está configurado
    if ! doctl auth list 2>/dev/null | grep -q "default"; then
        warn "doctl no está autenticado. Configurando..."
        DO_TOKEN=$(grep "do_token" terraform.tfvars | cut -d'"' -f2)
        if [ -n "$DO_TOKEN" ]; then
            echo "$DO_TOKEN" | doctl auth init --context default
        else
            error "No se pudo obtener el token de DigitalOcean desde terraform.tfvars"
            return 1
        fi
    fi

    # Verificar droplets
    log "Listando todos los droplets en tu cuenta..."
    doctl compute droplet list --format "ID,Name,PublicIPv4,Status,Region,Size,Created"

    # Verificar proyectos
    log "Listando todos los proyectos..."
    doctl projects list --format "ID,Name,Purpose,Environment,IsDefault"

    # Buscar nuestro droplet específico
    DROPLET_ID=$(terraform output -raw droplet_id 2>/dev/null)
    if [ "$DROPLET_ID" != "N/A" ] && [ -n "$DROPLET_ID" ]; then
        log "Buscando droplet específico: $DROPLET_ID"
        doctl compute droplet get $DROPLET_ID --format "ID,Name,PublicIPv4,Status,Region,Size,Tags,Created" || warn "Droplet no encontrado con doctl"
    fi
}

# Función para verificar el proyecto
check_project_assignment() {
    log "Verificando asignación del proyecto..."

    # Obtener el project ID desde terraform
    PROJECT_ID=$(terraform show | grep -A 5 "digitalocean_project_resources" | grep "project" | head -1 | awk '{print $3}' | tr -d '"')

    if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
        info "Proyecto asignado: $PROJECT_ID"

        # Verificar recursos del proyecto
        if command -v doctl &> /dev/null; then
            log "Recursos en el proyecto:"
            doctl projects resources list $PROJECT_ID --format "URN,Status,CreatedAt" || warn "No se pudieron listar los recursos del proyecto"
        fi
    else
        warn "No se encontró asignación de proyecto en Terraform"
    fi
}

# Función para generar comandos de troubleshooting
generate_troubleshooting_commands() {
    log "Generando comandos de troubleshooting..."

    DROPLET_ID=$(terraform output -raw droplet_id 2>/dev/null)
    DROPLET_IP=$(terraform output -raw droplet_ip 2>/dev/null)

    echo "========================================"
    echo "   COMANDOS DE TROUBLESHOOTING"
    echo "========================================"
    echo ""
    echo "🔍 VERIFICAR EN DIGITALOCEAN CONSOLE:"
    echo "   1. Ve a: https://cloud.digitalocean.com/projects"
    echo "   2. Busca el proyecto 'Clones'"
    echo "   3. Si no lo ves, verifica que tengas permisos"
    echo "   4. Droplet ID a buscar: $DROPLET_ID"
    echo ""
    echo "🛠️ COMANDOS ÚTILES:"
    echo "   # Conectar al servidor"
    echo "   ssh -i /home/frank/.ssh/converxa_digitalocean root@$DROPLET_IP"
    echo ""
    echo "   # Ver estado de containers"
    echo "   ssh -i /home/frank/.ssh/converxa_digitalocean root@$DROPLET_IP '/opt/sofia-chat/blue-green-simple.sh status'"
    echo ""
    echo "   # Verificar servicios"
    echo "   ssh -i /home/frank/.ssh/converxa_digitalocean root@$DROPLET_IP 'systemctl status docker nginx postgresql'"
    echo ""
    echo "   # Ver información del sistema"
    echo "   ssh -i /home/frank/.ssh/converxa_digitalocean root@$DROPLET_IP 'df -h && free -h && docker ps'"
    echo ""
    echo "🌐 URLs DE VERIFICACIÓN:"
    terraform output -json all_urls | jq -r 'to_entries[] | "   \(.key): \(.value)"'
    echo ""
    echo "📋 COMANDOS DE TERRAFORM:"
    echo "   # Ver todos los outputs"
    echo "   terraform output"
    echo ""
    echo "   # Ver estado completo"
    echo "   terraform show"
    echo ""
    echo "   # Planificar cambios"
    echo "   terraform plan"
    echo "========================================"
}

# Función para verificar URLs
test_urls() {
    log "Probando URLs del sistema..."

    # URLs directas (sin SSL)
    DROPLET_IP=$(terraform output -raw droplet_ip 2>/dev/null)

    echo "🧪 PROBANDO URLs DIRECTAS:"
    test_url "http://$DROPLET_IP:3002/api/health" "Blue Container"
    test_url "http://$DROPLET_IP:3003/api/health" "Green Container"

    echo ""
    echo "🧪 PROBANDO URLs CON DOMINIO:"
    test_url "https://back-chat.converxa.com/api/health" "Backend Production"
    test_url "https://internal-back-chat.converxa.com/api/health" "Backend Internal"
    test_url "https://app-chat.converxa.com" "Frontend Production"
    test_url "https://internal-app.converxa.com" "Frontend Internal"
}

test_url() {
    local url=$1
    local name=$2

    printf "   %-25s " "$name:"

    if curl -s --max-time 10 --head "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

# Función para reparar asignación de proyecto
repair_project_assignment() {
    log "Intentando reparar asignación de proyecto..."

    warn "Esto recreará la asignación de recursos al proyecto"
    read -p "¿Deseas continuar? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remover y recrear la asignación de proyecto
        terraform state rm digitalocean_project_resources.converxa_resources[0] 2>/dev/null || true
        terraform apply -target=digitalocean_project_resources.converxa_resources[0] -auto-approve

        log "✅ Asignación de proyecto reparada"
    else
        info "Operación cancelada"
    fi
}

# Función principal
main() {
    echo ""
    echo "================================================================="
    echo "   🔍 VERIFICADOR DE ACCESO A DIGITALOCEAN - CONVERXA BACKEND"
    echo "================================================================="
    echo ""

    case "${1:-help}" in
        "check")
            check_terraform
            get_droplet_info
            check_with_doctl
            check_project_assignment
            ;;
        "test-urls")
            test_urls
            ;;
        "troubleshoot")
            check_terraform
            get_droplet_info
            generate_troubleshooting_commands
            ;;
        "repair-project")
            repair_project_assignment
            ;;
        "full")
            check_terraform
            get_droplet_info
            check_with_doctl
            check_project_assignment
            test_urls
            generate_troubleshooting_commands
            ;;
        "help"|*)
            echo "Uso: $0 [comando]"
            echo ""
            echo "Comandos disponibles:"
            echo "  check           - Verificar configuración básica"
            echo "  test-urls       - Probar todas las URLs del sistema"
            echo "  troubleshoot    - Generar información de diagnóstico"
            echo "  repair-project  - Reparar asignación de proyecto"
            echo "  full            - Ejecutar todas las verificaciones"
            echo "  help            - Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 check        # Verificación rápida"
            echo "  $0 full         # Diagnóstico completo"
            echo "  $0 test-urls    # Solo probar URLs"
            echo ""
            ;;
    esac

    echo ""
    log "✅ Verificación completada"
    echo ""
}

# Ejecutar función principal
main "$@"

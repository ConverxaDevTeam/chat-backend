#!/bin/bash

# Script de utilidades para infraestructura Sofia Chat Backend v2
# Uso: ./deploy.sh [comando] [opciones]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar requisitos
check_requirements() {
    log_info "Verificando requisitos..."
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform no está instalado"
        exit 1
    fi
    
    if ! command -v doctl &> /dev/null; then
        log_warning "doctl no está instalado (opcional para debugging)"
    fi
    
    if [ ! -f "terraform.tfvars" ] && [ -z "$TF_VAR_do_token" ]; then
        log_error "No se encontró terraform.tfvars ni variables de entorno"
        log_info "Ejecuta: cp terraform.tfvars.example terraform.tfvars"
        exit 1
    fi
    
    log_success "Requisitos verificados"
}

# Inicializar Terraform
init() {
    log_info "Inicializando Terraform..."
    terraform init
    log_success "Terraform inicializado"
}

# Validar configuración
validate() {
    log_info "Validando configuración..."
    terraform validate
    terraform fmt -check=true
    log_success "Configuración válida"
}

# Planificar cambios
plan() {
    log_info "Planificando cambios..."
    terraform plan -out=tfplan
    log_success "Plan generado en tfplan"
}

# Aplicar cambios
apply() {
    log_info "Aplicando cambios..."
    if [ -f "tfplan" ]; then
        terraform apply tfplan
        rm -f tfplan
    else
        terraform apply
    fi
    log_success "Infraestructura desplegada"
    
    # Mostrar información de conexión
    show_connection_info
}

# Destruir infraestructura
destroy() {
    log_warning "¡ADVERTENCIA! Esto destruirá toda la infraestructura"
    read -p "¿Estás seguro? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log_info "Destruyendo infraestructura..."
        terraform destroy
        log_success "Infraestructura destruida"
    else
        log_info "Operación cancelada"
    fi
}

# Mostrar información de conexión
show_connection_info() {
    log_info "Información de conexión:"
    
    if terraform output droplet_ip &> /dev/null; then
        IP=$(terraform output -raw droplet_ip)
        FQDN=$(terraform output -raw dns_record_fqdn)
        SSH_CMD=$(terraform output -raw ssh_connection)
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🖥️  IP del Droplet: $IP"
        echo "🌐 FQDN: $FQDN"
        echo "🔑 Conexión SSH: $SSH_CMD"
        echo "📝 Configurar SSL: certbot --nginx -d $FQDN --non-interactive --agree-tos --email tu-email@dominio.com"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        log_warning "No se pudo obtener la información del droplet"
    fi
}

# Configurar SSL en el servidor
setup_ssl() {
    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet. ¿Está desplegada la infraestructura?"
        exit 1
    fi
    
    read -p "Ingresa tu email para Let's Encrypt: " email
    
    if [ -z "$email" ]; then
        log_error "Email es requerido"
        exit 1
    fi
    
    SSH_CMD=$(terraform output -raw ssh_connection)
    FQDN=$(terraform output -raw dns_record_fqdn)
    
    log_info "Configurando SSL en el servidor..."
    
    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | sed 's/root@//' | awk '{print $1}') \
        "certbot --nginx -d $FQDN --non-interactive --agree-tos --email $email --redirect"
    
    log_success "SSL configurado exitosamente"
}

# Conectar al servidor
connect() {
    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet"
        exit 1
    fi
    
    SSH_CMD=$(terraform output -raw ssh_connection)
    log_info "Conectando al servidor..."
    eval $SSH_CMD
}

# Verificar estado del servidor
status() {
    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet"
        exit 1
    fi
    
    IP=$(terraform output -raw droplet_ip)
    FQDN=$(terraform output -raw dns_record_fqdn)
    
    log_info "Verificando estado del servidor..."
    
    # Verificar conectividad
    if ping -c 1 $IP &> /dev/null; then
        log_success "Servidor accesible via IP"
    else
        log_error "Servidor no accesible via IP"
    fi
    
    # Verificar DNS
    if nslookup $FQDN &> /dev/null; then
        log_success "DNS resuelve correctamente"
    else
        log_error "DNS no resuelve"
    fi
    
    # Verificar puertos
    if nc -z $IP 80; then
        log_success "Puerto 80 (HTTP) abierto"
    else
        log_warning "Puerto 80 (HTTP) cerrado"
    fi
    
    if nc -z $IP 443; then
        log_success "Puerto 443 (HTTPS) abierto"
    else
        log_warning "Puerto 443 (HTTPS) cerrado"
    fi
    
    if nc -z $IP 3001; then
        log_success "Puerto 3001 (Backend) abierto"
    else
        log_warning "Puerto 3001 (Backend) cerrado"
    fi
}

# Mostrar ayuda
show_help() {
    echo "Script de utilidades para infraestructura Sofia Chat Backend v2"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  init         Inicializar Terraform"
    echo "  validate     Validar configuración"
    echo "  plan         Planificar cambios"
    echo "  apply        Aplicar cambios"
    echo "  destroy      Destruir infraestructura"
    echo "  info         Mostrar información de conexión"
    echo "  ssl          Configurar certificado SSL"
    echo "  connect      Conectar al servidor via SSH"
    echo "  status       Verificar estado del servidor"
    echo "  full-deploy  Despliegue completo (init + plan + apply)"
    echo "  help         Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 full-deploy    # Despliegue completo"
    echo "  $0 connect        # Conectar al servidor"
    echo "  $0 ssl            # Configurar SSL"
    echo "  $0 status         # Verificar estado"
}

# Despliegue completo
full_deploy() {
    log_info "Iniciando despliegue completo..."
    check_requirements
    init
    validate
    plan
    apply
    log_success "Despliegue completo finalizado"
}

# Función principal
main() {
    case "${1:-help}" in
        "init")
            check_requirements
            init
            ;;
        "validate")
            check_requirements
            validate
            ;;
        "plan")
            check_requirements
            plan
            ;;
        "apply")
            check_requirements
            apply
            ;;
        "destroy")
            check_requirements
            destroy
            ;;
        "info")
            show_connection_info
            ;;
        "ssl")
            setup_ssl
            ;;
        "connect")
            connect
            ;;
        "status")
            status
            ;;
        "full-deploy")
            full_deploy
            ;;
        "help"|"-h"|"--help")
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
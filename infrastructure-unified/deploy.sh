#!/bin/bash

# Script de utilidades para infraestructura Converxa Chat Backend v2
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

        if nc -z $IP 3002; then
            log_success "Puerto 3002 (Blue) abierto"
        else
            log_warning "Puerto 3002 (Blue) cerrado"
        fi

        if nc -z $IP 3003; then
            log_success "Puerto 3003 (Green) abierto"
        else
            log_warning "Puerto 3003 (Green) cerrado"
        fi
    }

    # Verificar estado Blue-Green
    check_blue_green() {
        log_info "Verificando estado Blue-Green deployment..."

        if ! terraform output droplet_ip &> /dev/null; then
            log_error "No se encontró información del droplet"
            exit 1
        fi

        SSH_CMD=$(terraform output -raw ssh_connection)

        log_info "Ejecutando verificación Blue-Green en el servidor..."

        ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
            '/opt/converxa-chat/blue-green-simple.sh status'
    }

    # Configurar certificados SSL para todos los dominios
    setup_ssl() {
        log_info "Configurando SSL para todos los dominios..."

        if ! terraform output droplet_ip &> /dev/null; then
            log_error "No se encontró información del droplet"
            exit 1
        fi

        read -p "Ingresa tu email para Let's Encrypt: " email

        if [ -z "$email" ]; then
            log_error "Email es requerido"
            exit 1
        fi

        SSH_CMD=$(terraform output -raw ssh_connection)

        # Dominios Backend
        BACKEND_PROD_FQDN=$(terraform output -raw dns_record_fqdn)
        BACKEND_INTERNAL_FQDN=$(terraform output -raw internal_dns_record_fqdn)

        # Dominios Frontend
        FRONTEND_PROD_FQDN=$(terraform output -raw frontend_dns_record_fqdn)
        FRONTEND_INTERNAL_FQDN=$(terraform output -raw internal_frontend_dns_record_fqdn)

        log_info "Configurando SSL para backend producción: $BACKEND_PROD_FQDN"
        ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
            "certbot --nginx -d $BACKEND_PROD_FQDN --non-interactive --agree-tos --email $email"

        log_info "Configurando SSL para backend interno: $BACKEND_INTERNAL_FQDN"
        ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
            "certbot --nginx -d $BACKEND_INTERNAL_FQDN --non-interactive --agree-tos --email $email"

        log_info "Configurando SSL para frontend producción: $FRONTEND_PROD_FQDN"
        ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
            "certbot --nginx -d $FRONTEND_PROD_FQDN --non-interactive --agree-tos --email $email"

        log_info "Configurando SSL para frontend interno: $FRONTEND_INTERNAL_FQDN"
        ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
            "certbot --nginx -d $FRONTEND_INTERNAL_FQDN --non-interactive --agree-tos --email $email"

        log_success "SSL configurado exitosamente para todos los dominios"
    }

    # Mostrar URLs completas
show_urls() {
    log_info "URLs del sistema:"

    if terraform output all_urls &> /dev/null; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🌐 URLs del Sistema Full Stack:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🖥️  BACKEND:"
        echo "   🔴 Producción: $(terraform output -raw backend_production_url)/api/health"
        echo "   🔵 Pruebas Internas: $(terraform output -raw backend_internal_testing_url)/api/health"
        echo "   🟦 Blue (directo): $(terraform output -raw blue_direct_url)"
        echo "   🟩 Green (directo): $(terraform output -raw green_direct_url)"
        echo ""
        echo "🌐 FRONTEND:"
        echo "   🔴 Producción: $(terraform output -raw frontend_production_url)"
        echo "   🔵 Pruebas Internas: $(terraform output -raw frontend_internal_testing_url)"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📋 Comandos disponibles:"
        echo "  ./deploy.sh bg-status        - Ver estado Backend Blue-Green"
        echo "  ./deploy.sh frontend-deploy  - Deploy Frontend"
        echo "  ./deploy.sh frontend-status  - Estado Frontend"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        log_error "No se encontró información de URLs. ¿Está desplegada la infraestructura?"
    fi
}

# Deploy del frontend
frontend_deploy() {
    log_info "Desplegando frontend..."

    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet"
        exit 1
    fi

    SSH_CMD=$(terraform output -raw ssh_connection)

    log_info "Ejecutando deploy del frontend en el servidor..."

    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
        '/opt/converxa-chat/scripts/frontend-deploy.sh'

    log_success "Deploy del frontend completado"
}

# Estado del frontend
frontend_status() {
    log_info "Verificando estado del frontend..."

    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet"
        exit 1
    fi

    SSH_CMD=$(terraform output -raw ssh_connection)

    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
        'frontend-status && echo "" && echo "=== CONFIGURACIÓN NGINX ===" && nginx -T | grep -A 10 -B 2 "app-converxa-chat"'
}

# Build del frontend
frontend_build() {
    log_info "Buildeando frontend para ambos entornos..."

    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet"
        exit 1
    fi

    SSH_CMD=$(terraform output -raw ssh_connection)

    log_info "Ejecutando build para producción..."
    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
        '/opt/converxa-chat/scripts/frontend-build.sh prod'

    log_info "Ejecutando build para pruebas internas..."
    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
        '/opt/converxa-chat/scripts/frontend-build.sh internal'

    log_success "Build del frontend completado"
}

# Configurar SSL para frontend
setup_ssl_frontend() {
    log_info "Configurando SSL solo para dominios frontend..."

    if ! terraform output droplet_ip &> /dev/null; then
        log_error "No se encontró información del droplet"
        exit 1
    fi

    read -p "Ingresa tu email para Let's Encrypt: " email

    if [ -z "$email" ]; then
        log_error "Email es requerido"
        exit 1
    fi

    SSH_CMD=$(terraform output -raw ssh_connection)
    FRONTEND_PROD_FQDN=$(terraform output -raw frontend_dns_record_fqdn)
    FRONTEND_INTERNAL_FQDN=$(terraform output -raw internal_frontend_dns_record_fqdn)

    log_info "Configurando SSL para frontend producción: $FRONTEND_PROD_FQDN"

    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
        "certbot --nginx -d $FRONTEND_PROD_FQDN --non-interactive --agree-tos --email $email"

    log_info "Configurando SSL para frontend interno: $FRONTEND_INTERNAL_FQDN"

    ssh -o StrictHostKeyChecking=no $(echo $SSH_CMD | sed 's/ssh //' | sed 's/-i [^ ]* //' | awk '{print "-i " $2 " " $3}') \
        "certbot --nginx -d $FRONTEND_INTERNAL_FQDN --non-interactive --agree-tos --email $email"

    log_success "SSL configurado exitosamente para dominios frontend"
}

# Mostrar ayuda
show_help() {
echo "Script de utilidades para infraestructura Converxa Chat Full Stack v2"
echo ""
echo "Uso: $0 [comando]"
echo ""
echo "Comandos de Terraform:"
echo "  init         Inicializar Terraform"
echo "  validate     Validar configuración"
echo "  plan         Planificar cambios"
echo "  apply        Aplicar cambios"
echo "  destroy      Destruir infraestructura"
echo "  full-deploy  Despliegue completo (init + plan + apply)"
echo ""
echo "Comandos de Servidor:"
echo "  info         Mostrar información de conexión"
echo "  urls         Mostrar todas las URLs del sistema"
echo "  ssl          Configurar certificados SSL (todos los dominios)"
echo "  ssl-frontend Configurar SSL solo para dominios frontend"
echo "  connect      Conectar al servidor via SSH"
echo "  status       Verificar estado del servidor"
echo ""
echo "Comandos Blue-Green Backend:"
echo "  bg-status    Verificar estado Blue-Green deployment"
echo "  bg-check     Verificar estado Blue-Green deployment"
echo ""
echo "Comandos Frontend:"
echo "  frontend-deploy    Deploy completo del frontend"
echo "  frontend-status    Ver estado del frontend"
echo "  frontend-build     Build frontend (ambos entornos)"
echo ""
echo "Ejemplos:"
echo "  $0 full-deploy       # Despliegue completo desde cero"
echo "  $0 ssl               # Configurar SSL para todos los dominios"
echo "  $0 frontend-deploy   # Deploy solo frontend"
echo "  $0 urls              # Ver todas las URLs disponibles"
echo "  $0 bg-status         # Ver estado Blue-Green"
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
        "urls")
            show_urls
            ;;
        "ssl")
            setup_ssl
            ;;
        "ssl-frontend")
            setup_ssl_frontend
            ;;
        "connect")
            connect
            ;;
        "status")
            status
            ;;
        "bg-status"|"bg-check")
            check_blue_green
            ;;
        "frontend-deploy")
            frontend_deploy
            ;;
        "frontend-status")
            frontend_status
            ;;
        "frontend-build")
            frontend_build
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

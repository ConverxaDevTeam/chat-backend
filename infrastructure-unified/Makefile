# Makefile para Converxa Full Stack v2 - Infraestructura Unificada
# Gestiona Backend (Blue-Green) + Frontend + Infraestructura

# Configuración del servidor
SSH_HOST := 137.184.44.230
SSH_USER := root
SSH_KEY := ~/.ssh/digitalOcean
TERRAFORM_DIR := .
BACKEND_PROJECT_DIR := ../

# Colores para output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
BLUE := \033[0;34m
NC := \033[0m # No Color

.PHONY: help init plan apply destroy info urls connect status
.PHONY: ssl ssl-frontend
.PHONY: bg-status bg-deploy bg-switch bg-rollback bg-cleanup bg-health
.PHONY: frontend-deploy frontend-status frontend-build
.PHONY: full-deploy full-status test-all emergency

# Comando por defecto
help:
	@echo "$(GREEN)Converxa Full Stack v2 - Infraestructura Unificada$(NC)"
	@echo ""
	@echo "$(YELLOW)🏗️  COMANDOS DE TERRAFORM:$(NC)"
	@echo "  make init             - Inicializar Terraform"
	@echo "  make plan             - Planificar cambios"
	@echo "  make apply            - Aplicar configuración"
	@echo "  make destroy          - Destruir infraestructura"
	@echo "  make full-deploy      - Despliegue completo desde cero"
	@echo ""
	@echo "$(YELLOW)🖥️  COMANDOS DE BACKEND (Blue-Green):$(NC)"
	@echo "  make bg-status        - Ver estado Blue-Green"
	@echo "  make bg-deploy        - Deploy a slot inactivo"
	@echo "  make bg-switch        - Cambiar tráfico (con confirmación)"
	@echo "  make bg-rollback      - Rollback (con confirmación)"
	@echo "  make bg-cleanup       - Limpiar slot inactivo"
	@echo "  make bg-health        - Verificar salud de contenedores"
	@echo ""
	@echo "$(YELLOW)🌐 COMANDOS DE FRONTEND:$(NC)"
	@echo "  make frontend-deploy  - Deploy completo del frontend"
	@echo "  make frontend-status  - Ver estado del frontend"
	@echo "  make frontend-build   - Build para ambos entornos"
	@echo ""
	@echo "$(YELLOW)🔐 COMANDOS DE SSL:$(NC)"
	@echo "  make ssl              - Configurar SSL (todos los dominios)"
	@echo "  make ssl-frontend     - Configurar SSL (solo frontend)"
	@echo ""
	@echo "$(YELLOW)📊 COMANDOS DE INFORMACIÓN:$(NC)"
	@echo "  make info             - Información de conexión"
	@echo "  make urls             - Ver todas las URLs"
	@echo "  make status           - Estado general del sistema"
	@echo "  make connect          - Conectar al servidor"
	@echo ""
	@echo "$(YELLOW)🧪 COMANDOS DE TESTING:$(NC)"
	@echo "  make test-all         - Probar todos los endpoints"
	@echo "  make full-status      - Estado completo del sistema"
	@echo ""
	@echo "$(YELLOW)🆘 COMANDOS DE EMERGENCIA:$(NC)"
	@echo "  make emergency        - Restaurar configuración básica"
	@echo ""
	@echo "$(GREEN)📋 FLUJO TÍPICO:$(NC)"
	@echo "  1. make full-deploy   # Despliegue inicial completo"
	@echo "  2. make ssl           # Configurar certificados SSL"
	@echo "  3. make frontend-deploy # Deploy inicial del frontend"
	@echo "  4. make test-all      # Verificar que todo funciona"
	@echo ""
	@echo "$(GREEN)🔄 FLUJO DIARIO:$(NC)"
	@echo "  - Backend: cd $(BACKEND_PROJECT_DIR) && make deploy && make switch"
	@echo "  - Frontend: make frontend-deploy"

# ========================================
# COMANDOS DE TERRAFORM
# ========================================

init:
	@echo "$(GREEN)Inicializando Terraform...$(NC)"
	@cd $(TERRAFORM_DIR) && terraform init

plan:
	@echo "$(GREEN)Planificando cambios...$(NC)"
	@cd $(TERRAFORM_DIR) && terraform plan

apply:
	@echo "$(GREEN)Aplicando configuración...$(NC)"
	@cd $(TERRAFORM_DIR) && terraform apply

destroy:
	@echo "$(RED)⚠️  ADVERTENCIA: Esto destruirá toda la infraestructura$(NC)"
	@echo "¿Estás seguro de que quieres destruir? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(RED)Destruyendo infraestructura...$(NC)"; \
		cd $(TERRAFORM_DIR) && terraform destroy; \
	else \
		echo "$(GREEN)Operación cancelada$(NC)"; \
	fi

full-deploy:
	@echo "$(GREEN)Iniciando despliegue completo...$(NC)"
	@$(MAKE) init
	@$(MAKE) plan
	@$(MAKE) apply
	@echo "$(GREEN)✅ Despliegue de infraestructura completado$(NC)"
	@echo "$(YELLOW)Siguiente: make ssl && make frontend-deploy$(NC)"

# ========================================
# COMANDOS DE BACKEND (Blue-Green)
# ========================================

bg-status:
	@echo "$(GREEN)Consultando estado Blue-Green...$(NC)"
	@./deploy.sh bg-status

bg-deploy:
	@echo "$(GREEN)Desplegando a slot inactivo...$(NC)"
	@cd $(BACKEND_PROJECT_DIR) && make deploy

bg-switch:
	@echo "$(YELLOW)⚠️  ADVERTENCIA: Esto cambiará el tráfico de producción$(NC)"
	@echo "¿Estás seguro de que quieres hacer switch? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Ejecutando switch...$(NC)"; \
		cd $(BACKEND_PROJECT_DIR) && make switch; \
	else \
		echo "$(RED)Switch cancelado$(NC)"; \
	fi

bg-rollback:
	@echo "$(RED)⚠️  ADVERTENCIA: Esto hará rollback de producción$(NC)"
	@echo "¿Estás seguro de que quieres hacer rollback? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Ejecutando rollback...$(NC)"; \
		cd $(BACKEND_PROJECT_DIR) && make rollback; \
	else \
		echo "$(RED)Rollback cancelado$(NC)"; \
	fi

bg-cleanup:
	@echo "$(GREEN)Limpiando slot inactivo...$(NC)"
	@cd $(BACKEND_PROJECT_DIR) && make cleanup

bg-health:
	@echo "$(GREEN)Verificando salud de contenedores Backend...$(NC)"
	@cd $(BACKEND_PROJECT_DIR) && make health

# ========================================
# COMANDOS DE FRONTEND
# ========================================

frontend-deploy:
	@echo "$(GREEN)Desplegando Frontend...$(NC)"
	@./deploy.sh frontend-deploy

frontend-status:
	@echo "$(GREEN)Consultando estado del Frontend...$(NC)"
	@./deploy.sh frontend-status

frontend-build:
	@echo "$(GREEN)Buildeando Frontend para ambos entornos...$(NC)"
	@./deploy.sh frontend-build

# ========================================
# COMANDOS DE SSL
# ========================================

ssl:
	@echo "$(GREEN)Configurando SSL para todos los dominios...$(NC)"
	@./deploy.sh ssl

ssl-frontend:
	@echo "$(GREEN)Configurando SSL para dominios Frontend...$(NC)"
	@./deploy.sh ssl-frontend

# ========================================
# COMANDOS DE INFORMACIÓN
# ========================================

info:
	@echo "$(GREEN)Información de conexión...$(NC)"
	@./deploy.sh info

urls:
	@echo "$(GREEN)URLs del sistema...$(NC)"
	@./deploy.sh urls

status:
	@echo "$(GREEN)Estado general del sistema...$(NC)"
	@./deploy.sh status

connect:
	@echo "$(GREEN)Conectando al servidor...$(NC)"
	@./deploy.sh connect

# ========================================
# COMANDOS DE TESTING
# ========================================

test-all:
	@echo "$(GREEN)Probando todos los endpoints...$(NC)"
	@echo ""
	@echo "$(BLUE)🧪 Testing Backend Endpoints:$(NC)"
	@cd $(BACKEND_PROJECT_DIR) && make test-endpoints
	@echo ""
	@echo "$(BLUE)🧪 Testing Frontend URLs:$(NC)"
	@echo "Verificando frontend..."
	@if command -v curl >/dev/null 2>&1; then \
		echo -n "Frontend Prod: "; \
		if curl -s -o /dev/null -w "%{http_code}" $$(terraform output -raw frontend_production_url) | grep -q "200"; then \
			echo "$(GREEN)✅ OK$(NC)"; \
		else \
			echo "$(RED)❌ FAIL$(NC)"; \
		fi; \
		echo -n "Frontend Internal: "; \
		if curl -s -o /dev/null -w "%{http_code}" $$(terraform output -raw frontend_internal_testing_url) | grep -q "200"; then \
			echo "$(GREEN)✅ OK$(NC)"; \
		else \
			echo "$(RED)❌ FAIL$(NC)"; \
		fi; \
	else \
		echo "$(YELLOW)curl no disponible, saltando test de frontend$(NC)"; \
	fi

full-status:
	@echo "$(GREEN)Estado completo del sistema...$(NC)"
	@echo ""
	@echo "$(BLUE)📊 Terraform Status:$(NC)"
	@cd $(TERRAFORM_DIR) && terraform output
	@echo ""
	@echo "$(BLUE)📊 Backend Status:$(NC)"
	@$(MAKE) bg-status
	@echo ""
	@echo "$(BLUE)📊 Frontend Status:$(NC)"
	@$(MAKE) frontend-status
	@echo ""
	@echo "$(BLUE)📊 URLs:$(NC)"
	@$(MAKE) urls

# ========================================
# COMANDOS DE EMERGENCIA
# ========================================

emergency:
	@echo "$(RED)🆘 MODO EMERGENCIA: Restaurando configuración básica$(NC)"
	@echo "¿Confirmas que quieres restaurar configuración de emergencia? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Restaurando configuración básica...$(NC)"; \
		ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
			echo "blue" > /opt/.blue-green-state; \
			/opt/converxa/scripts/update-prod-config.sh blue; \
			/opt/converxa/scripts/update-nginx-full.sh; \
			systemctl reload nginx; \
			echo "Configuración básica restaurada"'; \
	else \
		echo "$(RED)Operación cancelada$(NC)"; \
	fi

# ========================================
# COMANDOS DE DESARROLLO
# ========================================

logs:
	@echo "$(GREEN)Logs del sistema...$(NC)"
	@echo "$(YELLOW)Logs Backend:$(NC)"
	@cd $(BACKEND_PROJECT_DIR) && make logs
	@echo ""
	@echo "$(YELLOW)Logs Frontend (Nginx):$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) 'tail -20 /var/log/nginx/frontend-*'

debug:
	@echo "$(GREEN)Información de debug...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
		echo "=== CONTENEDORES DOCKER ==="; \
		docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"; \
		echo ""; \
		echo "=== ARCHIVOS FRONTEND ==="; \
		ls -la /var/www/frontend/; \
		echo ""; \
		echo "=== CONFIGURACIÓN NGINX ==="; \
		nginx -t; \
		echo ""; \
		echo "=== ESTADO BLUE-GREEN ==="; \
		cat /opt/.blue-green-state 2>/dev/null || echo "No existe archivo de estado"; \
		echo ""; \
		echo "=== CERTIFICADOS SSL ==="; \
		certbot certificates | grep -E "(Certificate Name|Expiry Date)" || echo "No hay certificados"'

monitor:
	@echo "$(GREEN)Iniciando monitoreo continuo...$(NC)"
	@echo "$(YELLOW)Presiona Ctrl+C para salir$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa/scripts/health-check.sh monitor'

# ========================================
# HELPERS INTERNOS
# ========================================

.check-terraform:
	@if [ ! -f "$(TERRAFORM_DIR)/main.tf" ]; then \
		echo "$(RED)Error: No se encontró main.tf en $(TERRAFORM_DIR)$(NC)"; \
		exit 1; \
	fi

.check-connection:
	@if ! terraform output droplet_ip &> /dev/null; then \
		echo "$(RED)Error: No se encontró información del droplet$(NC)"; \
		echo "$(YELLOW)Ejecuta 'make apply' primero$(NC)"; \
		exit 1; \
	fi

# ========================================
# INFORMACIÓN ADICIONAL
# ========================================

show-config:
	@echo "$(GREEN)Configuración actual:$(NC)"
	@echo "Terraform Directory: $(TERRAFORM_DIR)"
	@echo "Backend Project: $(BACKEND_PROJECT_DIR)"
	@echo "SSH Host: $(SSH_HOST)"
	@echo "SSH User: $(SSH_USER)"
	@echo "SSH Key: $(SSH_KEY)"

show-domains:
	@echo "$(GREEN)Dominios configurados:$(NC)"
	@echo "Backend Producción: back-chat.converxa.net"
	@echo "Backend Pruebas: internal-back-chat.converxa.net"
	@echo "Frontend Producción: app-chat.converxa.net"
	@echo "Frontend Pruebas: internal-app-chat.converxa.net"

show-ports:
	@echo "$(GREEN)Puertos configurados:$(NC)"
	@echo "HTTP: 80 → Redirect HTTPS"
	@echo "HTTPS: 443 → Nginx (público)"
	@echo "Blue Backend: 3002 → Docker"
	@echo "Green Backend: 3003 → Docker"
	@echo "PostgreSQL: 5432 → Interno"
	@echo "SSH: 22 → Acceso remoto"

# ========================================
# FLUJOS COMPLETOS
# ========================================

setup-from-scratch:
	@echo "$(GREEN)🚀 Setup completo desde cero...$(NC)"
	@echo "Este proceso tomará varios minutos"
	@echo ""
	@$(MAKE) full-deploy
	@echo ""
	@echo "$(YELLOW)Esperando 30 segundos para que el servidor se estabilice...$(NC)"
	@sleep 30
	@$(MAKE) ssl
	@echo ""
	@$(MAKE) frontend-deploy
	@echo ""
	@$(MAKE) test-all
	@echo ""
	@echo "$(GREEN)🎉 Setup completo finalizado!$(NC)"
	@$(MAKE) urls

update-frontend:
	@echo "$(GREEN)🔄 Actualizando solo Frontend...$(NC)"
	@$(MAKE) frontend-build
	@$(MAKE) frontend-status

update-backend:
	@echo "$(GREEN)🔄 Actualizando solo Backend...$(NC)"
	@$(MAKE) bg-deploy
	@$(MAKE) bg-health
	@echo "$(YELLOW)Para aplicar cambios: make bg-switch$(NC)"

health-check-full:
	@echo "$(GREEN)🏥 Health check completo...$(NC)"
	@$(MAKE) bg-health
	@$(MAKE) test-all
	@echo ""
	@echo "$(GREEN)✅ Health check completado$(NC)"

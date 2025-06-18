# Makefile para Sofia Chat Backend - Blue-Green Deployment
# Facilita las operaciones de despliegue y gestión

.PHONY: help status deploy switch rollback cleanup health logs build-local test-local connect-server

# Variables
SERVER_HOST = 137.184.227.234
SSH_KEY = ~/.ssh/digitalOcean
SSH_USER = root
PROJECT_PATH = /root/repos/sofia-chat-backend-v2
BG_SCRIPT_PATH = /opt/sofia-chat/scripts/blue-green-control.sh
HEALTH_SCRIPT_PATH = /opt/sofia-chat/scripts/health-check.sh

# Colores para output
GREEN = \033[0;32m
BLUE = \033[0;34m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

# Comando SSH base
SSH_CMD = ssh -i $(SSH_KEY) $(SSH_USER)@$(SERVER_HOST)

help: ## Mostrar ayuda
	@echo "$(GREEN)Sofia Chat Backend - Blue-Green Deployment$(NC)"
	@echo "=============================================="
	@echo
	@echo "$(BLUE)Comandos disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo
	@echo "$(BLUE)Ejemplos de uso:$(NC)"
	@echo "  make status          # Ver estado actual"
	@echo "  make deploy          # Desplegar a slot inactivo"
	@echo "  make switch          # Cambiar tráfico a nuevo slot"
	@echo "  make rollback        # Revertir cambios"
	@echo

status: ## Ver estado actual del Blue-Green deployment
	@echo "$(BLUE)Consultando estado del Blue-Green deployment...$(NC)"
	@$(SSH_CMD) "$(BG_SCRIPT_PATH) status"

deploy: ## Desplegar código actual al slot inactivo
	@echo "$(BLUE)Iniciando deployment al slot inactivo...$(NC)"
	@$(SSH_CMD) "cd $(PROJECT_PATH) && git pull origin develop && $(BG_SCRIPT_PATH) deploy"
	@echo "$(GREEN)Deployment completado. Verifica en: https://internal-dev-sofia-chat.sofiacall.com$(NC)"

deploy-tag: ## Desplegar un tag específico (make deploy-tag TAG=v1.2.3)
	@if [ -z "$(TAG)" ]; then echo "$(RED)Error: Especifica TAG. Ejemplo: make deploy-tag TAG=v1.2.3$(NC)"; exit 1; fi
	@echo "$(BLUE)Desplegando tag $(TAG) al slot inactivo...$(NC)"
	@$(SSH_CMD) "cd $(PROJECT_PATH) && git fetch --tags && git checkout $(TAG) && $(BG_SCRIPT_PATH) deploy $(TAG)"

switch: ## Cambiar tráfico de producción al nuevo slot
	@echo "$(YELLOW)¿Estás seguro de cambiar el tráfico de producción? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(BLUE)Cambiando tráfico de producción...$(NC)"
	@$(SSH_CMD) "$(BG_SCRIPT_PATH) switch"
	@echo "$(GREEN)Tráfico cambiado exitosamente$(NC)"

rollback: ## Revertir al slot anterior (rollback)
	@echo "$(YELLOW)¿Estás seguro de hacer rollback? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@echo "$(BLUE)Ejecutando rollback...$(NC)"
	@$(SSH_CMD) "$(BG_SCRIPT_PATH) rollback"
	@echo "$(GREEN)Rollback completado$(NC)"

cleanup: ## Limpiar slot inactivo
	@echo "$(BLUE)Limpiando slot inactivo...$(NC)"
	@$(SSH_CMD) "$(BG_SCRIPT_PATH) cleanup"

health: ## Verificar salud de todos los contenedores
	@echo "$(BLUE)Verificando salud de contenedores...$(NC)"
	@$(SSH_CMD) "$(HEALTH_SCRIPT_PATH) check"

health-monitor: ## Monitoreo continuo de salud (Ctrl+C para detener)
	@echo "$(BLUE)Iniciando monitoreo continuo (Ctrl+C para detener)...$(NC)"
	@$(SSH_CMD) "$(HEALTH_SCRIPT_PATH) monitor 30"

logs: ## Ver logs del Blue-Green deployment
	@echo "$(BLUE)Mostrando logs de Blue-Green...$(NC)"
	@$(SSH_CMD) "tail -f /var/log/sofia-chat/blue-green/*.log"

logs-blue: ## Ver logs del contenedor Blue
	@echo "$(BLUE)Mostrando logs del contenedor Blue...$(NC)"
	@$(SSH_CMD) "docker logs -f sofia-chat-backend-blue"

logs-green: ## Ver logs del contenedor Green
	@echo "$(BLUE)Mostrando logs del contenedor Green...$(NC)"
	@$(SSH_CMD) "docker logs -f sofia-chat-backend-green"

logs-nginx: ## Ver logs de Nginx
	@echo "$(BLUE)Mostrando logs de Nginx...$(NC)"
	@$(SSH_CMD) "tail -f /var/log/nginx/access.log /var/log/nginx/error.log"

connect-server: ## Conectar al servidor vía SSH
	@echo "$(BLUE)Conectando al servidor...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SERVER_HOST)

build-local: ## Construir imagen Docker localmente
	@echo "$(BLUE)Construyendo imagen Docker localmente...$(NC)"
	@docker build -t sofia-chat-backend:local .
	@echo "$(GREEN)Imagen construida exitosamente$(NC)"

test-local: ## Ejecutar tests localmente
	@echo "$(BLUE)Ejecutando tests...$(NC)"
	@npm test

install-bg: ## Instalar Blue-Green en el servidor
	@echo "$(BLUE)Instalando Blue-Green deployment en el servidor...$(NC)"
	@scp -i $(SSH_KEY) -r scripts/blue-green $(SSH_USER)@$(SERVER_HOST):/tmp/
	@$(SSH_CMD) "chmod +x /tmp/blue-green/*.sh && /tmp/blue-green/install-blue-green.sh"
	@echo "$(GREEN)Blue-Green deployment instalado$(NC)"

copy-scripts: ## Copiar scripts actualizados al servidor
	@echo "$(BLUE)Copiando scripts actualizados...$(NC)"
	@scp -i $(SSH_KEY) scripts/blue-green/*.sh $(SSH_USER)@$(SERVER_HOST):/opt/sofia-chat/scripts/
	@$(SSH_CMD) "chmod +x /opt/sofia-chat/scripts/*.sh"
	@echo "$(GREEN)Scripts actualizados$(NC)"

backup-db: ## Crear backup de la base de datos
	@echo "$(BLUE)Creando backup de la base de datos...$(NC)"
	@$(SSH_CMD) "cd $(PROJECT_PATH) && docker exec sofia-chat-postgres pg_dump -U postgres sofia_chat > backup_\$$(date +%Y%m%d_%H%M%S).sql"
	@echo "$(GREEN)Backup creado exitosamente$(NC)"

check-dns: ## Verificar configuración DNS
	@echo "$(BLUE)Verificando configuración DNS...$(NC)"
	@echo "Producción:"
	@nslookup dev-sofia-chat.sofiacall.com
	@echo "Pruebas internas:"
	@nslookup internal-dev-sofia-chat.sofiacall.com

check-ssl: ## Verificar certificados SSL
	@echo "$(BLUE)Verificando certificados SSL...$(NC)"
	@$(SSH_CMD) "$(HEALTH_SCRIPT_PATH) check && openssl x509 -in /etc/letsencrypt/live/dev-sofia-chat.sofiacall.com/fullchain.pem -text -noout | grep 'Not After'"

pipeline-status: ## Ver estado del último pipeline de GitHub
	@echo "$(BLUE)Para ver el estado del pipeline, visita:$(NC)"
	@echo "https://github.com/tu-usuario/sofia-chat-backend-v2/actions"

emergency-restore: ## Procedimiento de emergencia (restaurar Blue como producción)
	@echo "$(RED)PROCEDIMIENTO DE EMERGENCIA$(NC)"
	@echo "$(YELLOW)¿Confirmas que quieres forzar Blue como producción? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ]
	@$(SSH_CMD) "echo 'blue' > /opt/sofia-chat/.blue-green-state && /opt/sofia-chat/scripts/update-prod-config.sh blue && systemctl reload nginx"
	@echo "$(GREEN)Blue restaurado como producción$(NC)"

quick-deploy: ## Deploy rápido (pull + deploy + notificación)
	@echo "$(BLUE)Ejecutando deployment rápido...$(NC)"
	@$(SSH_CMD) "cd $(PROJECT_PATH) && git pull origin develop"
	@make deploy
	@echo "$(GREEN)✅ Deployment completado$(NC)"
	@echo "$(YELLOW)🧪 Probar en: https://internal-dev-sofia-chat.sofiacall.com$(NC)"
	@echo "$(YELLOW)🚀 Para promover a producción: make switch$(NC)"

# Targets para desarrollo local
dev-setup: ## Configurar entorno de desarrollo local
	@echo "$(BLUE)Configurando entorno de desarrollo...$(NC)"
	@npm install
	@cp .env.example .env
	@echo "$(GREEN)Entorno configurado. Edita .env con tus variables$(NC)"

dev-up: ## Levantar entorno de desarrollo con Docker
	@echo "$(BLUE)Levantando entorno de desarrollo...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)Entorno levantado en http://localhost:3001$(NC)"

dev-down: ## Detener entorno de desarrollo
	@echo "$(BLUE)Deteniendo entorno de desarrollo...$(NC)"
	@docker-compose down

dev-logs: ## Ver logs del entorno de desarrollo
	@docker-compose logs -f

# Info útil
info: ## Mostrar información del proyecto
	@echo "$(GREEN)Sofia Chat Backend - Información del Proyecto$(NC)"
	@echo "=============================================="
	@echo "Servidor: $(SERVER_HOST)"
	@echo "Usuario SSH: $(SSH_USER)"
	@echo "Proyecto: $(PROJECT_PATH)"
	@echo "Dominios:"
	@echo "  - Producción: https://dev-sofia-chat.sofiacall.com"
	@echo "  - Pruebas: https://internal-dev-sofia-chat.sofiacall.com"
	@echo "Scripts Blue-Green: $(BG_SCRIPT_PATH)"
	@echo
	@echo "$(BLUE)Estados posibles:$(NC)"
	@echo "  - blue: Contenedor azul activo en producción"
	@echo "  - green: Contenedor verde activo en producción"

# Target por defecto
all: help
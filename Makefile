# Makefile para Blue-Green Deployment
# Facilita operaciones desde local sin necesidad de conectar directamente al servidor

# Configuración del servidor
SSH_HOST := 137.184.227.234
SSH_USER := root
SSH_KEY := ~/.ssh/digitalOcean
PROJECT_PATH := /root/repos/converxa-backend-v1

# Colores para output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help status deploy switch rollback cleanup logs health connect test-endpoints

# Comando por defecto
help:
	@echo "$(GREEN)Blue-Green Deployment - Converxa Backend$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos disponibles:$(NC)"
	@echo "  make status          - Ver estado actual del deployment"
	@echo "  make deploy          - Desplegar a slot inactivo"
	@echo "  make switch          - Cambiar tráfico al nuevo slot (con confirmación)"
	@echo "  make rollback        - Volver al slot anterior (con confirmación)"
	@echo "  make cleanup         - Limpiar slot inactivo"
	@echo "  make logs            - Ver logs en tiempo real"
	@echo "  make health          - Verificar salud de ambos slots"
	@echo "  make test-endpoints  - Probar todos los endpoints"
	@echo "  make connect         - Conectar al servidor via SSH"
	@echo ""
	@echo "$(YELLOW)Configuración:$(NC)"
	@echo "  Servidor: $(SSH_HOST)"
	@echo "  Usuario: $(SSH_USER)"
	@echo "  Clave SSH: $(SSH_KEY)"
	@echo ""
	@echo "$(GREEN)Flujo típico:$(NC)"
	@echo "  1. make status       # Ver estado actual"
	@echo "  2. make deploy       # Desplegar nueva versión"
	@echo "  3. make health       # Verificar que funciona"
	@echo "  4. make switch       # Cambiar tráfico (con confirmación)"
	@echo "  5. make cleanup      # Limpiar slot anterior"

# Ver estado actual
status:
	@echo "$(GREEN)Consultando estado del deployment...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa-chat/blue-green-simple.sh status'

# Desplegar a slot inactivo
deploy:
	@echo "$(GREEN)Iniciando deployment a slot inactivo...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) 'cd $(PROJECT_PATH) && git pull origin develop-v1 && /opt/converxa-chat/blue-green-simple.sh deploy'

# Cambiar tráfico al nuevo slot (con confirmación)
switch:
	@echo "$(YELLOW)⚠️  ADVERTENCIA: Esto cambiará el tráfico de producción$(NC)"
	@echo "¿Estás seguro de que quieres hacer switch? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Ejecutando switch...$(NC)"; \
		ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa-chat/blue-green-simple.sh switch'; \
	else \
		echo "$(RED)Switch cancelado$(NC)"; \
	fi

# Rollback al slot anterior (con confirmación)
rollback:
	@echo "$(RED)⚠️  ADVERTENCIA: Esto hará rollback de producción$(NC)"
	@echo "¿Estás seguro de que quieres hacer rollback? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Ejecutando rollback...$(NC)"; \
		ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa-chat/blue-green-simple.sh rollback'; \
	else \
		echo "$(RED)Rollback cancelado$(NC)"; \
	fi

# Limpiar slot inactivo
cleanup:
	@echo "$(GREEN)Limpiando slot inactivo...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa-chat/blue-green-simple.sh cleanup'

# Ver logs en tiempo real
logs:
	@echo "$(GREEN)Mostrando logs en tiempo real...$(NC)"
	@echo "$(YELLOW)Presiona Ctrl+C para salir$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) 'docker logs -f $$(docker ps --format "{{.Names}}" | grep converxa-backend | head -1)'

# Verificar salud de ambos slots
health:
	@echo "$(GREEN)Verificando salud de contenedores...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
		echo "=== HEALTH CHECK ==="; \
		echo -n "Blue (3002): "; \
		if curl -sf http://localhost:3002/api/health >/dev/null 2>&1; then \
			echo "✅ HEALTHY"; \
		else \
			echo "❌ UNHEALTHY"; \
		fi; \
		echo -n "Green (3003): "; \
		if curl -sf http://localhost:3003/api/health >/dev/null 2>&1; then \
			echo "✅ HEALTHY"; \
		else \
			echo "❌ UNHEALTHY"; \
		fi; \
		echo -n "Producción: "; \
		if curl -sf https://dev-converxa.converxa.com/api/health >/dev/null 2>&1; then \
			echo "✅ HEALTHY"; \
		else \
			echo "❌ UNHEALTHY"; \
		fi'

# Probar todos los endpoints
test-endpoints:
	@echo "$(GREEN)Probando todos los endpoints...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
		echo "=== TESTING ENDPOINTS ==="; \
		echo ""; \
		echo "Blue (3002):"; \
		curl -s http://localhost:3002/api/health | jq . || echo "❌ Error o no JSON válido"; \
		echo ""; \
		echo "Green (3003):"; \
		curl -s http://localhost:3003/api/health | jq . || echo "❌ Error o no JSON válido"; \
		echo ""; \
		echo "Producción:"; \
		curl -s https://dev-converxa.converxa.com/api/health | jq . || echo "❌ Error o no JSON válido"; \
		echo ""; \
		echo "Pruebas internas:"; \
		curl -s https://internal-dev-converxa.converxa.com/api/health | jq . || echo "❌ Error o no JSON válido"'

# Conectar al servidor via SSH
connect:
	@echo "$(GREEN)Conectando al servidor...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST)

# Comandos de desarrollo y debugging
debug-status:
	@echo "$(GREEN)Estado detallado del sistema...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
		echo "=== CONTENEDORES DOCKER ==="; \
		docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"; \
		echo ""; \
		echo "=== ARCHIVOS DE ESTADO ==="; \
		ls -la /opt/.blue-green-state 2>/dev/null || echo "No existe archivo de estado"; \
		cat /opt/.blue-green-state 2>/dev/null || echo "No se puede leer estado"; \
		echo ""; \
		echo "=== CONFIGURACIÓN NGINX ==="; \
		nginx -t; \
		echo ""; \
		echo "=== LOGS RECIENTES ==="; \
		tail -10 /var/log/converxa-chat/health-check.log 2>/dev/null || echo "No hay logs de health check"'

# Forzar recreación completa (PELIGROSO)
force-rebuild:
	@echo "$(RED)⚠️  PELIGRO: Esto recreará ambos contenedores$(NC)"
	@echo "¿Estás COMPLETAMENTE seguro? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Recreando contenedores...$(NC)"; \
		ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) 'cd $(PROJECT_PATH) && docker-compose down && docker-compose build --no-cache && docker-compose up -d converxa-backend-blue'; \
	else \
		echo "$(RED)Operación cancelada$(NC)"; \
	fi

# Backup de base de datos
backup-db:
	@echo "$(GREEN)Creando backup de base de datos...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) 'cd $(PROJECT_PATH) && /opt/converxa-chat/blue-green-simple.sh backup-db'

# Restaurar base de datos
restore-db:
	@echo "$(YELLOW)⚠️  ADVERTENCIA: Esto restaurará la base de datos$(NC)"
	@echo "¿Estás seguro de que quieres restaurar? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Restaurando base de datos...$(NC)"; \
		ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa-chat/blue-green-simple.sh restore'; \
	else \
		echo "$(RED)Restauración cancelada$(NC)"; \
	fi

# Monitoreo continuo
monitor:
	@echo "$(GREEN)Iniciando monitoreo continuo...$(NC)"
	@echo "$(YELLOW)Presiona Ctrl+C para salir$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '/opt/converxa-chat/scripts/health-check.sh monitor'

# Información del sistema
info:
	@echo "$(GREEN)Información del sistema...$(NC)"
	@ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
		echo "=== INFORMACIÓN DEL SERVIDOR ==="; \
		echo "Hostname: $$(hostname)"; \
		echo "Uptime: $$(uptime)"; \
		echo "Espacio en disco: $$(df -h / | tail -1)"; \
		echo "Memoria: $$(free -h | grep Mem)"; \
		echo ""; \
		echo "=== VERSIONES ==="; \
		echo "Docker: $$(docker --version)"; \
		echo "Docker Compose: $$(docker-compose --version)"; \
		echo "Nginx: $$(nginx -v 2>&1)"; \
		echo ""; \
		echo "=== CERTIFICADOS SSL ==="; \
		certbot certificates | grep -E "(Certificate Name|Expiry Date)" || echo "No hay certificados"'

# Comando de emergencia - restaurar configuración básica
emergency-restore:
	@echo "$(RED)⚠️  MODO EMERGENCIA: Restaurando configuración básica$(NC)"
	@echo "¿Confirmas que quieres restaurar configuración de emergencia? [y/N]"
	@read -r REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(GREEN)Restaurando configuración básica...$(NC)"; \
		ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST) '\
			echo "blue" > /opt/.blue-green-state; \
			/opt/converxa-chat/scripts/update-prod-config.sh blue; \
			systemctl reload nginx; \
			echo "Configuración básica restaurada"'; \
	else \
		echo "$(RED)Operación cancelada$(NC)"; \
	fi

# Mostrar URLs útiles
urls:
	@echo "$(GREEN)URLs del sistema:$(NC)"
	@echo ""
	@echo "$(YELLOW)Producción:$(NC)"
	@echo "  https://dev-converxa.converxa.com/api/health"
	@echo ""
	@echo "$(YELLOW)Desarrollo directo:$(NC)"
	@echo "  http://$(SSH_HOST):3002/api/health  (Blue)"
	@echo "  http://$(SSH_HOST):3003/api/health  (Green)"
	@echo ""
	@echo "$(YELLOW)Pruebas internas:$(NC)"
	@echo "  https://internal-dev-converxa.converxa.com/api/health"
	@echo ""
	@echo "$(YELLOW)SSH:$(NC)"
	@echo "  ssh -i $(SSH_KEY) $(SSH_USER)@$(SSH_HOST)"

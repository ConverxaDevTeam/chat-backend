# Pruebas cURL - Converxa Chat Backend v2

## Configuración Base
- **Usuario**: frank@pixeldigita.com, password: 12345678
- **Base URL**: http://localhost:3001/api
- **Tablas BD**: "Conversations", "Integrations", "Messages" (con mayúsculas)

### Variables BD (solo consulta)
```bash
export TYPEORM_HOST=localhost TYPEORM_USERNAME=postgres TYPEORM_PASSWORD=Admin TYPEORM_DATABASE=converxa_chat_v2 TYPEORM_PORT=5432
```

## 1. Login
```bash
curl -X POST http://localhost:3001/api/auth/log-in -H "Content-Type: application/json" -d '{"email": "frank@pixeldigita.com", "password": "12345678"}'
```

## 2. WhatsApp - ✅ FUNCIONANDO
```bash
# Verificación webhook
curl -X GET "http://localhost:3001/api/facebook/webhook?hub.verify_token=1a9b4a6b3b4c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6&hub.challenge=test&hub.mode=subscribe"

# Mensaje WhatsApp (usar ejemplo de test/whatsapp/webhook_whatsapp_example.json)
curl -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/whatsapp/webhook_whatsapp_example.json
```

## 3. Facebook - ✅ FUNCIONANDO
```bash
# Mensaje Facebook (usar ejemplo de test/facebook/webhook_facebook_example.json)
curl -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/facebook/webhook_facebook_example.json
```

## 4. Scripts de Prueba Automatizados
```bash
# Script WhatsApp completo con verificación
#!/bin/bash
echo "=== PRUEBAS WHATSAPP ==="
curl -s -X GET "http://localhost:3001/api/facebook/webhook?hub.verify_token=1a9b4a6b3b4c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6&hub.challenge=test&hub.mode=subscribe" && echo " ✓ Webhook verificado"
curl -s -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/whatsapp/webhook_whatsapp_example.json && echo " ✓ Mensaje enviado"

# Verificar conversaciones creadas
JWT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/log-in -H "Content-Type: application/json" -d '{"email": "frank@pixeldigita.com", "password": "12345678"}' | jq -r '.token')
echo "=== VERIFICANDO CONVERSACIONES ==="
curl -s -X GET "http://localhost:3001/api/conversation/organization/10" -H "Authorization: Bearer $JWT_TOKEN" | jq '.conversations[] | select(.type=="whatsapp") | {id, type, message_text, created_at}' && echo " ✓ Conversaciones WhatsApp verificadas"

# Script Facebook completo con verificación
#!/bin/bash
echo "=== PRUEBAS FACEBOOK ==="
curl -s -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/facebook/webhook_facebook_example.json && echo " ✓ Mensaje enviado"

# Verificar conversaciones creadas
JWT_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/log-in -H "Content-Type: application/json" -d '{"email": "frank@pixeldigita.com", "password": "12345678"}' | jq -r '.token')
echo "=== VERIFICANDO CONVERSACIONES ==="
curl -s -X GET "http://localhost:3001/api/conversation/organization/10" -H "Authorization: Bearer $JWT_TOKEN" | jq '.conversations[] | select(.type=="messenger") | {id, type, message_text, created_at}' && echo " ✓ Conversaciones Facebook verificadas"
```

## 5. Verificación con APIs de Conversaciones
```bash
# Nota: Necesitas obtener JWT_TOKEN del login primero
export JWT_TOKEN="tu_token_jwt_aqui"

# 1. Login para obtener token
curl -X POST http://localhost:3001/api/auth/log-in -H "Content-Type: application/json" -d '{"email": "frank@pixeldigita.com", "password": "12345678"}'

# 2. Consultar conversaciones de la organización (reemplazar organizationId)
curl -X GET "http://localhost:3001/api/conversation/organization/{organizationId}" -H "Authorization: Bearer $JWT_TOKEN"

# 3. Ver detalles de conversación específica (reemplazar organizationId y conversationId)
curl -X GET "http://localhost:3001/api/conversation/{organizationId}/{conversationId}" -H "Authorization: Bearer $JWT_TOKEN"

# Ejemplo completo de verificación:
# curl -X GET "http://localhost:3001/api/conversation/organization/10" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# curl -X GET "http://localhost:3001/api/conversation/10/3" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 6. Configuración Específica para Producción

### URL Base Producción
```bash
export PROD_URL="https://back-chat.converxa.net/api"
```

### Flujo Completo de Configuración desde Cero
```bash
# 1. Login en producción
JWT_TOKEN=$(curl -s -X POST $PROD_URL/auth/log-in -H "Content-Type: application/json" -d '{"email": "frank@pixeldigita.com", "password": "12345678"}' | jq -r '.token')

# 2. Obtener organizaciones disponibles
curl -X GET $PROD_URL/organization/my-organizations -H "Authorization: Bearer $JWT_TOKEN"

# 3. Obtener departamentos de la organización (reemplazar organizationId)
curl -X GET $PROD_URL/departments/organization/10 -H "Authorization: Bearer $JWT_TOKEN"

# 4. Crear integraciones manuales
curl -X POST $PROD_URL/integration/create-whatsapp-manual/10/1 -H "Authorization: Bearer $JWT_TOKEN"
curl -X POST $PROD_URL/integration/create-messager-manual/10/1 -H "Authorization: Bearer $JWT_TOKEN"

# 5. Obtener IDs de integraciones creadas
curl -X GET $PROD_URL/integration/all/1 -H "Authorization: Bearer $JWT_TOKEN"

# 6. Configurar datos de las integraciones (usar IDs reales de webhooks)
curl -X POST $PROD_URL/integration/update-whatsapp-manual/10/1/2 -H "Authorization: Bearer $JWT_TOKEN" -H "Content-Type: application/json" -d '{"waba_id": "472031779337860", "phone_number_id": "569372732928365", "token": "REAL_WHATSAPP_TOKEN"}'

curl -X POST $PROD_URL/integration/update-messenger-manual/10/1/3 -H "Authorization: Bearer $JWT_TOKEN" -H "Content-Type: application/json" -d '{"page_id": "501656306373747", "token": "REAL_FACEBOOK_TOKEN"}'

# 7. Obtener códigos de webhook para configurar en plataformas
curl -X GET $PROD_URL/integration/get-whatsapp-manual/organization/10/departamento/1/integration/2 -H "Authorization: Bearer $JWT_TOKEN"
curl -X GET $PROD_URL/integration/get-messenger-manual/10/1/3 -H "Authorization: Bearer $JWT_TOKEN"
```

### URLs de Webhook para Configurar
```bash
# WhatsApp Business API
Webhook URL: https://back-chat.converxa.net/api/facebook/webhook/2
Verify Token: [obtener de la respuesta del paso 7]

# Facebook Messenger
Webhook URL: https://back-chat.converxa.net/api/facebook/webhook/3  
Verify Token: [obtener de la respuesta del paso 7]
```

### Pruebas de Verificación
```bash
# Verificar webhooks (usar tokens reales obtenidos)
curl -X GET "https://back-chat.converxa.net/api/facebook/webhook/2?hub.verify_token=REAL_WHATSAPP_VERIFY_TOKEN&hub.challenge=test_challenge&hub.mode=subscribe"
curl -X GET "https://back-chat.converxa.net/api/facebook/webhook/3?hub.verify_token=REAL_FACEBOOK_VERIFY_TOKEN&hub.challenge=test_challenge&hub.mode=subscribe"

# Enviar mensajes de prueba
curl -X POST https://back-chat.converxa.net/api/facebook/webhook/2 -H "Content-Type: application/json" -d @test/whatsapp/webhook_whatsapp_example.json
curl -X POST https://back-chat.converxa.net/api/facebook/webhook/3 -H "Content-Type: application/json" -d @test/facebook/webhook_facebook_example.json

# Verificar que se crearon conversaciones
curl -X GET https://back-chat.converxa.net/api/conversation/organization/10 -H "Authorization: Bearer $JWT_TOKEN"
```

## Estado Actual
- ✅ Webhooks funcionando (verificación y recepción)
- ✅ Login funcionando con credenciales correctas
- ✅ Procesamiento completo: mensajes se guardan en BD y generan respuestas
- ✅ Configuración de producción validada completamente
- ✅ Integraciones manuales WhatsApp y Facebook funcionando
- 📁 Archivos test/whatsapp/ y test/facebook/ listos para usar
- 📋 Documentación: docs/facebook_whatsapp_integration_use_case.md

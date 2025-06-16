# Pruebas cURL - Sofia Chat Backend v2

## Configuración Base
- **Usuario**: frank@pixeldigita.com, password: 12345678
- **Base URL**: http://localhost:3001/api
- **Tablas BD**: "Conversations", "Integrations", "Messages" (con mayúsculas)

### Variables BD (solo consulta)
```bash
export TYPEORM_HOST=localhost TYPEORM_USERNAME=postgres TYPEORM_PASSWORD=Admin TYPEORM_DATABASE=sofia_chat_v2 TYPEORM_PORT=5432
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
# Script WhatsApp completo
#!/bin/bash
echo "=== PRUEBAS WHATSAPP ==="
curl -s -X GET "http://localhost:3001/api/facebook/webhook?hub.verify_token=1a9b4a6b3b4c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6&hub.challenge=test&hub.mode=subscribe" && echo " ✓"
curl -s -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/whatsapp/webhook_whatsapp_example.json && echo " ✓"

# Script Facebook completo
#!/bin/bash
echo "=== PRUEBAS FACEBOOK ==="
curl -s -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/facebook/webhook_facebook_example.json && echo " ✓"
```

## 5. Verificación BD
```bash
# Últimas conversaciones y mensajes
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "SELECT id, type, \"integrationId\", created_at FROM \"Conversations\" ORDER BY created_at DESC LIMIT 5;"

PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "SELECT id, text, \"conversationId\", created_at FROM \"Messages\" ORDER BY created_at DESC LIMIT 5;"
```

## Estado Actual
- ✅ Webhooks funcionando (verificación y recepción)
- ✅ Login funcionando con credenciales correctas
- ✅ Procesamiento completo: mensajes se guardan en BD y generan respuestas
- 📁 Archivos test/whatsapp/ y test/facebook/ listos para usar
- 📋 Documentación: docs/facebook_whatsapp_integration_use_case.md

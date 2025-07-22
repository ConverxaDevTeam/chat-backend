# Pruebas cURL - Converxa Chat Backend v2

## Configuración Base
- **Usuario**: frank@pixeldigita.com, password: 12345678
- **Base URL**: http://localhost:3001/api
- **Tablas BD**: "Conversations", "Integrations", "Messages" (con mayúsculas)

### Variables BD (solo consulta)
```bash
export TYPEORM_HOST=localhost TYPEORM_USERNAME=postgres TYPEORM_PASSWORD=Admin TYPEORM_DATABASE=converxa_chat_v2 TYPEORM_PORT=5432
```

## 📋 **PROCESO COMPLETO DE VERIFICACIÓN**

### Paso 1: Verificar que el servidor esté funcionando
```bash
curl -X GET http://localhost:3001/api/health
```

### Paso 2: Verificar integraciones existentes
```bash
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "SELECT id, type, waba_id, page_id, \"departamentoId\", validated_webhook FROM \"Integrations\" WHERE type IN ('whatsapp', 'messenger');"
```

**Debe mostrar:**
- WhatsApp: `waba_id = 472031779337860`, `departamentoId = 1`
- Messenger: `page_id = 501656306373747`, `departamentoId = 1`

### Paso 3: Si faltan integraciones, crearlas
```bash
# WhatsApp (si no existe)
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "INSERT INTO \"Integrations\" (type, waba_id, phone_number_id, \"departamentoId\", validated_webhook, config) VALUES ('whatsapp', '472031779337860', '569372732928365', 1, true, '{}');"

# Messenger (si no existe)
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "INSERT INTO \"Integrations\" (type, page_id, \"departamentoId\", validated_webhook, config) VALUES ('messenger', '501656306373747', 1, true, '{}');"
```

## 🧪 **PRUEBAS FUNCIONALES**

### 1. Login
```bash
curl -X POST http://localhost:3001/api/auth/log-in -H "Content-Type: application/json" -d '{"email": "frank@pixeldigita.com", "password": "12345678"}'
```

### 2. WhatsApp - Verificación webhook
```bash
curl -X GET "http://localhost:3001/api/facebook/webhook?hub.verify_token=1a9b4a6b3b4c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6&hub.challenge=test&hub.mode=subscribe"
```
**Resultado esperado:** `test`

### 3. WhatsApp - Mensaje de prueba
```bash
curl -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/whatsapp/webhook_whatsapp_example.json
```
**Resultado esperado:** `EVENT_RECEIVED`

### 4. Facebook Messenger - Mensaje de prueba
```bash
curl -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/facebook/webhook_facebook_example.json
```
**Resultado esperado:** `EVENT_RECEIVED`

## ✅ **VERIFICACIÓN DE ÉXITO**

### Verificar que se crearon nuevas conversaciones
```bash
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "SELECT id, type, \"integrationId\", created_at FROM \"Conversations\" ORDER BY created_at DESC LIMIT 5;"
```

### Verificar mensajes procesados
```bash
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "SELECT id, text, \"conversationId\", created_at FROM \"Messages\" WHERE \"conversationId\" IN (SELECT id FROM \"Conversations\" WHERE type IN ('whatsapp', 'messenger')) ORDER BY created_at DESC LIMIT 10;"
```

### Verificar que se crearon respuestas de IA
```bash
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "SELECT COUNT(*) as mensajes_hoy FROM \"Messages\" WHERE DATE(created_at) = CURRENT_DATE;"
```

## 🔧 **CREAR NUEVAS PRUEBAS (Para evitar duplicados)**

Para asegurar que se creen nuevas conversaciones, modifica los JSONs de prueba:

### WhatsApp - Modificar `test/whatsapp/webhook_whatsapp_example.json`:
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "472031779337860",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "56937273292",
              "phone_number_id": "569372732928365"
            },
            "messages": [
              {
                "from": "56999NUEVO",  // <- CAMBIAR NÚMERO
                "id": "wamid.NUEVO_ID", // <- CAMBIAR ID
                "timestamp": "TIMESTAMP_ACTUAL",
                "text": {
                  "body": "Prueba WhatsApp FECHA"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Facebook - Modificar `test/facebook/webhook_facebook_example.json`:
```json
{
  "object": "page",
  "entry": [
    {
      "id": "501656306373747",
      "time": TIMESTAMP_ACTUAL,
      "messaging": [
        {
          "sender": {
            "id": "NUEVO_ID" // <- CAMBIAR ID
          },
          "recipient": {
            "id": "501656306373747"
          },
          "timestamp": TIMESTAMP_ACTUAL,
          "message": {
            "mid": "mid.NUEVO_MID", // <- CAMBIAR MID
            "text": "Prueba Facebook FECHA"
          }
        }
      ]
    }
  ]
}
```

## 🚨 **TROUBLESHOOTING**

### Error: "Integration not found"
**Causa:** Falta la integración o está mal configurada
**Solución:**
1. Verificar que existe la integración con los IDs correctos
2. Para WhatsApp: verificar `waba_id = 472031779337860`
3. Para Messenger: verificar `page_id = 501656306373747`
4. Verificar que `departamentoId` no sea NULL

### Error: No se crean conversaciones nuevas
**Causa:** Se están reutilizando usuarios existentes
**Solución:**
1. Modificar el `from` (WhatsApp) o `sender.id` (Facebook) en los JSONs
2. Cambiar los IDs de mensaje para evitar duplicados

### Error: "Phone number not found" o "WabaId not found"
**Causa:** JSON malformado o campos faltantes
**Solución:**
1. Verificar estructura del JSON
2. Asegurar que todos los campos requeridos estén presentes

### Error: No se procesan los mensajes
**Causa:** Integración sin departamento asignado
**Solución:**
```bash
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "UPDATE \"Integrations\" SET \"departamentoId\" = 1 WHERE \"departamentoId\" IS NULL AND type IN ('whatsapp', 'messenger');"
```

## 📜 **SCRIPTS AUTOMATIZADOS**

### Script completo de verificación
```bash
#!/bin/bash
echo "=== VERIFICACIÓN COMPLETA WHATSAPP Y MESSENGER ==="

# Verificar webhook WhatsApp
echo -n "1. Webhook WhatsApp: "
RESPONSE=$(curl -s -X GET "http://localhost:3001/api/facebook/webhook?hub.verify_token=1a9b4a6b3b4c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6&hub.challenge=test&hub.mode=subscribe")
if [ "$RESPONSE" = "test" ]; then echo "✅ OK"; else echo "❌ FAIL"; fi

# Probar mensaje WhatsApp
echo -n "2. Mensaje WhatsApp: "
RESPONSE=$(curl -s -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/whatsapp/webhook_whatsapp_example.json)
if [ "$RESPONSE" = "EVENT_RECEIVED" ]; then echo "✅ OK"; else echo "❌ FAIL"; fi

# Probar mensaje Facebook
echo -n "3. Mensaje Facebook: "
RESPONSE=$(curl -s -X POST http://localhost:3001/api/facebook/webhook -H "Content-Type: application/json" -d @test/facebook/webhook_facebook_example.json)
if [ "$RESPONSE" = "EVENT_RECEIVED" ]; then echo "✅ OK"; else echo "❌ FAIL"; fi

echo "=== VERIFICACIÓN COMPLETADA ==="
```

### Script de limpieza (para pruebas)
```bash
#!/bin/bash
# Eliminar conversaciones de prueba (CUIDADO: solo para testing)
export TYPEORM_HOST=localhost TYPEORM_USERNAME=postgres TYPEORM_PASSWORD=Admin TYPEORM_DATABASE=converxa_chat_v2 TYPEORM_PORT=5432

echo "⚠️  ELIMINANDO CONVERSACIONES DE PRUEBA..."
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "DELETE FROM \"Messages\" WHERE \"conversationId\" IN (SELECT id FROM \"Conversations\" WHERE type IN ('whatsapp', 'messenger') AND DATE(created_at) = CURRENT_DATE);"
PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -p $TYPEORM_PORT -U $TYPEORM_USERNAME -d $TYPEORM_DATABASE -c "DELETE FROM \"Conversations\" WHERE type IN ('whatsapp', 'messenger') AND DATE(created_at) = CURRENT_DATE;"
echo "✅ Limpieza completada"
```

## 📊 **ESTADO ESPERADO AL FINAL**

✅ **Webhooks funcionando** (verificación y recepción)
✅ **Integraciones configuradas** con departamentos asignados
✅ **Nuevas conversaciones creadas** para WhatsApp y Messenger
✅ **Mensajes procesados** con respuestas de IA generadas
✅ **Base de datos actualizada** con los nuevos registros

## 🔗 **Referencias**
- 📁 Archivos test: `test/whatsapp/` y `test/facebook/`
- 📋 Documentación técnica: `docs/facebook_whatsapp_integration_use_case.md`
- 🗄️ Estructura BD: Tablas "Conversations", "Integrations", "Messages"

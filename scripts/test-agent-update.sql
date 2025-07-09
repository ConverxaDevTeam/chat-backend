-- Script de prueba para verificar la actualización de múltiples agentes por organización
-- Este script simula una organización con múltiples departamentos y agentes

-- Variables para el test (ajustar según la base de datos)
-- Suponiendo organization_id = 1 para el test

-- 1. Verificar estructura actual
SELECT
    o.id as organization_id,
    o.name as organization_name,
    d.id as department_id,
    d.name as department_name,
    a.id as agent_id,
    a.name as agent_name,
    a.type as agent_type,
    a.config->>'agentId' as openai_agent_id
FROM organization o
LEFT JOIN departamento d ON d.organization_id = o.id
LEFT JOIN agente a ON a.departamento_id = d.id
WHERE o.id = 1
ORDER BY d.id;

-- 2. Verificar tipos HITL existentes para la organización
SELECT
    ht.id,
    ht.name,
    ht.description,
    ht.organization_id,
    COUNT(uht.user_id) as assigned_users
FROM hitl_types ht
LEFT JOIN user_hitl_types uht ON uht.hitl_type_id = ht.id
WHERE ht.organization_id = 1
GROUP BY ht.id, ht.name, ht.description, ht.organization_id;

-- 3. Si no hay departamentos/agentes de prueba, crear datos de test
-- (Ejecutar solo si es necesario para testing)

-- Crear departamentos adicionales si no existen
INSERT INTO departamento (name, description, organization_id, created_at, updated_at)
SELECT 'Ventas Test', 'Departamento de ventas para testing', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departamento WHERE name = 'Ventas Test' AND organization_id = 1);

INSERT INTO departamento (name, description, organization_id, created_at, updated_at)
SELECT 'Soporte Test', 'Departamento de soporte para testing', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departamento WHERE name = 'Soporte Test' AND organization_id = 1);

-- Crear agentes para cada departamento si no existen
INSERT INTO agente (name, type, config, can_escalate_to_human, departamento_id, created_at, updated_at)
SELECT
    'Agente Ventas',
    'CONVERXA',
    '{"agentId": "asst_test_ventas_123", "organizationId": 1, "DBagentId": null}',
    true,
    d.id,
    NOW(),
    NOW()
FROM departamento d
WHERE d.name = 'Ventas Test' AND d.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM agente WHERE departamento_id = d.id);

INSERT INTO agente (name, type, config, can_escalate_to_human, departamento_id, created_at, updated_at)
SELECT
    'Agente Soporte',
    'CONVERXA_ASISTENTE',
    '{"agentId": "asst_test_soporte_456", "organizationId": 1, "DBagentId": null}',
    true,
    d.id,
    NOW(),
    NOW()
FROM departamento d
WHERE d.name = 'Soporte Test' AND d.organization_id = 1
AND NOT EXISTS (SELECT 1 FROM agente WHERE departamento_id = d.id);

-- Actualizar DBagentId con el id real del agente para los de prueba
UPDATE agente
SET config = jsonb_set(config, '{DBagentId}', to_jsonb(id))
WHERE name IN ('Agente Ventas', 'Agente Soporte')
AND config->>'DBagentId' IS NULL;

-- 4. Crear un tipo HITL de prueba si no existe
INSERT INTO hitl_types (name, description, organization_id, created_by, created_at, updated_at)
SELECT
    'soporte_tecnico_test',
    'Tipo HITL de prueba para soporte técnico',
    1,
    (SELECT id FROM "user" WHERE email LIKE '%@%' LIMIT 1), -- Primer usuario válido
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM hitl_types WHERE name = 'soporte_tecnico_test' AND organization_id = 1);

-- 5. Verificar el estado final después de crear datos de prueba
SELECT
    'RESUMEN FINAL' as section,
    COUNT(DISTINCT d.id) as total_departments,
    COUNT(DISTINCT a.id) as total_agents,
    COUNT(DISTINCT ht.id) as total_hitl_types
FROM organization o
LEFT JOIN departamento d ON d.organization_id = o.id
LEFT JOIN agente a ON a.departamento_id = d.id
LEFT JOIN hitl_types ht ON ht.organization_id = o.id
WHERE o.id = 1;

-- 6. Query para simular lo que hace updateAgentAfterHitlChange
SELECT
    'AGENTS TO UPDATE' as section,
    a.id as agent_id,
    a.name as agent_name,
    d.name as department_name,
    a.config->>'agentId' as openai_agent_id,
    CASE
        WHEN a.config->>'agentId' IS NOT NULL THEN 'WILL UPDATE'
        ELSE 'SKIP - NO AGENT_ID'
    END as update_status
FROM agente a
JOIN departamento d ON a.departamento_id = d.id
JOIN organization o ON d.organization_id = o.id
WHERE o.id = 1;

-- 7. Limpiar datos de prueba (ejecutar solo si se quiere limpiar)
-- UNCOMMENT PARA LIMPIAR:
-- DELETE FROM agente WHERE name IN ('Agente Ventas', 'Agente Soporte');
-- DELETE FROM departamento WHERE name IN ('Ventas Test', 'Soporte Test') AND organization_id = 1;
-- DELETE FROM hitl_types WHERE name = 'soporte_tecnico_test' AND organization_id = 1;

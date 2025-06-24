# Flujo de Límites de Organización

Este documento describe el flujo de trabajo para los límites de organización en el sistema Converxa Chat.

## Tipos de Organización

El sistema soporta cuatro tipos de organizaciones, cada una con diferentes límites:

```mermaid
classDiagram
    class OrganizationType {
        <<enum>>
        PRODUCTION
        MVP
        FREE
        CUSTOM
    }

    class Organization {
        +id: number
        +name: string
        +description: string
        +logo: string
        +type: OrganizationType
    }

    class OrganizationLimit {
        +id: number
        +conversationLimit: number
        +durationDays: number
        +isMonthly: boolean
        +organizationId: number
    }

    Organization "1" -- "1" OrganizationLimit : tiene
    OrganizationType -- Organization : define
```

## Flujo de Creación de Límites

El siguiente diagrama muestra el flujo para la creación y gestión de límites de organización:

```mermaid
flowchart TD
    A[Crear Organización] --> B{Tipo de Organización?}
    B -->|FREE| C[Crear límites fijos:<br>50 conversaciones<br>15 días<br>No mensual]
    B -->|CUSTOM| D[Crear límites configurables:<br>100 conversaciones<br>30 días<br>Mensual]
    B -->|PRODUCTION/MVP| E[Sin límites]
    
    C --> F[Guardar límites]
    D --> F
    E --> G[No se crean límites]
    
    G[Actualizar Organización] --> H{¿Cambio de tipo?}
    H -->|Sí| I[Mantener límites actuales]
    H -->|No| J[Sin cambios en límites]
    
    K[Actualizar Límites] --> L{¿Organización FREE?}
    L -->|Sí| M[Error: No se pueden<br>modificar límites FREE]
    L -->|No| N[Actualizar límites]
```

## Endpoints de API

El sistema proporciona los siguientes endpoints para gestionar los límites de organización:

```mermaid
flowchart LR
    A[Cliente] --> B[POST /organization-limits]
    A --> C[GET /organization-limits/organization/:organizationId]
    A --> D[PATCH /organization-limits/organization/:organizationId]
    A --> E[DELETE /organization-limits/organization/:organizationId]
    
    B --> F[OrganizationLimitController.create]
    C --> G[OrganizationLimitController.findByOrganizationId]
    D --> H[OrganizationLimitController.update]
    E --> I[OrganizationLimitController.remove]
    
    F --> J[OrganizationLimitService]
    G --> J
    H --> J
    I --> J
    
    J --> K[(Base de datos)]
```

## Reglas de Negocio

1. Las organizaciones FREE tienen límites fijos que no pueden ser modificados:
   - 50 conversaciones
   - 15 días de duración
   - No mensual (el límite no se restablece mensualmente)

2. Las organizaciones CUSTOM tienen límites configurables:
   - Valores predeterminados: 100 conversaciones, 30 días, mensual
   - Estos valores pueden ser modificados

3. Las organizaciones PRODUCTION y MVP no tienen límites de conversaciones.
   - No se crean registros de límites para estas organizaciones
   - No es posible crear o modificar límites para estas organizaciones

4. Solo los usuarios con roles ADMIN y OWNER pueden crear y modificar límites.

5. Los usuarios con rol SUPERVISOR pueden ver los límites pero no modificarlos.

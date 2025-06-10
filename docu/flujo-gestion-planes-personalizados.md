# Flujo de Gestión de Planes Personalizados

## Descripción
Este documento describe los flujos de gestión de planes personalizados en la plataforma Sofia Chat. Incluye los procesos para solicitar un plan personalizado por parte de un usuario, la aprobación y configuración de planes personalizados por parte de superadministradores, y la actualización de detalles de planes personalizados.

## Responsabilidades

### Componentes Involucrados
- **PlanController**: Maneja las solicitudes HTTP relacionadas con planes.
- **PlanService**: Contiene la lógica de negocio para la gestión de planes.
- **UserOrganizationRepository**: Verifica la pertenencia de usuarios a organizaciones.
- **OrganizationRepository**: Gestiona la información de organizaciones y sus planes.
- **NotificationService**: Envía notificaciones a usuarios relevantes.
- **EmailService**: Envía correos electrónicos de notificación.

### Ubicación en el Proyecto
- `/src/modules/plan/plan.controller.ts`
- `/src/modules/plan/plan.service.ts`
- `/src/modules/plan/dto/request-custom-plan.dto.ts`

## Diagrama de Flujo

```mermaid
sequenceDiagram
    participant Client as User/Client App
    participant PlanController
    participant PlanService
    participant UserOrganizationRepo
    participant OrganizationRepo
    participant UserRepo
    participant EmailService
    participant NotificationService
    participant ConfigService
    participant JwtAuthGuard
    participant SuperAdminGuard

    %% Flow 1: User Requesting a Custom Plan
    Note over Client, PlanController: User Requests a Custom Plan
    Client->>+PlanController: POST /api/plan/request-custom (dto: {organizationId})
    PlanController->>JwtAuthGuard: Validate Token
    JwtAuthGuard-->>PlanController: User Authenticated (req.user set)
    PlanController->>+PlanService: requestCustomPlan(dto.organizationId, req.user.id)
    PlanService->>+UserOrganizationRepo: findOne({user: {id: userId}, organization: {id: organizationId}})
    UserOrganizationRepo-->>-PlanService: userOrgLink / null
    alt User not member of Organization or link not found
        PlanService-->>PlanController: ForbiddenException
        PlanController-->>Client: 403 Forbidden
    else User is member of Organization
        PlanService->>+OrganizationRepo: findOne({ where: { id: organizationId } })
        OrganizationRepo-->>-PlanService: organization / null
        alt Organization Not Found
            PlanService-->>PlanController: NotFoundException
            PlanController-->>Client: 404 Not Found
        else Organization Found
            PlanService->>+UserRepo: findOne({ where: { id: userId } })
            UserRepo-->>-PlanService: requestingUser / null
            alt Requesting User Not Found
                PlanService-->>PlanController: NotFoundException
                PlanController-->>Client: 404 Not Found
            else User Found
                PlanService->>+ConfigService: get('CUSTOM_PLAN_REQUEST_RECIPIENT_EMAIL')
                ConfigService-->>-PlanService: recipientEmail
                PlanService->>+EmailService: sendCustomPlanRequestEmail(recipientEmail, orgName, userEmail, userName)
                EmailService-->>-PlanService: (Email Sent)
                PlanService->>+NotificationService: createNotificationForOrganization(organizationId, type: CUSTOM_PLAN_REQUEST, title, metadata)
                NotificationService-->>-PlanService: (Notification Created)
                PlanService-->>-PlanController: (Success)
                PlanController-->>-Client: 202 Accepted { message }
            end
        end
    end

    %% Flow 2: Super Admin Setting an Organization's Plan to Custom
    Note over Client, PlanController: Super Admin Sets Plan to Custom
    Client->>+PlanController: PATCH /api/plan/:organizationId/set-custom
    PlanController->>JwtAuthGuard: Validate Token
    JwtAuthGuard-->>PlanController: User Authenticated
    PlanController->>SuperAdminGuard: Validate Super Admin
    SuperAdminGuard-->>PlanController: User is Super Admin
    PlanController->>+PlanService: setPlanToCustomBySuperAdmin(organizationId)
    PlanService->>+OrganizationRepo: findOne({ where: { id: organizationId } })
    OrganizationRepo-->>-PlanService: organization / null
    alt Organization Not Found
        PlanService-->>PlanController: NotFoundException
        PlanController-->>Client: 404 Not Found
    else Organization Found
        PlanService->>PlanService: organization.type = OrganizationType.CUSTOM
        PlanService->>+OrganizationRepo: save(organization)
        OrganizationRepo-->>-PlanService: updatedOrganization
        PlanService-->>-PlanController: updatedOrganization
        PlanController-->>-Client: 200 OK { updatedOrganization }
    end

    %% Flow 3: Super Admin Updating Custom Plan Details
    Note over Client, PlanController: Super Admin Updates Custom Plan Details
    Client->>+PlanController: PATCH /api/plan/:organizationId/details (dto: UpdateCustomPlanDto)
    PlanController->>JwtAuthGuard: Validate Token
    JwtAuthGuard-->>PlanController: User Authenticated
    PlanController->>SuperAdminGuard: Validate Super Admin
    SuperAdminGuard-->>PlanController: User is Super Admin
    PlanController->>+PlanService: updateCustomPlanDetailsBySuperAdmin(organizationId, dto)
    PlanService->>+OrganizationRepo: findOne({ where: { id: organizationId } })
    OrganizationRepo-->>-PlanService: organization / null
    alt Organization Not Found
        PlanService-->>PlanController: NotFoundException
        PlanController-->>Client: 404 Not Found
    else Organization Found
        alt Organization is not on CUSTOM plan
            PlanService-->>PlanController: BadRequestException("Organization is not on a custom plan.")
            PlanController-->>Client: 400 Bad Request
        else Organization is on CUSTOM plan
            PlanService->>PlanService: organization.conversationCount = dto.conversationCount (and other updatable fields)
            PlanService->>+OrganizationRepo: save(organization)
            OrganizationRepo-->>-PlanService: updatedOrganization
            PlanService-->>-PlanController: updatedOrganization
            PlanController-->>-Client: 200 OK { updatedOrganization }
        end
    end

```
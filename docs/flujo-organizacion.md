# Flujo de Creación de Organizaciones

Este documento describe el flujo de creación de organizaciones en el backend de Converxa Chat.

## Flujo de Creación de Organización

```mermaid
sequenceDiagram
    participant Cliente
    participant OrgController as OrganizationController
    participant OrgService as OrganizationService
    participant UserService
    participant FileService
    participant EmailService
    participant BD as Base de Datos

    Cliente->>OrgController: POST /api/organization
    Note over Cliente, OrgController: Envía datos de organización, email y logo

    OrgController->>OrgController: Verifica si usuario es superadmin
    OrgController->>OrgService: createOrganization(dto, file, isSuperUser)
    
    alt Usuario no es superadmin
        OrgService->>BD: Consulta organizaciones del usuario
        BD-->>OrgService: Organizaciones del usuario
        
        alt Usuario ya tiene una organización
            OrgService-->>OrgController: ConflictException
            OrgController-->>Cliente: 409 Conflict
        end
    end
    
    OrgService->>BD: Crea organización
    BD-->>OrgService: Organización creada
    
    OrgService->>FileService: saveFile(file, path, 'logo')
    FileService-->>OrgService: URL del logo
    
    OrgService->>BD: Actualiza organización con logo
    
    OrgService->>UserService: getUserForEmailOrCreate(email)
    
    alt Usuario no existe
        UserService->>UserService: generateRandomPassword()
        UserService->>BD: Crea usuario con contraseña generada
        BD-->>UserService: Usuario creado
        UserService->>EmailService: sendUserWellcome(email, password)
        UserService-->>OrgService: {created: true, user, password}
    else Usuario existe
        UserService->>BD: Consulta usuario
        BD-->>UserService: Usuario existente
        UserService-->>OrgService: {created: false, user}
    end
    
    OrgService->>BD: Crea relación UserOrganization (OWNER)
    OrgService->>EmailService: sendNewOrganizationEmail(email, password, orgName)
    
    OrgService-->>OrgController: Organización creada
    OrgController-->>Cliente: 200 OK {ok: true, organization}
```

## Reglas importantes

1. **Limitación para usuarios normales**: Un usuario normal (no superadmin) solo puede crear una organización. Si intenta crear más, recibirá un error.

2. **Superadmins**: Los superadmins pueden crear múltiples organizaciones sin restricciones.

3. **Creación de usuarios**: Si el email proporcionado no corresponde a un usuario existente, se creará automáticamente un nuevo usuario con:
   - Email proporcionado
   - Contraseña generada aleatoriamente
   - Se enviará un email de bienvenida con la contraseña

4. **Asignación de roles**: El usuario proporcionado (existente o nuevo) será asignado como OWNER de la organización.

5. **Logo**: Cada organización debe tener un logo, que se guarda en el sistema de archivos.

## Responsabilidades

- **OrganizationController**: Maneja las solicitudes HTTP y verifica si el usuario es superadmin.
- **OrganizationService**: Gestiona la creación de organizaciones y la asignación de usuarios.
- **UserService**: Busca o crea usuarios según sea necesario.
- **FileService**: Maneja el almacenamiento de archivos (logo).
- **EmailService**: Envía notificaciones por email.

## Endpoints relacionados

- `POST /api/organization`: Crea una nueva organización
- `GET /api/organization/my-organizations`: Obtiene las organizaciones del usuario actual
- `GET /api/organization`: Obtiene todas las organizaciones (solo superadmin)

# Flujo de Autenticación

Este documento describe los diferentes flujos de autenticación implementados en el backend de Converxa Chat.

## Flujo de Autenticación con Email y Contraseña

```mermaid
sequenceDiagram
    participant Cliente
    participant AuthController
    participant AuthService
    participant UserService
    participant BD as Base de Datos

    Cliente->>AuthController: POST /api/auth/log-in
    AuthController->>AuthService: logIn(email, password)
    AuthService->>UserService: userExistByEmail(email)
    UserService->>BD: Consulta usuario
    BD-->>UserService: Datos usuario
    UserService-->>AuthService: Usuario
    
    alt Usuario no existe
        AuthService-->>AuthController: NotFoundException
        AuthController-->>Cliente: 404 Not Found
    else Usuario existe
        AuthService->>UserService: findByEmailWithPassword(email)
        UserService->>BD: Consulta contraseña
        BD-->>UserService: Contraseña hash
        UserService-->>AuthService: Contraseña hash
        
        alt Contraseña incorrecta
            AuthService-->>AuthController: UnauthorizedException
            AuthController-->>Cliente: 401 Unauthorized
        else Contraseña correcta
            AuthService->>UserService: updateLastLogin(user)
            UserService->>BD: Actualiza last_login
            AuthService->>AuthService: generateAccessRefreshToken(req, user)
            AuthService->>AuthService: generateAccessToken(userId, sessionId)
            AuthService-->>AuthController: { ok: true, token, refreshToken }
            AuthController-->>Cliente: 200 OK { token, refreshToken }
        end
    end
```

## Flujo de Autenticación con Google

```mermaid
sequenceDiagram
    participant Cliente
    participant AuthController
    participant AuthService
    participant UserService
    participant Google as Google API
    participant BD as Base de Datos

    Cliente->>AuthController: POST /api/auth/google-login
    AuthController->>AuthService: googleLogin(request, googleLoginDto)
    
    AuthService->>Google: GET /oauth2/v3/userinfo
    Google-->>AuthService: Información del usuario
    
    AuthService->>UserService: findByEmailComplete(email)
    UserService->>BD: Consulta usuario
    BD-->>UserService: Datos usuario
    UserService-->>AuthService: Usuario
    
    alt Usuario no existe
        AuthService->>UserService: createUserFromGoogle(newUser)
        UserService->>BD: Crea usuario
        BD-->>UserService: Usuario creado
        UserService-->>AuthService: Usuario creado
    else Usuario existe
        AuthService->>UserService: updateGoogleInfo(userId, data)
        UserService->>BD: Actualiza información Google
    end
    
    AuthService->>UserService: updateLastLogin(user)
    UserService->>BD: Actualiza last_login
    
    AuthService->>AuthService: generateAccessRefreshToken(req, user)
    AuthService->>AuthService: generateAccessToken(userId, sessionId)
    AuthService-->>AuthController: { ok: true, token, refreshToken }
    AuthController-->>Cliente: 200 OK { token, refreshToken }
```

## Flujo de Refresco de Token

```mermaid
sequenceDiagram
    participant Cliente
    participant AuthController
    participant AuthService
    participant SessionService
    participant BD as Base de Datos

    Cliente->>AuthController: POST /api/auth/refresh-token
    AuthController->>AuthService: refreshToken(refreshTokenDto)
    AuthService->>AuthService: validateAccessRefreshToken(refreshToken)
    
    alt Token inválido o expirado
        AuthService-->>AuthController: UnauthorizedException
        AuthController-->>Cliente: 401 Unauthorized
    else Token válido
        AuthService->>SessionService: findById(sessionId)
        SessionService->>BD: Consulta sesión
        BD-->>SessionService: Datos sesión
        SessionService-->>AuthService: Sesión
        
        alt Sesión no existe
            AuthService-->>AuthController: UnauthorizedException
            AuthController-->>Cliente: 401 Unauthorized
        else Sesión existe
            AuthService->>AuthService: generateAccessToken(userId, sessionId)
            AuthService-->>AuthController: { ok: true, token }
            AuthController-->>Cliente: 200 OK { token }
        end
    end
```

## Flujo de Cierre de Sesión

```mermaid
sequenceDiagram
    participant Cliente
    participant AuthController
    participant AuthService
    participant SessionService
    participant BD as Base de Datos

    Cliente->>AuthController: POST /api/auth/log-out
    AuthController->>AuthService: removeSession(user, sessionId)
    AuthService->>SessionService: removeByIds(user, sessionId)
    SessionService->>BD: Elimina sesión
    BD-->>SessionService: Confirmación
    SessionService-->>AuthService: Void
    AuthService-->>AuthController: Void
    AuthController-->>Cliente: 200 OK { ok: true }
```

## Flujo de Registro (Sign Up)

```mermaid
sequenceDiagram
    participant Cliente
    participant AuthController
    participant AuthService
    participant UserService
    participant OrganizationService
    participant DepartmentService
    participant FileService
    participant Google as Google API
    participant BD as Base de Datos

    Cliente->>AuthController: POST /api/auth/sign-up (multipart/form-data)
    AuthController->>AuthService: signUp(request, signUpDto, logo)
    
    alt Con token de Google
        AuthService->>Google: Verificar token
        Google-->>AuthService: Información del usuario
        AuthService->>UserService: findByEmailComplete(email)
        UserService->>BD: Consulta usuario
        BD-->>UserService: Datos usuario
        
        alt Usuario no existe
            AuthService->>UserService: Crear usuario con datos de Google
            UserService->>BD: Crea usuario
            BD-->>UserService: Usuario creado
        else Usuario existe con Google ID
            AuthService-->>AuthController: ConflictException
            AuthController-->>Cliente: 409 Conflict
        end
    else Sin token de Google
        AuthService->>UserService: findByEmailComplete(email)
        UserService->>BD: Consulta usuario
        BD-->>UserService: Datos usuario
        
        alt Usuario existe
            AuthService-->>AuthController: ConflictException
            AuthController-->>Cliente: 409 Conflict
        else Usuario no existe
            AuthService->>UserService: getUserForEmailOrCreate(email)
            UserService->>BD: Crea usuario con contraseña temporal
            BD-->>UserService: Usuario creado
            AuthService->>UserService: updateGlobalUser(datos)
            AuthService->>UserService: changePasswordAsAdmin(contraseña)
        end
    end
    
    AuthService->>OrganizationService: createOrganization(datos, logo)
    OrganizationService->>BD: Crea organización
    BD-->>OrganizationService: Organización creada
    
    alt Con logo
        OrganizationService->>FileService: saveFile(logo)
        FileService->>BD: Guarda logo
        OrganizationService->>BD: Actualiza URL del logo
    end
    
    OrganizationService->>BD: Asigna usuario como OWNER
    
    AuthService->>DepartmentService: create(departamento)
    DepartmentService->>BD: Crea departamento
    BD-->>DepartmentService: Departamento creado
    
    AuthService->>AuthService: generateAccessRefreshToken(req, user)
    AuthService->>AuthService: generateAccessToken(userId, sessionId)
    AuthService->>EmailService: sendUserWellcome(email, '********')
    
    AuthService-->>AuthController: { ok: true, token, refreshToken }
    AuthController-->>Cliente: 200 OK { token, refreshToken }
```

## Integración con el Sistema Existente

La implementación de la autenticación con Google se integra perfectamente con el sistema de autenticación existente:

1. **Tokens JWT**: Tanto la autenticación con email/contraseña como la autenticación con Google utilizan el mismo sistema de tokens JWT para mantener la sesión del usuario.

2. **Sesiones**: Ambos métodos de autenticación crean sesiones en la base de datos, lo que permite al usuario gestionar sus sesiones activas.

3. **Perfil de Usuario**: La información del perfil de Google (nombre, imagen) se almacena en el perfil del usuario, enriqueciendo la información disponible.

4. **Verificación de Email**: Los usuarios que se autentican con Google tienen su email marcado automáticamente como verificado, ya que Google ya ha verificado su identidad.

5. **Jerarquía de Autenticación**: La autenticación con Google tiene prioridad sobre la autenticación con contraseña. Si un usuario ya tiene una cuenta con Google, no podrá registrarse con contraseña usando el mismo email.

6. **Registro Completo**: El proceso de registro incluye la creación de una organización y un departamento, asignando al usuario como propietario (OWNER) de la organización.

Esta integración permite a los usuarios utilizar cualquiera de los métodos de autenticación de forma intercambiable, mejorando la experiencia de usuario y facilitando el acceso a la plataforma.

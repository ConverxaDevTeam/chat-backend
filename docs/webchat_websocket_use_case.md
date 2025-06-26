# WebChat WebSocket - Flujo de Inicialización

## Qué hace
Maneja la conexión WebSocket para el chat web, desde la inicialización hasta el envío de conversaciones existentes.

## Diagrama de flujo

```mermaid
flowchart TD
    A[Cliente conecta WebSocket] --> B[Extraer origin del request]
    B --> C[Escuchar mensaje 'init']
    C --> D[Parsear JSON del mensaje]
    D --> E[Buscar integración por ID]
    E --> F{¿Integración existe?}
    F -->|No| G[Error: Integration not found]
    F -->|Sí| H[Buscar departamento por integration.departamento.id]
    H --> I{¿Departamento existe?}
    I -->|No| J[Error: Department not found]
    I -->|Sí| K[Verificar CORS contra origin]
    K --> L{¿CORS válido?}
    L -->|No| M[Error: CORS not allowed]
    L -->|Sí| N{¿Usuario y secreto presentes?}
    N -->|No| O[Crear nuevo ChatUser]
    N -->|Sí| P[Verificar secreto del usuario]
    O --> Q[Registrar cliente WebSocket]
    P --> R{¿Secreto válido?}
    R -->|No| O
    R -->|Sí| S[Buscar usuario existente]
    S --> T{¿Usuario encontrado?}
    T -->|No| U[Error: Not initialized]
    T -->|Sí| V[Registrar cliente y actualizar login]
    Q --> W[Enviar set-user y conversaciones vacías]
    V --> X[Enviar conversaciones existentes]
    W --> Y[Usuario listo para operar]
    X --> Y
    G --> Z[Cerrar conexión]
    J --> Z
    M --> Z
    U --> Z
```

## Componentes y responsabilidades

### WebChatSocketGateway
- **Ubicación**: `src/modules/socket/socket.gateway.ts`
- **Responsabilidad**: Manejar conexiones WebSocket y flujo de inicialización
- **Métodos clave**:
  - `onModuleInit()`: Configurar servidor WebSocket
  - `bindServer()`: Vincular servidor HTTP para upgrade

### IntegrationService
- **Ubicación**: `src/modules/integration/integration.service.ts`
- **Responsabilidad**: Obtener configuración de integración y departamento
- **Métodos utilizados**:
  - `getIntegrationWebChatById()`
  - `getDepartamentoById()`

### ChatUserService
- **Ubicación**: `src/modules/chat-user/chat-user.service.ts`
- **Responsabilidad**: Gestionar usuarios del chat web
- **Métodos utilizados**:
  - `createChatUserWeb()`
  - `findByIdWithSecret()`
  - `findById()`
  - `updateLastLogin()`

### SocketService
- **Ubicación**: `src/modules/socket/socket.service.ts`
- **Responsabilidad**: Registrar y gestionar clientes WebSocket
- **Métodos utilizados**:
  - `registerWebChatClient()`
  - `removeWebChatClient()`

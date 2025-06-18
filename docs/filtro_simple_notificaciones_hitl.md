# Filtrado Simple de Notificaciones para Usuarios HITL

## Descripción
Implementación simple que filtra las notificaciones de sistema para usuarios con rol HITL únicamente en el WebSocket y en el endpoint de consulta de notificaciones, sin modificar la creación de notificaciones en la base de datos.

## Problema
Los usuarios HITL estaban recibiendo notificaciones de sistema generales que no requerían su intervención especializada, creando ruido innecesario en su flujo de trabajo.

## Solución Implementada

### 1. Filtrado en WebSocket (SocketService)
Añadido filtrado en el método `sendNotificationToOrganization()` para evitar enviar notificaciones de escalamiento general a usuarios HITL conectados:

```typescript
// En sendNotificationToOrganization()
for (const clientId of listRonnOrganization) {
  const clientData = this.connectedClients.getClientById(clientId);

  if (clientData) {
    // Verificar si el usuario es HITL
    const userOrg = await this.userOrganizationRepository.findOne({
      where: {
        user: { id: clientData.userId },
        organizationId: organizationId,
      },
    });

    // Si es HITL y es notificación de escalamiento general, no enviar
    if (userOrg?.role === OrganizationRoleType.HITL && event.type === NotificationType.MESSAGE_RECEIVED) {
      console.log(`[SOCKET FILTER] No enviando notificación de sistema a usuario HITL ${clientData.userId}`);
      continue;
    }
  }

  this.socketServer.to(clientId).emit('notification', event);
}
```

### 2. Filtrado en Consultas (NotificationService)
El método `findUnreadNotificationsByRole()` ya tenía el filtrado correcto implementado:

```typescript
case OrganizationRoleType.HITL:
  // HITL: solo recibe notificaciones que le están asignadas directamente
  queryBuilder.andWhere('notification.userId = :userId', { userId });
  break;

case OrganizationRoleType.OWNER:
case OrganizationRoleType.ADMIN:
case OrganizationRoleType.USER:
  // Otros: reciben notificaciones propias + organizacionales
  queryBuilder.andWhere('(notification.userId = :userId OR (notification.userId IS NULL AND notification

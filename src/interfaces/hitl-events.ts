export enum HitlEventType {
  TYPE_CREATED = 'hitl.type.created',
  TYPE_UPDATED = 'hitl.type.updated',
  TYPE_DELETED = 'hitl.type.deleted',
  USER_ASSIGNED = 'hitl.user.assigned',
  USER_REMOVED = 'hitl.user.removed',
}

export interface HitlEvent {
  type: HitlEventType;
  organizationId: number;
  hitlTypeId?: number;
  hitlTypeName?: string;
  userId?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface HitlTypeCreatedEvent extends HitlEvent {
  type: HitlEventType.TYPE_CREATED;
  hitlTypeId: number;
  hitlTypeName: string;
}

export interface HitlTypeUpdatedEvent extends HitlEvent {
  type: HitlEventType.TYPE_UPDATED;
  hitlTypeId: number;
  hitlTypeName: string;
}

export interface HitlTypeDeletedEvent extends HitlEvent {
  type: HitlEventType.TYPE_DELETED;
  hitlTypeId: number;
  hitlTypeName: string;
}

export interface HitlUserAssignedEvent extends HitlEvent {
  type: HitlEventType.USER_ASSIGNED;
  hitlTypeId: number;
  hitlTypeName: string;
  userId: number;
}

export interface HitlUserRemovedEvent extends HitlEvent {
  type: HitlEventType.USER_REMOVED;
  hitlTypeId: number;
  hitlTypeName: string;
  userId: number;
}

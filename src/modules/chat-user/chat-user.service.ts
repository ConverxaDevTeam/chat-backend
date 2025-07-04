import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUser, ChatUserType } from '@models/ChatUser.entity';
import { UserOrganization, OrganizationRoleType } from '@models/UserOrganization.entity';
import { Message, MessageType } from '@models/Message.entity';
import { User } from '@models/User.entity';
import { ChatUserDataService } from '@modules/chat-user-data/chat-user-data.service';
import { ChatUserOptimizedService } from './chat-user-optimized.service';
import { ChatUsersOrganizationDto, ChatUsersOrganizationResponse, PaginationMeta, ConversationStatus, ChatUserWithLastConversation } from './dto/chat-users-organization.dto';
import { BulkUpdateChatUserDto, BulkUpdateResponse } from './dto/bulk-update-chat-user.dto';
import { WebhookFacebookDto } from '@modules/facebook/dto/webhook-facebook.dto';

@Injectable()
export class ChatUserService {
  private readonly logger = new Logger(ChatUserService.name);

  constructor(
    @InjectRepository(ChatUser)
    private chatUserRepository: Repository<ChatUser>,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private chatUserDataService: ChatUserDataService,
    private chatUserOptimizedService: ChatUserOptimizedService,
  ) {}

  async findByIdWithSecret(id: number): Promise<ChatUser | null> {
    return await this.chatUserRepository.findOne({
      where: { id },
      select: { id: true, secret: true },
    });
  }

  async createChatUser(): Promise<ChatUser> {
    const chatUser = this.chatUserRepository.create();
    return await this.chatUserRepository.save(chatUser);
  }

  async createChatUserWeb(origin: string, operatingSystem: string): Promise<ChatUser> {
    const chatUser = this.chatUserRepository.create({
      secret: Math.random().toString(36).substring(2),
      type: ChatUserType.CHAT_WEB,
      web: origin,
      last_login: new Date(),
      operating_system: operatingSystem,
    });
    return await this.chatUserRepository.save(chatUser);
  }

  async updateLastLogin(chatUser: ChatUser): Promise<ChatUser> {
    chatUser.last_login = new Date();
    await this.chatUserRepository.save(chatUser);
    return chatUser;
  }

  async findById(id: number): Promise<ChatUser | null> {
    const chatUser = await this.chatUserRepository.findOne({
      where: { id },
    });
    return chatUser || null;
  }

  async createChatUserFacebook(identified: string, type: ChatUserType): Promise<ChatUser> {
    const chatUser = this.chatUserRepository.create({
      identified,
      type,
    });
    return await this.chatUserRepository.save(chatUser);
  }

  async createChatUserWhatsApp(identified: string, webhookFacebookDto: WebhookFacebookDto): Promise<ChatUser> {
    const chatUser = this.chatUserRepository.create({
      identified,
      type: ChatUserType.WHATSAPP,
      phone: identified,
      name: webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name,
    });
    return await this.chatUserRepository.save(chatUser);
  }

  async findByIdentifiedId(identifiedId: string): Promise<ChatUser | null> {
    return await this.chatUserRepository.findOne({ where: { identified: identifiedId } });
  }

  async updateUserInfo(chatUserId: number, field: string, value: string): Promise<ChatUser> {
    const chatUser = await this.chatUserRepository.findOne({ where: { id: chatUserId } });

    if (!chatUser) {
      throw new BadRequestException('Usuario de chat no encontrado');
    }

    // Validar que el campo sea editable
    const editableFields = ['name', 'email', 'phone', 'address', 'avatar'];
    if (!editableFields.includes(field)) {
      throw new BadRequestException(`El campo '${field}' no es editable`);
    }

    // Actualizar el campo
    (chatUser as any)[field] = value;

    // Guardar cambios
    const updatedUser = await this.chatUserRepository.save(chatUser);

    // Validar que el campo fue actualizado
    if ((updatedUser as any)[field] !== value) {
      throw new BadRequestException(`Error al actualizar el campo '${field}'`);
    }

    return updatedUser;
  }

  async saveCustomUserData(chatUserId: number, key: string, value: string): Promise<void> {
    await this.chatUserDataService.createOrUpdate(chatUserId, key, value);
  }

  async getUserCompleteInfo(chatUserId: number): Promise<{
    standardInfo: Partial<ChatUser>;
    customData: Record<string, string>;
  }> {
    const chatUser = await this.chatUserRepository.findOne({
      where: { id: chatUserId },
      select: ['id', 'name', 'email', 'phone', 'address', 'avatar', 'web', 'browser', 'operating_system', 'ip', 'identified', 'type', 'last_login', 'created_at', 'updated_at'],
    });

    // Obtener el secret por separado ya que está marcado como select: false
    const secretQuery = await this.chatUserRepository.findOne({
      where: { id: chatUserId },
      select: ['secret'],
    });

    if (!chatUser) {
      throw new BadRequestException(`ChatUser con ID ${chatUserId} no encontrado`);
    }

    const customDataArray = await this.chatUserDataService.findAllByUser(chatUserId);
    const customData = customDataArray.reduce(
      (acc, item) => {
        acc[item.key] = item.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      standardInfo: {
        ...chatUser,
        secret: secretQuery?.secret,
      },
      customData,
    };
  }

  async getAllUsersWithInfo(
    page: number = 1,
    limit: number = 10,
    organizationId?: number,
    search?: string,
    type?: ChatUserType,
    sortBy: string = 'last_activity',
    sortOrder: string = 'DESC',
    needHuman?: boolean,
    hasUnreadMessages?: boolean,
    dateFrom?: string,
    dateTo?: string,
    includeMessages?: boolean,
  ): Promise<{
    users: Array<{
      standardInfo: Partial<ChatUser>;
      customData: Record<string, string>;
      lastConversation?: {
        conversation_id: number;
        last_message_text: string;
        last_message_created_at: string;
        last_message_type: string;
        unread_messages: number;
        need_human: boolean;
        assigned_user_id: number | null;
        integration_type: string;
        department: string;
        last_activity: string;
        status: string;
        messages?: Array<{
          id: number;
          text: string;
          type: string;
          format: string;
          created_at: string;
          images?: string[];
          audio?: string;
          time?: number;
        }>;
      };
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    // OPTIMIZACIÓN: Usar servicio optimizado que hace 1-2 queries en lugar de N+1
    return await this.chatUserOptimizedService.getAllUsersWithInfoOptimized(
      page,
      limit,
      organizationId,
      search,
      type,
      sortBy,
      sortOrder,
      needHuman,
      hasUnreadMessages,
      dateFrom,
      dateTo,
      includeMessages,
    );
  }

  private async getLastConversationInfo(chatUserId: number, organizationId?: number): Promise<any | null> {
    // Este método ya no se usa - se mantiene por compatibilidad
    return null;
  }

  async bulkUpdateChatUser(id: number, updateData: BulkUpdateChatUserDto): Promise<BulkUpdateResponse> {
    try {
      const chatUser = await this.chatUserRepository.findOne({ where: { id } });

      if (!chatUser) {
        throw new BadRequestException('Usuario de chat no encontrado');
      }

      const result: BulkUpdateResponse = {
        ok: true,
        message: 'Actualización masiva completada',
        data: {
          standardFields: {
            updated: [],
            errors: [],
          },
          customFields: {
            updated: [],
            errors: [],
          },
        },
      };

      // Actualizar campos estándar
      if (updateData.standardFields) {
        // Solo campos editables por el usuario (excluir campos técnicos)
        const editableFields = ['name', 'email', 'phone', 'address', 'avatar'];
        const readOnlyFields = ['web', 'browser', 'operating_system', 'ip'];

        for (const [field, value] of Object.entries(updateData.standardFields)) {
          if (value !== undefined && value !== null) {
            if (editableFields.includes(field)) {
              try {
                chatUser[field] = value;
                result.data.standardFields.updated.push(field);
                this.logger.debug(`Campo estándar ${field} actualizado a: ${value}`);
              } catch (error) {
                result.data.standardFields.errors.push({
                  field,
                  error: error.message || 'Error desconocido',
                });
                this.logger.error(`Error actualizando campo ${field}:`, error);
              }
            } else if (readOnlyFields.includes(field)) {
              result.data.standardFields.errors.push({
                field,
                error: 'Este campo es de solo lectura y no puede ser editado',
              });
              this.logger.warn(`Intento de editar campo de solo lectura: ${field}`);
            }
          }
        }
      }

      // Guardar cambios en campos estándar
      if (result.data.standardFields.updated.length > 0) {
        await this.chatUserRepository.save(chatUser);
      }

      // Actualizar campos personalizados
      if (updateData.customFields) {
        for (const [field, value] of Object.entries(updateData.customFields)) {
          if (value !== undefined && value !== null) {
            try {
              await this.saveCustomUserData(id, field, value);
              result.data.customFields.updated.push(field);
              this.logger.debug(`Campo personalizado ${field} actualizado a: ${value}`);
            } catch (error) {
              result.data.customFields.errors.push({
                field,
                error: error.message || 'Error desconocido',
              });
              this.logger.error(`Error actualizando campo personalizado ${field}:`, error);
            }
          }
        }
      }

      // Obtener usuario actualizado
      const updatedUser = await this.chatUserRepository.findOne({ where: { id } });
      result.data.updatedUser = updatedUser;

      // Actualizar mensaje basado en resultados
      const totalUpdated = result.data.standardFields.updated.length + result.data.customFields.updated.length;
      const totalErrors = result.data.standardFields.errors.length + result.data.customFields.errors.length;

      if (totalUpdated > 0 && totalErrors === 0) {
        result.message = `Se actualizaron ${totalUpdated} campos correctamente`;
      } else if (totalUpdated > 0 && totalErrors > 0) {
        result.message = `Se actualizaron ${totalUpdated} campos correctamente, ${totalErrors} campos con errores`;
      } else if (totalErrors > 0) {
        result.message = `Error: No se pudo actualizar ningún campo (${totalErrors} errores)`;
        result.ok = false;
      } else {
        result.message = 'No se proporcionaron campos para actualizar';
      }

      return result;
    } catch (error) {
      this.logger.error(`Error en actualización masiva del usuario ${id}:`, error);
      throw new BadRequestException(`Error actualizando usuario: ${error.message}`);
    }
  }

  async findChatUsersByOrganizationWithLastConversation(organizationId: number, user: User, searchParams: ChatUsersOrganizationDto): Promise<ChatUsersOrganizationResponse> {
    // Verificar que el usuario pertenece a la organización
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: { user: { id: user.id }, organizationId },
    });

    if (!userOrganization) {
      throw new BadRequestException('El usuario no pertenece a esta organización');
    }

    // Configuración de paginación
    const page = searchParams?.page || 1;
    const limit = searchParams?.limit || 20;
    const offset = (page - 1) * limit;

    try {
      // QUERY OPTIMIZADA ESPECÍFICA para este endpoint que obtiene la conversación más reciente por último mensaje
      const query = `
        WITH latest_messages AS (
          SELECT DISTINCT ON (m."conversationId")
            m."conversationId",
            m.text as last_message_text,
            m.created_at as last_message_created_at,
            m.type as last_message_type,
            ROW_NUMBER() OVER (PARTITION BY c."chatUserId" ORDER BY m.created_at DESC) as user_msg_rank
          FROM "Messages" m
          INNER JOIN "Conversations" c ON c.id = m."conversationId"
          INNER JOIN "departamento" d ON d.id = c."departamentoId"
          INNER JOIN "Organizations" org ON org.id = d.organization_id
          WHERE org.id = $1
            AND c.user_deleted = false
            AND c.deleted_at IS NULL
            AND m.deleted_at IS NULL
          ORDER BY m."conversationId", m.created_at DESC
        ),
        latest_conversations AS (
          SELECT DISTINCT ON (c."chatUserId")
            c."chatUserId",
            c.id as conversation_id,
            c.created_at as conversation_created_at,
            c.need_human,
            c.type as integration_type,
            c."userId" as assigned_user_id,
            d.name as department,
            lm.last_message_text,
            lm.last_message_created_at,
            lm.last_message_type
          FROM "Conversations" c
          INNER JOIN "departamento" d ON d.id = c."departamentoId"
          INNER JOIN "Organizations" org ON org.id = d.organization_id
          INNER JOIN latest_messages lm ON lm."conversationId" = c.id
          WHERE org.id = $1
            AND c.user_deleted = false
            AND c.deleted_at IS NULL
            AND lm.user_msg_rank = 1
          ORDER BY c."chatUserId", lm.last_message_created_at DESC
        )
        SELECT
          cu.id as chat_user_id,
          cu.name as user_name,
          cu.email as user_email,
          cu.phone as user_phone,
          cu.avatar,
          cu.secret,
          cu.identified as identifier,
          lc.conversation_id,
          lc.last_message_text,
          lc.last_message_created_at,
          lc.last_message_type,
          lc.need_human,
          lc.assigned_user_id,
          lc.integration_type,
          lc.department,
          lc.last_message_created_at as last_activity,
          0 as unread_messages,
          COUNT(*) OVER() as total_count
        FROM "ChatUsers" cu
        INNER JOIN latest_conversations lc ON lc."chatUserId" = cu.id
        WHERE 1=1
      `;

      const queryParams: any[] = [organizationId];
      let paramIndex = 2;
      let filterConditions: string[] = [];

      // Aplicar filtros específicos
      if (searchParams?.searchType === 'id' && searchParams?.searchValue) {
        filterConditions.push(`cu.id::text ILIKE $${paramIndex}`);
        queryParams.push(`%${searchParams.searchValue}%`);
        paramIndex++;
      }

      if (searchParams?.searchType === 'name' && searchParams?.searchValue) {
        filterConditions.push(`cu.name IS NOT NULL AND cu.name ILIKE $${paramIndex}`);
        queryParams.push(`%${searchParams.searchValue}%`);
        paramIndex++;
      }

      if (searchParams?.needHuman !== undefined) {
        filterConditions.push(`lc.need_human = $${paramIndex}`);
        queryParams.push(searchParams.needHuman);
        paramIndex++;
      }

      if (searchParams?.assignedToMe || userOrganization.role === OrganizationRoleType.HITL) {
        filterConditions.push(`lc.assigned_user_id = $${paramIndex}`);
        queryParams.push(user.id);
        paramIndex++;
      }

      // Agregar filtros si existen
      let finalQuery = query;
      if (filterConditions.length > 0) {
        finalQuery += ` AND ${filterConditions.join(' AND ')}`;
      }

      // Ordenamiento
      const sortBy = searchParams?.sortBy || 'last_activity';
      const sortOrder = searchParams?.sortOrder || 'DESC';
      let orderField = 'lc.last_message_created_at';

      if (sortBy === 'user_name') {
        orderField = 'cu.name';
      } else if (sortBy === 'created_at') {
        orderField = 'cu.created_at';
      }

      finalQuery += ` ORDER BY ${orderField} ${sortOrder}`;

      // Paginación
      finalQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      this.logger.debug(`Query optimizada: ${finalQuery}`);
      this.logger.debug(`Params: ${JSON.stringify(queryParams)}`);

      const results = await this.chatUserRepository.manager.query(finalQuery, queryParams);
      const total = results.length > 0 ? parseInt(results[0].total_count) : 0;

      // Formatear resultados directamente desde la query
      const formattedChatUsers: ChatUserWithLastConversation[] = results.map((row: any) => ({
        chat_user_id: row.chat_user_id.toString(),
        user_name: row.user_name || '',
        user_email: row.user_email || '',
        user_phone: row.user_phone || '',
        avatar: row.avatar,
        secret: row.secret || '',
        identifier: row.identifier || '',
        last_conversation: {
          conversation_id: row.conversation_id,
          last_message_text: row.last_message_text || '',
          last_message_created_at: row.last_message_created_at,
          last_message_type: row.last_message_type || 'user',
          unread_messages: row.unread_messages,
          need_human: row.need_human || false,
          assigned_user_id: row.assigned_user_id,
          integration_type: row.integration_type || '',
          department: row.department || '',
          last_activity: row.last_activity,
          status: row.need_human === false ? ConversationStatus.IA : row.need_human === true && !row.assigned_user_id ? ConversationStatus.PENDIENTE : ConversationStatus.ASIGNADO,
        },
      }));

      // Paginación
      const totalPages = Math.ceil(total / limit);
      const pagination: PaginationMeta = {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      // Filtros aplicados
      const appliedFilters = {
        ...(searchParams?.searchType && { searchType: searchParams.searchType }),
        ...(searchParams?.searchValue && { searchValue: searchParams.searchValue }),
        ...(searchParams?.needHuman !== undefined && { needHuman: searchParams.needHuman }),
        ...(searchParams?.assignedToMe && { assignedToMe: searchParams.assignedToMe }),
      };

      return {
        ok: true,
        chat_users: formattedChatUsers,
        pagination,
        appliedFilters,
      };
    } catch (error) {
      this.logger.error('Error en findChatUsersByOrganizationWithLastConversation:', error);
      throw error;
    }
  }
}

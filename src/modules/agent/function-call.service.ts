import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HttpMethod,
  HttpRequestConfig,
  AutenticadorType,
  injectPlaces,
  HttpAutenticador,
  BearerConfig,
  ApiKeyInjectPlaces,
  RequestBodyType,
} from 'src/interfaces/function.interface';
import { Funcion } from '@models/agent/Function.entity';
import { Autenticador } from '@models/agent/Autenticador.entity';
import { HitlName, UserFunctionPrefix } from 'src/interfaces/agent';
import { Conversation } from '@models/Conversation.entity';
import { SocketService } from '@modules/socket/socket.service';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { ParamType } from 'src/interfaces/function-param.interface';
import { NotificationService } from '@modules/notification/notification.service';
import { NotificationType } from 'src/interfaces/notifications.interface';
import { EventType, TableName } from '@models/SystemEvent.entity';
import { NotificationType as NotificationTypeSystemEvents } from '@models/notification.entity';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';

@Injectable()
export class FunctionCallService {
  constructor(
    @InjectRepository(Funcion)
    private readonly functionRepository: Repository<Funcion>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly systemEventsService: SystemEventsService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => IntegrationRouterService))
    private readonly integrationRouterService: IntegrationRouterService,
  ) {}

  async executeFunctionCall(functionName: string, agentId: number, params: Record<string, any>, conversationId: number) {
    try {
      if (functionName === HitlName) {
        if (conversationId === -1) {
          // Registrar evento de error para HITL sin conversación
          await this.systemEventsService.create({
            type: EventType.FUNCTION_EXECUTION_FAILED,
            metadata: {
              error: 'No se puede escalar a humano sin una conversación',
              agentId,
              functionName,
            },
            organization: { id: 1 } as any, // Default organization
            table_name: TableName.FUNCTIONS,
            table_id: 0,
            error_message: 'No se puede escalar a humano sin una conversación',
          });
          throw new Error('No se puede escalar a humano sin una conversación');
        }

        const conversation = await this.conversationRepository.findOne({
          where: { id: conversationId },
          relations: ['departamento', 'departamento.organizacion'],
        });

        await this.conversationRepository.update(conversationId, {
          need_human: true,
        });
        if (!conversation) {
          throw new NotFoundException('Conversation not found');
        }

        await this.notificationService.createNotificationForOrganization(
          conversation.departamento.organizacion.id,
          NotificationTypeSystemEvents.SYSTEM,
          'Usuario necesita ayuda de un agente humano',
          { metadata: { conversationId } },
        );

        this.socketService.sendNotificationToOrganization(conversation.departamento.organizacion.id, {
          type: NotificationType.MESSAGE_RECEIVED,
          message: 'Usuario necesita ayuda de un agente humano',
          data: {
            conversationId: conversationId,
          },
        });

        // Registrar evento de asignación de conversación
        await this.systemEventsService.create({
          type: EventType.CONVERSATION_ASSIGNED,
          metadata: {
            agentId,
            conversationId,
            functionName,
            humanAssistanceRequested: true,
          },
          organization: conversation.departamento.organizacion,
          table_name: TableName.CONVERSATIONS,
          table_id: conversationId,
          conversation: { id: conversationId } as any,
        });

        // Notificar al usuario sobre el cambio de estado
        await this.integrationRouterService.sendEventToUser(conversationId, EventType.CONVERSATION_ASSIGNED, conversation.type, conversation.chat_user?.id);

        if (!conversation.need_human) {
          return { message: 'conversacion ya enviada a agente humano, se le volvio a notificar' };
        }
        return { message: 'conversacion enviada a agente humano' };
      }

      const functionConfig = await this.functionRepository.findOne({
        where: { normalizedName: functionName.replace(UserFunctionPrefix, ''), agente: { id: agentId } },
        relations: ['autenticador', 'agente.departamento.organizacion'],
      });

      if (!functionConfig) {
        // Registrar evento de error para función no encontrada
        await this.systemEventsService.create({
          type: EventType.FUNCTION_NOT_FOUND,
          metadata: {
            error: `Function with name ${functionName} not found`,
            agentId,
            functionName,
          },
          organization: { id: 1 } as any, // Default organization
          table_name: TableName.FUNCTIONS,
          table_id: 0,
          conversation: conversationId > 0 ? ({ id: conversationId } as any) : undefined,
          error_message: `Function with name ${functionName} not found`,
        });
        throw new NotFoundException(`Function with name ${functionName} not found`);
      }

      const httpConfig = functionConfig.config as HttpRequestConfig;
      const finalConfig = { ...httpConfig };

      if (!finalConfig.url) {
        throw new Error('No se pudo obtener la URL de la función');
      }

      // Registrar evento de inicio de ejecución de función
      if (conversationId !== -1) {
        await this.systemEventsService.create({
          type: EventType.FUNCTION_EXECUTION_STARTED,
          metadata: {
            functionName: functionConfig.name,
            params,
            agentId,
          },
          organization: functionConfig.agente.departamento.organizacion,
          table_name: TableName.FUNCTIONS,
          table_id: functionConfig.id,
          conversation: conversationId > 0 ? ({ id: conversationId } as any) : undefined,
        });

        // Notificar al usuario sobre el inicio de la ejecución
        const conversationForEvent = await this.conversationRepository.findOne({
          where: { id: conversationId },
          relations: ['chat_user'],
        });
        if (conversationForEvent) {
          await this.integrationRouterService.sendEventToUser(conversationId, EventType.FUNCTION_EXECUTION_STARTED, conversationForEvent.type, conversationForEvent.chat_user?.id);
        }
      }

      // Validate and transform params based on function configuration
      if (httpConfig.requestBody) {
        for (const param of httpConfig.requestBody) {
          const value = params[param.name];
          if (param.type === ParamType.OBJECT && typeof value === 'string') {
            try {
              params[param.name] = JSON.parse(value);
            } catch (e) {
              const errorMsg = `El parámetro ${param.name} debe ser un JSON válido`;

              // Registrar el error de validación
              await this.systemEventsService.create({
                type: EventType.FUNCTION_PARAM_VALIDATION_ERROR,
                metadata: {
                  functionName,
                  param: param.name,
                  error: errorMsg,
                },
                organization: functionConfig.agente.departamento.organizacion,
                table_name: TableName.FUNCTIONS,
                table_id: functionConfig.id,
                conversation: conversationId > 0 ? ({ id: conversationId } as any) : undefined,
                error_message: errorMsg,
              });

              // Notificar al usuario sobre el error de validación
              if (conversationId > 0) {
                const conversation = await this.conversationRepository.findOne({
                  where: { id: conversationId },
                  relations: ['chat_user'],
                });
                if (conversation) {
                  await this.integrationRouterService.sendEventToUser(conversationId, EventType.FUNCTION_PARAM_VALIDATION_ERROR, conversation.type, conversation.chat_user?.id);
                }
              }

              throw new Error(errorMsg);
            }
          }
        }
      }

      const result = await this.makeApiCall(finalConfig.url, finalConfig.method, params, functionConfig.autenticador, finalConfig.bodyType);

      if (conversationId !== -1) {
        await this.systemEventsService.logFunctionCall({
          functionId: functionConfig.id,
          params,
          result,
          organizationId: functionConfig.agente.departamento.organizacion.id,
          functionName: functionConfig.name,
          conversationId,
        });

        // Registrar evento adicional de función ejecutada correctamente
        await this.systemEventsService.create({
          type: EventType.FUNCTION_EXECUTION_COMPLETED,
          metadata: {
            functionName: functionConfig.name,
            params,
            result: typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : String(result).substring(0, 500),
            agentId,
          },
          organization: functionConfig.agente.departamento.organizacion,
          table_name: TableName.FUNCTIONS,
          table_id: functionConfig.id,
          conversation: conversationId > 0 ? ({ id: conversationId } as any) : undefined,
        });

        // Notificar al usuario sobre la finalización exitosa
        const conversationForCompletedEvent = await this.conversationRepository.findOne({
          where: { id: conversationId },
          relations: ['chat_user'],
        });
        if (conversationForCompletedEvent) {
          await this.integrationRouterService.sendEventToUser(
            conversationId,
            EventType.FUNCTION_EXECUTION_COMPLETED,
            conversationForCompletedEvent.type,
            conversationForCompletedEvent.chat_user?.id,
          );
        }
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (conversationId !== -1) throw error;

      const functionConfig = await this.functionRepository.findOne({
        where: { normalizedName: functionName.replace(UserFunctionPrefix, ''), agente: { id: agentId } },
        relations: ['agente.departamento.organizacion'],
      });

      if (functionConfig) {
        await this.systemEventsService.logFunctionCall({
          functionId: functionConfig.id,
          params,
          error,
          organizationId: functionConfig.agente.departamento.organizacion.id,
          functionName: functionConfig.name,
          conversationId,
        });
      } else {
        // Registrar evento de error para función no encontrada durante el manejo de errores
        await this.systemEventsService.create({
          type: EventType.FUNCTION_NOT_FOUND,
          metadata: {
            error: `Function with name ${functionName} not found during error handling`,
            agentId,
            functionName,
            originalError: error.message,
          },
          organization: { id: 1 } as any, // Default organization
          table_name: TableName.FUNCTIONS,
          table_id: 0,
          conversation: conversationId > 0 ? ({ id: conversationId } as any) : undefined,
          error_message: error.message,
        });
      }

      throw error;
    }
  }

  private async getAuthToken(authenticator: Autenticador): Promise<Record<string, string>> {
    // Check if we have a valid stored token
    if (authenticator.value) {
      const currentTime = new Date();
      const tokenTime = authenticator.updated_at;
      const diffSeconds = tokenTime ? Math.floor((currentTime.getTime() - tokenTime.getTime()) / 1000) : null;

      if (authenticator.life_time === 0 || (diffSeconds !== null && tokenTime && diffSeconds < authenticator.life_time)) {
        return { [authenticator.field_name]: authenticator.value };
      }
    }
    if (authenticator.type !== AutenticadorType.ENDPOINT) {
      throw new Error('Authenticator is not of type ENDPOINT');
    }

    const config = authenticator.config as HttpAutenticador<BearerConfig>['config'];
    if (config.injectPlace !== injectPlaces.BEARER_HEADER) {
      throw new Error('Authenticator is not of bearer token');
    }

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config.params),
      });

      if (!response.ok) {
        throw new Error(`Failed to get auth token: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract token using the tokenPath
      const token = config.injectConfig.tokenPath.split('.').reduce((obj, key) => obj?.[key], data);
      if (!token) {
        throw new Error('Could not extract token from response');
      }

      const bearerToken = `Bearer ${token}`;

      // Update token in database
      await this.functionRepository.manager.getRepository(Autenticador).update(authenticator.id, {
        value: bearerToken,
        updated_at: new Date(),
      });

      return { [authenticator.field_name]: bearerToken };
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Failed to get authentication token');
    }
  }

  private async makeApiCall(url: string, method: HttpMethod = HttpMethod.GET, params: Record<string, any>, authenticator?: Autenticador, bodyType?: RequestBodyType) {
    const headers: Record<string, string> = {};

    if (bodyType !== RequestBodyType.FORM_DATA) {
      headers['Content-Type'] = 'application/json';
    }

    // Si hay un autenticador, aplicar su configuración
    if (authenticator) {
      try {
        const authHeaders = await this.getAuthToken(authenticator);
        Object.assign(headers, authHeaders);
      } catch (error) {
        console.error('Error applying authentication:', error);
        throw error;
      }
    }

    const fetchData: {
      method: HttpMethod;
      headers: Record<string, string>;
      body?: any;
    } = {
      method,
      headers,
    };

    const urlParams = url.match(/\/:([^\/]+)/g)?.map((p) => p.replace(/\/:/, '')) || [];
    const missingParams = urlParams.filter((param) => !(param in params));

    if (missingParams.length > 0) {
      throw new NotFoundException(`Required URL parameters missing: ${missingParams.join(', ')}`);
    }

    let processedUrl = urlParams.reduce((acc, param) => acc.replace(`:${param}`, params[param].toString()), url);

    if (authenticator?.config?.injectPlace === ApiKeyInjectPlaces.QUERY_PARAM) {
      delete headers[authenticator.field_name];
      processedUrl += `?${authenticator.field_name}=${authenticator.value}`;
    }

    const nonUrlParams = Object.fromEntries(Object.entries(params).filter(([key]) => !urlParams.includes(key)));

    if (bodyType === RequestBodyType.FORM_DATA) {
      const formData = new FormData();
      Object.entries(nonUrlParams).forEach(([key, value]) => formData.append(key, value));
      fetchData.body = formData;
    } else if (method !== HttpMethod.GET) {
      fetchData.body = JSON.stringify(nonUrlParams);
    } else {
      processedUrl +=
        '?' +
        Object.entries(nonUrlParams)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
    }
    console.log('processedUrl', processedUrl, fetchData);

    const response = await fetch(processedUrl, fetchData);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error making API call:', response, errorText);
      let errorResponse;
      try {
        errorResponse = JSON.parse(errorText);
      } catch {
        errorResponse = errorText;
      }
      throw new Error(
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorResponse,
        }),
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    return { response: await response.text() };
  }
}

import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpMethod, HttpRequestConfig, AutenticadorType, injectPlaces, HttpAutenticador, BearerConfig, ApiKeyInjectPlaces } from 'src/interfaces/function.interface';
import { Funcion } from '@models/agent/Function.entity';
import { Autenticador } from '@models/agent/Autenticador.entity';
import { HitlName, UserFunctionPrefix } from 'src/interfaces/agent';
import { Conversation } from '@models/Conversation.entity';
import { NotificationType } from 'src/interfaces/notifications.interface';
import { SocketService } from '@modules/socket/socket.service';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { ParamType } from 'src/interfaces/function-param.interface';

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
  ) {}

  async executeFunctionCall(functionName: string, agentId: number, params: Record<string, any>, conversationId: number) {
    try {
      if (functionName === HitlName) {
        console.log('conversacion enviada a agente humano', conversationId);
        const conversation = await this.conversationRepository.findOne({
          where: { id: conversationId },
          relations: ['departamento.organizacion'],
        });

        await this.conversationRepository.update(conversationId, {
          need_human: true,
        });
        if (!conversation) {
          throw new NotFoundException(`Conversation with id ${conversationId} not found`);
        }
        this.socketService.sendNotificationToOrganization(conversation.departamento.organizacion.id, {
          type: NotificationType.MESSAGE_RECEIVED,
          message: 'Usuario necesita ayuda de un agente humano',
          data: {
            conversationId: conversationId,
          },
        });
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
        throw new NotFoundException(`Function with name ${functionName} not found`);
      }

      const httpConfig = functionConfig.config as HttpRequestConfig;
      const finalConfig = { ...httpConfig };

      if (!finalConfig.url) {
        throw new Error('No se pudo obtener la URL de la función');
      }

      // Validate and transform params based on function configuration
      if (httpConfig.requestBody) {
        for (const param of httpConfig.requestBody) {
          const value = params[param.name];
          if (param.type === ParamType.OBJECT && typeof value === 'string') {
            try {
              params[param.name] = JSON.parse(value);
            } catch (e) {
              throw new Error(`El parámetro ${param.name} debe ser un JSON válido`);
            }
          }
        }
      }

      const result = await this.makeApiCall(finalConfig.url, finalConfig.method, params, functionConfig.autenticador);

      if (conversationId !== -1) {
        await this.systemEventsService.logFunctionCall({
          functionId: functionConfig.id,
          params,
          result,
          organizationId: functionConfig.agente.departamento.organizacion.id,
          functionName: functionConfig.name,
          conversationId,
        });
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

  private async makeApiCall(url: string, method: HttpMethod = HttpMethod.GET, params: Record<string, any>, authenticator?: Autenticador) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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
      body?: string;
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

    if (method !== HttpMethod.GET) {
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

    return await response.json();
  }
}

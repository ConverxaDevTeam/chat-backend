import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpMethod, HttpRequestConfig, AutenticadorType, injectPlaces, HttpAutenticador, BearerConfig } from 'src/interfaces/function.interface';
import { Funcion } from '@models/agent/Function.entity';
import { Autenticador } from '@models/agent/Autenticador.entity';

@Injectable()
export class FunctionCallService {
  constructor(
    @InjectRepository(Funcion)
    private readonly functionRepository: Repository<Funcion>,
  ) {}

  async executeFunctionCall(functionId: number, params: Record<string, any>, extraConfig?: Partial<HttpRequestConfig>) {
    // Buscar la función en la base de datos
    const functionConfig = await this.functionRepository.findOne({
      where: { id: functionId },
      relations: ['autenticador'],
    });

    if (!functionConfig) {
      throw new Error(`Function with ID ${functionId} not found`);
    }

    // Obtener la configuración HTTP
    const httpConfig = functionConfig.config as HttpRequestConfig;

    // Combinar la configuración extra si existe
    const finalConfig = {
      ...httpConfig,
      ...extraConfig,
    };

    if (!finalConfig.url) {
      throw new Error('No se pudo obtener la URL de la función');
    }

    // Realizar la llamada API
    return this.makeApiCall(finalConfig.url, finalConfig.method, params, functionConfig.autenticador);
  }

  private async getAuthToken(authenticator: Autenticador): Promise<Record<string, string>> {
    if (authenticator.type !== AutenticadorType.ENDPOINT) {
      throw new Error('Authenticator is not of type ENDPOINT');
    }

    const config = authenticator.config as HttpAutenticador<BearerConfig>['config'];
    if (config.injectPlace !== injectPlaces.BEARER_HEADER) {
      throw new Error('Authenticator is not of bearer token');
    }

    // Check if we have a valid stored token
    if (authenticator.value) {
      if (authenticator.life_time === 0 || (authenticator.updated_at && (new Date().getTime() - new Date(authenticator.updated_at).getTime()) / 1000 < authenticator.life_time)) {
        return { Authorization: authenticator.value };
      }
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

      return { Authorization: bearerToken };
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

    const response = await fetch(url, {
      method,
      headers,
      body: method !== HttpMethod.GET ? JSON.stringify(params) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
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

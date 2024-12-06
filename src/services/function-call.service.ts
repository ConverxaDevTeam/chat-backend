import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpMethod, HttpRequestConfig } from 'src/interfaces/function.interface';
import { Funcion } from '@models/agent/Function.entity';

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

  private async makeApiCall(url: string, method: HttpMethod = HttpMethod.GET, params: Record<string, any>, authenticator?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Si hay un autenticador, aplicar su configuración
    if (authenticator) {
      // TODO: Implementar la lógica de autenticación según el tipo de autenticador
      // Por ejemplo, agregar token Bearer, Basic Auth, etc.
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

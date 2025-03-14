import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcion } from '../../models/agent/Function.entity';
import { CreateFunctionDto, UpdateFunctionDto, FunctionType, HttpRequestConfig } from '../../interfaces/function.interface';
import { FunctionUtilsService } from './functionUtils.service';

@Injectable()
export class FunctionService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    private readonly functionUtilsService: FunctionUtilsService,
  ) {}

  async create(createFunctionDto: CreateFunctionDto<FunctionType>): Promise<Funcion> {
    const { agentId, ...rest } = createFunctionDto;
    const function_ = this.functionRepository.create();
    Object.assign(function_, rest);
    Object.assign(function_, {
      agente: { id: agentId },
    });
    const savedFunction = await this.functionRepository.save(function_);

    await this.functionUtilsService.updateLLMFunctions(agentId);

    return savedFunction;
  }

  async findAll(): Promise<Funcion[]> {
    return await this.functionRepository.find({
      relations: ['agente', 'autenticador'],
    });
  }

  async findOne(id: number, relations: string[] = []): Promise<Funcion> {
    const function_ = await this.functionRepository.findOne({
      where: { id },
      relations,
    });

    if (!function_) {
      throw new NotFoundException(`Función con ID ${id} no encontrada`);
    }

    return function_;
  }

  async findByAgent(agentId: number): Promise<Funcion[]> {
    return await this.functionRepository.find({
      where: { agente: { id: agentId } },
      relations: ['agente', 'autenticador'],
    });
  }

  async update(id: number, updateFunctionDto: UpdateFunctionDto<FunctionType>): Promise<Funcion> {
    const function_ = await this.findOne(id);
    const { agentId, config, ...rest } = updateFunctionDto;

    // Mantener los parámetros existentes si es una función API_ENDPOINT
    if (function_.type === FunctionType.API_ENDPOINT) {
      const existingConfig = function_.config as HttpRequestConfig;
      const newConfig = config as HttpRequestConfig;

      Object.assign(function_, {
        ...rest,
        agente: agentId ? { id: agentId } : function_.agente,
        config: {
          ...existingConfig,
          ...newConfig,
        },
      });
    } else {
      Object.assign(function_, {
        ...rest,
        agente: agentId ? { id: agentId } : function_.agente,
        config: {
          ...function_.config,
          ...config,
        },
      });
    }

    const updatedFunction = await this.functionRepository.save(function_);

    if (agentId) {
      await this.functionUtilsService.updateLLMFunctions(agentId);
    }

    return updatedFunction;
  }

  async assignAuthorizer(id: number, authorizerId?: number | null): Promise<Funcion> {
    const function_ = await this.findOne(id);
    function_.autenticador = authorizerId ? ({ id: authorizerId } as any) : null;
    return await this.functionRepository.save(function_);
  }

  async remove(id: number): Promise<void> {
    const functionData = await this.functionRepository.findOne({ where: { id }, select: ['agente'] });
    if (!functionData) {
      throw new NotFoundException(`Function with ID ${id} not found`);
    }
    await this.functionRepository.delete(id);
    await this.functionUtilsService.updateLLMFunctions(functionData.agente.id);
  }

  async testFunction(functionId: number, params: Record<string, any>): Promise<any> {
    return this.functionUtilsService.testFunction(functionId, params);
  }
}

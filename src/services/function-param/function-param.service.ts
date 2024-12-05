import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFunctionParamDto, UpdateFunctionParamDto } from '../../interfaces/function-param.interface';
import { FunctionService } from '../function/function.service';
import { FunctionType, HttpRequestConfig } from '../../interfaces/function.interface';
import { Funcion } from '@models/agent/Function.entity';

@Injectable()
export class FunctionParamService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    private functionService: FunctionService,
  ) {}

  async create(functionId: number, createFunctionParamDto: CreateFunctionParamDto): Promise<any> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      throw new Error('Only API_ENDPOINT functions can have parameters');
    }

    // Ensure config and requestBody exist
    const config = function_.config as HttpRequestConfig;
    if (!config.requestBody) {
      config.requestBody = [];
    }

    // Add new parameter
    config.requestBody.push(createFunctionParamDto);

    // Save updated function
    await this.functionRepository.save(function_);
    return createFunctionParamDto;
  }

  async findAll(functionId: number): Promise<any[]> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      return [];
    }

    const config = function_.config as HttpRequestConfig;
    return config?.requestBody || [];
  }

  async findOne(functionId: number, paramName: string): Promise<any> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      throw new NotFoundException('Function is not an API_ENDPOINT');
    }

    const config = function_.config as HttpRequestConfig;
    const param = config?.requestBody?.find((p) => p.name === paramName);
    if (!param) {
      throw new NotFoundException(`Parameter ${paramName} not found`);
    }

    return param;
  }

  async update(functionId: number, paramName: string, updateFunctionParamDto: UpdateFunctionParamDto): Promise<any> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      throw new NotFoundException('Function is not an API_ENDPOINT');
    }

    const config = function_.config as HttpRequestConfig;
    if (!config?.requestBody) {
      throw new NotFoundException(`Parameter ${paramName} not found`);
    }

    const paramIndex = config.requestBody.findIndex((p) => p.name === paramName);
    if (paramIndex === -1) {
      throw new NotFoundException(`Parameter ${paramName} not found`);
    }

    // Update parameter
    config.requestBody[paramIndex] = {
      ...config.requestBody[paramIndex],
      ...updateFunctionParamDto,
    };

    // Save updated function
    await this.functionRepository.save(function_);
    return config.requestBody[paramIndex];
  }

  async remove(functionId: number, paramName: string): Promise<void> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      throw new NotFoundException('Function is not an API_ENDPOINT');
    }

    const config = function_.config as HttpRequestConfig;
    if (!config?.requestBody) {
      throw new NotFoundException(`Parameter ${paramName} not found`);
    }

    const paramIndex = config.requestBody.findIndex((p) => p.name === paramName);
    if (paramIndex === -1) {
      throw new NotFoundException(`Parameter ${paramName} not found`);
    }

    // Remove parameter
    config.requestBody.splice(paramIndex, 1);

    // Save updated function
    await this.functionRepository.save(function_);
  }
}

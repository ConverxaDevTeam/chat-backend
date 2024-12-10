import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateFunctionParamDto } from '../../interfaces/function-param.interface';
import { FunctionService } from '../function/function.service';
import { FunctionParam, FunctionType, HttpRequestConfig } from '../../interfaces/function.interface';
import { Funcion } from '@models/agent/Function.entity';

@Injectable()
export class FunctionParamService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    private functionService: FunctionService,
  ) {}

  async create(functionId: number, createFunctionParamDto: FunctionParam): Promise<FunctionParam> {
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

  async update(functionId: number, paramIndex: number, updateFunctionParamDto: UpdateFunctionParamDto): Promise<any> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      throw new NotFoundException('Function is not an API_ENDPOINT');
    }

    const config = function_.config as HttpRequestConfig;
    if (!config?.requestBody) {
      throw new NotFoundException(`Parameter at index ${paramIndex} not found`);
    }

    if (paramIndex < 0 || paramIndex >= config.requestBody.length) {
      throw new NotFoundException(`Parameter at index ${paramIndex} not found`);
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

  async remove(functionId: number, paramIndex: number): Promise<void> {
    const function_ = await this.functionService.findOne(functionId);

    if (function_.type !== FunctionType.API_ENDPOINT) {
      throw new NotFoundException('Function is not an API_ENDPOINT');
    }

    const config = function_.config as HttpRequestConfig;
    if (!config?.requestBody) {
      throw new NotFoundException(`Parameter at index ${paramIndex} not found`);
    }

    if (paramIndex < 0 || paramIndex >= config.requestBody.length) {
      throw new NotFoundException(`Parameter at index ${paramIndex} not found`);
    }

    // Remove parameter
    config.requestBody.splice(paramIndex, 1);

    // Save updated function
    await this.functionRepository.save(function_);
  }
}

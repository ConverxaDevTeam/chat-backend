import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcion } from '../../models/agent/Function.entity';
import { CreateFunctionDto, HttpRequestFunction, UpdateFunctionDto } from '../../interfaces/function.interface';

@Injectable()
export class FunctionService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
  ) {}

  async create(createFunctionDto: CreateFunctionDto): Promise<Funcion> {
    const function_ = this.functionRepository.create(createFunctionDto);
    return await this.functionRepository.save(function_);
  }

  async findAll(): Promise<Funcion[]> {
    return await this.functionRepository.find({
      relations: ['agente', 'autenticador'],
    });
  }

  async findOne(id: number): Promise<Funcion> {
    const function_ = await this.functionRepository.findOne({
      where: { id },
      relations: ['agente', 'autenticador'],
    });

    if (!function_) {
      throw new NotFoundException(`Function with ID ${id} not found`);
    }

    return function_;
  }

  async findByAgent(agentId: number): Promise<Funcion[]> {
    return await this.functionRepository.find({
      where: { agente: { id: agentId } },
      relations: ['agente', 'autenticador'],
    });
  }

  async update(id: number, updateFunctionDto: UpdateFunctionDto<HttpRequestFunction>): Promise<Funcion> {
    const function_ = await this.findOne(id);
    Object.assign(function_, updateFunctionDto);
    return await this.functionRepository.save(function_);
  }

  async remove(id: number): Promise<void> {
    const result = await this.functionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Function with ID ${id} not found`);
    }
  }
}

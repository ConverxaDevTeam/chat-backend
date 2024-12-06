import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Autenticador as AutenticadorEntity } from '../../models/agent/Autenticador.entity';
import { CreateAutenticadorDto } from './dto/create-autenticador.dto';
import { AutenticadorType } from '../../interfaces/function.interface';

@Injectable()
export class AutenticadorService {
  constructor(
    @InjectRepository(AutenticadorEntity)
    private readonly autenticadorRepository: Repository<AutenticadorEntity>,
  ) {}

  async create<T extends { type: AutenticadorType; config: Record<string, unknown> }>(
    createAutenticadorDto: CreateAutenticadorDto<T> & { organizationId: string },
  ): Promise<AutenticadorEntity<T>> {
    const autenticador = this.autenticadorRepository.create(createAutenticadorDto) as AutenticadorEntity<T>;
    return this.autenticadorRepository.save(autenticador);
  }

  async findAll<T extends { type: AutenticadorType; config: Record<string, unknown> }>(organizationId: string): Promise<AutenticadorEntity<T>[]> {
    return this.autenticadorRepository.find({
      where: { organizationId },
      relations: ['organization'],
    }) as Promise<AutenticadorEntity<T>[]>;
  }

  async findOne<T extends { type: AutenticadorType; config: Record<string, unknown> }>(id: number): Promise<AutenticadorEntity<T>> {
    return this.autenticadorRepository.findOne({
      where: { id },
      relations: ['organization'],
    }) as Promise<AutenticadorEntity<T>>;
  }

  async update<T extends { type: AutenticadorType; config: Record<string, unknown> }>(
    id: number,
    updateAutenticadorDto: Partial<CreateAutenticadorDto<T>>,
  ): Promise<AutenticadorEntity<T>> {
    const autenticador = await this.findOne<T>(id);

    if (updateAutenticadorDto.config) {
      Object.assign(autenticador, {
        ...updateAutenticadorDto,
        config: updateAutenticadorDto.config,
      });
    } else {
      Object.assign(autenticador, updateAutenticadorDto);
    }

    return this.autenticadorRepository.save(autenticador);
  }

  async remove(id: number): Promise<void> {
    await this.autenticadorRepository.delete({ id });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Autenticador as AutenticadorEntity } from '../../models/agent/Autenticador.entity';
import { CreateAutenticadorDto } from './dto/create-autenticador.dto';
import { AutenticadorType } from 'src/interfaces/function.interface';

@Injectable()
export class AutenticadorService {
  constructor(
    @InjectRepository(AutenticadorEntity)
    private readonly autenticadorRepository: Repository<AutenticadorEntity>,
  ) {}

  async create<T extends { type: AutenticadorType; config: Record<string, unknown> }>(createAutenticadorDto: CreateAutenticadorDto<T>): Promise<AutenticadorEntity<T>> {
    const autenticador = this.autenticadorRepository.create({
      type: createAutenticadorDto.type,
      config: createAutenticadorDto.config,
      life_time: createAutenticadorDto.life_time || 0,
      value: createAutenticadorDto.value || '',
    }) as AutenticadorEntity<T>;

    return this.autenticadorRepository.save(autenticador);
  }

  async findAll(): Promise<AutenticadorEntity[]> {
    return this.autenticadorRepository.find();
  }

  async findOne(id: number): Promise<AutenticadorEntity> {
    return this.autenticadorRepository.findOneOrFail({ where: { id } });
  }

  async update<T extends { type: AutenticadorType; config: Record<string, unknown> }>(
    id: number,
    updateAutenticadorDto: Partial<CreateAutenticadorDto<T>>,
  ): Promise<AutenticadorEntity<T>> {
    const autenticador = (await this.findOne(id)) as AutenticadorEntity<T>;

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
    await this.autenticadorRepository.delete(id);
  }
}

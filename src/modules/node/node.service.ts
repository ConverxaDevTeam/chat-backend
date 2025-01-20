import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcion } from '../../models/agent/Function.entity';
import { Agente } from '../../models/agent/Agente.entity';

@Injectable()
export class NodeService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    @InjectRepository(Agente)
    private agenteRepository: Repository<Agente>,
  ) {}

  async updatePosition(id: number, { x, y, type }: { x: number; y: number; type: 'function' | 'agent' }) {
    const repository = type === 'function' ? this.functionRepository : this.agenteRepository;
    const node = await repository.findOne({ where: { id } });

    if (!node) {
      throw new Error(`${type} with id ${id} not found`);
    }
    await repository.update(id, {
      config: {
        ...node.config,
        position: { x, y },
      },
    });
  }
}

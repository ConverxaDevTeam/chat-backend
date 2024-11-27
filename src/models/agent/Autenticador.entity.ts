import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Funcion } from './Function.entity';

@Entity({ name: 'autenticador' })
export class Autenticador extends BaseEntity {
  @Column({ type: 'enum', enum: ['type1', 'type2'], nullable: false }) // Ajusta los tipos del enum según tu aplicación
  type: string;

  @Column({ type: 'json', nullable: true })
  config: string;

  @OneToMany(() => Funcion, (funcion) => funcion.autenticador)
  funciones: Funcion[];
}

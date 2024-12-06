import { BaseEntity } from '../Base.entity';
import { Funcion } from './Function.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AutenticadorType, Autenticador as IAutenticador } from 'src/interfaces/function.interface';

@Entity({ name: 'autenticador' })
export class Autenticador<T extends { type: AutenticadorType; config: Record<string, unknown> } = { type: AutenticadorType; config: Record<string, unknown> }>
  extends BaseEntity
  implements IAutenticador<T>
{
  @ApiProperty({ example: 'endpoint', enum: AutenticadorType, description: 'Type of authenticator' })
  @Column({ type: 'enum', enum: AutenticadorType, nullable: false })
  type: T['type'];

  @ApiProperty({
    example: {
      url: 'https://api.example.com/auth',
      method: 'POST',
      params: { client_id: 'xxx' },
    },
    description: 'Configuration in JSON format',
  })
  @Column({ type: 'json', nullable: false })
  config: T['config'];

  @ApiProperty({ example: '0', description: 'Lifetime in seconds' })
  @Column({ type: 'integer', default: 0 })
  life_time: number;

  @ApiProperty({ example: 'some value', description: 'Value of the authenticator' })
  @Column({ type: 'varchar' })
  value: string;

  @OneToMany(() => Funcion, (funcion) => funcion.autenticador)
  funciones: Funcion[];
}

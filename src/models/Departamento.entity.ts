import { Entity, Column, OneToMany, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Organization } from './Organization.entity';
import { Integration } from './Integration.entity';
import { Agente } from './agent/Agente.entity';
import { Conversation } from './Conversation.entity';

@Entity({ name: 'departamento' })
export class Departamento extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @ManyToOne(() => Organization, (organizacion) => organizacion.departamentos)
  @JoinColumn({ name: 'organization_id' })
  organizacion: Organization;

  @OneToMany(() => Integration, (integration) => integration.departamento)
  integrations: Integration[];

  @OneToMany(() => Conversation, (ionversation) => ionversation.departamento)
  conversations: Conversation[];

  @OneToOne(() => Agente, (agente) => agente.departamento)
  agente: Agente;
}

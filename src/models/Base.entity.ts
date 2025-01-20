import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseEntity {
  @ApiProperty({ example: '1', description: 'Identifier Unique' })
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', update: false })
  created_at?: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at?: Date;
}

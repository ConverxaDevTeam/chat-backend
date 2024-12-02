import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentService } from '../../services/department/department.service';
import { DepartmentController } from './department.controller';
import { Departamento } from '@models/Departamento.entity';
import { Organization } from '@models/Organization.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { LlmAgentModule } from '../llm-agent/llm-agent.module';
import { User } from '@models/User.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Departamento, Organization, User]), AuthModule, LlmAgentModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}

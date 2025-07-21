import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentController } from './department.controller';
import { DepartmentService } from 'src/services/department/department.service';
import { Departamento } from '@models/Departamento.entity';
import { Organization } from '@models/Organization.entity';
import { Agente } from '@models/agent/Agente.entity';
import { LlmAgentModule } from '@modules/llm-agent/llm-agent.module';
import { AuthModule } from '@modules/auth/auth.module';
import { FacebookModule } from '@modules/facebook/facebook.module';
import { AgentManagerModule } from '@modules/agent-manager/agent-manager.module';
import { OrganizationModule } from '@modules/organization/organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Departamento, Organization, Agente]),
    forwardRef(() => LlmAgentModule),
    forwardRef(() => AuthModule),
    forwardRef(() => FacebookModule),
    forwardRef(() => AgentManagerModule),
    forwardRef(() => OrganizationModule),
  ],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}

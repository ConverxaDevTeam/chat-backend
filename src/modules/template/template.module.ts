import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from '@models/Template.entity';
import { Organization } from '@models/Organization.entity';
import { Departamento } from '@models/Departamento.entity';
import { Agente } from '@models/agent/Agente.entity';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Funcion } from '@models/agent/Function.entity';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { FileModule } from '@modules/file/file.module';
import { DepartmentModule } from '@modules/department/department.module';
import { OrganizationModule } from '@modules/organization/organization.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Template, Organization, Departamento, Agente, KnowledgeBase, Funcion]), FileModule, DepartmentModule, OrganizationModule, AuthModule],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}

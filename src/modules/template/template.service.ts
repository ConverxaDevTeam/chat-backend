import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '@models/Template.entity';
import { Organization } from '@models/Organization.entity';
import { Departamento } from '@models/Departamento.entity';
import { Agente } from '@models/agent/Agente.entity';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Funcion } from '@models/agent/Function.entity';
import { FileService } from '@modules/file/file.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { join } from 'path';
import * as fs from 'fs';
import { OrganizationType } from '@models/Organization.entity';
import { FunctionType } from 'src/interfaces/function.interface';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Departamento)
    private readonly departmentRepository: Repository<Departamento>,
    @InjectRepository(Agente)
    private readonly agentRepository: Repository<Agente>,
    @InjectRepository(KnowledgeBase)
    private readonly knowledgeBaseRepository: Repository<KnowledgeBase>,
    @InjectRepository(Funcion)
    private readonly functionRepository: Repository<Funcion>,
    private readonly fileService: FileService,
  ) {}

  async create(createTemplateDto: CreateTemplateDto, imageFile: Express.Multer.File): Promise<Template> {
    const { sourceDepartmentId, name, description } = createTemplateDto;

    // Verificar que el departamento fuente existe
    const sourceDepartment = await this.departmentRepository.findOne({
      where: { id: sourceDepartmentId },
      relations: ['organizacion', 'agente', 'agente.funciones', 'agente.knowledgeBases'],
    });

    if (!sourceDepartment) {
      throw new NotFoundException(`Departamento con ID ${sourceDepartmentId} no encontrado`);
    }

    if (!sourceDepartment.agente) {
      throw new BadRequestException(`El departamento con ID ${sourceDepartmentId} no tiene un agente asociado`);
    }

    // Guardar la imagen del template
    const imageUrl = await this.fileService.saveFile(imageFile, 'templates', `template_${Date.now()}`);

    // Crear el template
    const template = this.templateRepository.create({
      name,
      description,
      imageUrl,
      sourceDepartment,
      sourceDepartmentId,
    });

    // Buscar o crear la organización sofia_templates
    let templatesOrg = await this.organizationRepository.findOne({
      where: { name: 'sofia_templates' },
    });

    if (!templatesOrg) {
      templatesOrg = this.organizationRepository.create({
        name: 'sofia_templates',
        description: 'Organización para almacenar templates de Sofia',
        type: OrganizationType.TEMPLATE,
      });
      await this.organizationRepository.save(templatesOrg);
    }

    // Crear un departamento con el nombre del template
    const templateDepartment = this.departmentRepository.create({
      name: template.name,
      organizacion: templatesOrg,
    });
    await this.departmentRepository.save(templateDepartment);

    // Copiar el agente
    const sourceAgent = sourceDepartment.agente;
    const newAgent = this.agentRepository.create({
      name: sourceAgent.name,
      type: sourceAgent.type,
      config: { ...sourceAgent.config },
      canEscalateToHuman: sourceAgent.canEscalateToHuman,
      departamento: templateDepartment,
    });
    await this.agentRepository.save(newAgent);

    // Copiar las funciones
    if (sourceAgent.funciones && sourceAgent.funciones.length > 0) {
      const functions = sourceAgent.funciones.map((func) =>
        this.functionRepository.create({
          name: func.name,
          normalizedName: func.normalizedName,
          description: func.description,
          type: func.type || FunctionType.API_ENDPOINT,
          config: { ...func.config },
          agente: newAgent,
        }),
      );
      await this.functionRepository.save(functions);
    }

    // Copiar knowledge base (solo metadatos, no archivos físicos)
    if (sourceAgent.knowledgeBases && sourceAgent.knowledgeBases.length > 0) {
      const knowledgeBases = sourceAgent.knowledgeBases.map((kb) =>
        this.knowledgeBaseRepository.create({
          filename: kb.filename,
          fileId: kb.fileId,
          expirationTime: kb.expirationTime,
          agente: newAgent,
        }),
      );
      await this.knowledgeBaseRepository.save(knowledgeBases);

      // Copiar archivos físicos si existen
      if (sourceDepartment.organizacion) {
        const sourceOrgId = sourceDepartment.organizacion.id;
        const sourceDir = join(process.cwd(), 'uploads', 'organizations', sourceOrgId.toString(), 'files');
        const targetDir = join(process.cwd(), 'uploads', 'organizations', templatesOrg.id.toString(), 'files');

        // Crear directorio destino si no existe
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copiar cada archivo
        for (const kb of sourceAgent.knowledgeBases) {
          const files = fs.readdirSync(sourceDir);
          const matchingFiles = files.filter((file) => file.startsWith(kb.fileId + '.'));

          for (const file of matchingFiles) {
            const sourcePath = join(sourceDir, file);
            const targetPath = join(targetDir, file);
            fs.copyFileSync(sourcePath, targetPath);
          }
        }
      }
    }

    await this.templateRepository.save(template);
    return template;
  }

  async findAll(): Promise<Template[]> {
    return this.templateRepository.find({
      relations: ['sourceDepartment'],
    });
  }

  async findOne(id: number): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['sourceDepartment'],
    });

    if (!template) {
      throw new NotFoundException(`Template con ID ${id} no encontrado`);
    }

    return template;
  }

  async remove(id: number): Promise<void> {
    const template = await this.findOne(id);

    // Eliminar la imagen del template si existe
    if (template.imageUrl) {
      const imagePath = template.imageUrl.split('/').pop();
      if (imagePath) {
        const uploadDir = join(process.cwd(), 'uploads', 'templates');
        await this.fileService.deleteFile(join(uploadDir, imagePath));
      }
    }

    await this.templateRepository.remove(template);
  }
}

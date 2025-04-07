import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FunctionTemplate } from '@models/function-template/function-template.entity';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';
import { CreateFunctionTemplateDto, UpdateFunctionTemplateDto, FunctionTemplateSearchDto, FunctionTemplateResponseDto } from './dto/template.dto';
import { CreateFunctionTemplateApplicationDto, UpdateFunctionTemplateApplicationDto } from './dto/application.dto';
import { FileService } from '@modules/file/file.service';

@Injectable()
export class FunctionTemplateService {
  constructor(
    @InjectRepository(FunctionTemplate)
    private readonly templateRepository: Repository<FunctionTemplate>,
    @InjectRepository(FunctionTemplateCategory)
    private readonly categoryRepository: Repository<FunctionTemplateCategory>,
    @InjectRepository(FunctionTemplateApplication)
    private readonly applicationRepository: Repository<FunctionTemplateApplication>,
    private readonly fileService: FileService,
  ) {}

  async getTemplates(searchDto: FunctionTemplateSearchDto): Promise<FunctionTemplateResponseDto> {
    const { page = 1, limit = 10, search, tags, categoryId, applicationId } = searchDto;

    const query = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.category', 'category')
      .leftJoinAndSelect('template.application', 'application')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.where('(template.name LIKE :search OR template.description LIKE :search)', { search: `%${search}%` });
    }

    if (tags?.length) {
      query.andWhere('template.tags @> :tags', { tags });
    }

    if (categoryId) {
      query.andWhere('template.categoryId = :categoryId', { categoryId });
    }

    if (applicationId) {
      query.andWhere('template.applicationId = :applicationId', { applicationId });
    }

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getTemplateById(id: number): Promise<FunctionTemplate | null> {
    return this.templateRepository.findOne({
      where: { id },
      relations: ['category', 'application'],
    });
  }

  async createTemplate(dto: CreateFunctionTemplateDto): Promise<FunctionTemplate> {
    // Convertir el array de parámetros a un objeto donde el nombre es la clave
    const paramsObj: Record<string, any> = {};
    if (Array.isArray(dto.params)) {
      dto.params.forEach((param) => {
        if (param.name) {
          // Procesar propiedades anidadas si existen
          if (param.properties && Array.isArray(param.properties)) {
            const propertiesObj: Record<string, any> = {};
            param.properties.forEach((prop) => {
              if (prop.name) {
                propertiesObj[prop.name] = prop;
              }
            });
            param.properties = propertiesObj;
          }
          // Usar el nombre como clave
          paramsObj[param.name] = param;
        }
      });
    }

    // Crear el template con valores por defecto
    const template = this.templateRepository.create({
      ...dto,
      method: dto.method || 'GET',
      bodyType: dto.bodyType || 'json',
      // No asignamos params aquí, lo haremos después
    });

    // Asignar los parámetros como un objeto
    template.params = paramsObj;

    // Guardar el template
    return this.templateRepository.save(template);
  }

  async updateTemplate(id: number, dto: UpdateFunctionTemplateDto): Promise<FunctionTemplate | null> {
    const result = await this.templateRepository.update(id, dto);
    if (result.affected === 0) return null;
    return this.getTemplateById(id);
  }

  async deleteTemplate(id: number): Promise<void> {
    await this.templateRepository.delete(id);
  }

  async getCategories(): Promise<FunctionTemplateCategory[]> {
    try {
      // Usar find() con opciones explícitas para evitar problemas de NaN
      return await this.categoryRepository.find({
        where: { isActive: true },
        select: ['id', 'name', 'description'],
      });
    } catch (error) {
      console.error('Error en getCategories:', error);
      // En caso de error, devolver un array vacío
      return [];
    }
  }

  async getApplications(): Promise<FunctionTemplateApplication[]> {
    try {
      // Usar find() con opciones explícitas para evitar problemas de NaN
      return await this.applicationRepository.find({
        where: { isActive: true },
        select: ['id', 'name', 'description'],
      });
    } catch (error) {
      console.error('Error en getApplications:', error);
      // En caso de error, devolver un array vacío
      return [];
    }
  }

  async createCategory(dto: Omit<FunctionTemplateCategory, 'id'>): Promise<FunctionTemplateCategory> {
    return this.categoryRepository.save(this.categoryRepository.create(dto));
  }

  async createApplication(dto: CreateFunctionTemplateApplicationDto, file?: Express.Multer.File) {
    // Crear la aplicación primero para obtener el ID
    const application = this.applicationRepository.create({
      ...dto,
      isActive: true,
    });
    const savedApplication = await this.applicationRepository.save(application);

    // Si hay un archivo de imagen, guardarlo
    if (file) {
      // Guardar la imagen en la carpeta /uploads/templates/<id_template>
      const filePath = `templates/${savedApplication.id}`;
      const fileName = `app_${savedApplication.id}`;
      const imageUrl = await this.fileService.saveFile(file, filePath, fileName);

      // Actualizar la URL de la imagen en la entidad
      savedApplication.imageUrl = imageUrl;
      await this.applicationRepository.save(savedApplication);
    }

    return {
      ok: true,
      data: savedApplication,
    };
  }

  async updateApplication(id: number, dto: UpdateFunctionTemplateApplicationDto) {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      return null;
    }

    // Actualizar los campos proporcionados
    Object.assign(application, dto);
    await this.applicationRepository.save(application);

    return {
      ok: true,
      data: application,
    };
  }
}

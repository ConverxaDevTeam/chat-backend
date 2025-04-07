import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FunctionTemplate } from '@models/function-template/function-template.entity';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { CreateFunctionTemplateDto, UpdateFunctionTemplateDto, FunctionTemplateSearchDto, FunctionTemplateResponseDto } from './dto/template.dto';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';

@Injectable()
export class FunctionTemplateService {
  constructor(
    @InjectRepository(FunctionTemplate)
    private readonly templateRepository: Repository<FunctionTemplate>,
    @InjectRepository(FunctionTemplateCategory)
    private readonly categoryRepository: Repository<FunctionTemplateCategory>,
    @InjectRepository(FunctionTemplateApplication)
    private readonly applicationRepository: Repository<FunctionTemplateApplication>,
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
    const template = this.templateRepository.create({
      ...dto,
      method: dto.method || 'GET',
      bodyType: dto.bodyType || 'json',
    });
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
    return this.categoryRepository.find();
  }

  async getApplications(): Promise<FunctionTemplateApplication[]> {
    return this.applicationRepository.find();
  }

  async createCategory(dto: Omit<FunctionTemplateCategory, 'id'>): Promise<FunctionTemplateCategory> {
    return this.categoryRepository.save(this.categoryRepository.create(dto));
  }

  async createApplication(dto: Omit<FunctionTemplateApplication, 'id'>): Promise<FunctionTemplateApplication> {
    return this.applicationRepository.save(this.applicationRepository.create(dto));
  }
}

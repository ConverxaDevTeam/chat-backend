import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { FunctionTemplateService } from './function-template.service';
import { FunctionTemplateCategory } from '@models/function-template-category.entity';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';
import { CreateFunctionTemplateDto, UpdateFunctionTemplateDto } from './dto/template.dto';

@Controller('function-templates')
export class FunctionTemplateController {
  constructor(private readonly service: FunctionTemplateService) {}

  @Get()
  getTemplates(@Query('organizationId') organizationId: number) {
    return this.service.getTemplates(Number(organizationId));
  }

  @Get(':id')
  getTemplateById(@Param('id') id: number) {
    return this.service.getTemplateById(Number(id));
  }

  @Post()
  createTemplate(@Body() dto: CreateFunctionTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Put(':id')
  async updateTemplate(@Param('id') id: number, @Body() dto: UpdateFunctionTemplateDto) {
    const result = await this.service.updateTemplate(Number(id), dto);
    if (!result) throw new Error('Template not found');
    return result;
  }

  @Delete(':id')
  deleteTemplate(@Param('id') id: number) {
    return this.service.deleteTemplate(Number(id));
  }

  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('applications')
  getApplications() {
    return this.service.getApplications();
  }

  @Post('categories')
  createCategory(@Body() dto: Omit<FunctionTemplateCategory, 'id'>) {
    return this.service.createCategory(dto);
  }

  @Post('applications')
  createApplication(@Body() dto: Omit<FunctionTemplateApplication, 'id'>) {
    return this.service.createApplication(dto);
  }
}

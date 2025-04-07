import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { FunctionTemplateService } from './function-template.service';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';
import { CreateFunctionTemplateDto, UpdateFunctionTemplateDto, FunctionTemplateSearchDto } from './dto/template.dto';

@ApiTags('Function Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('function-templates')
export class FunctionTemplateController {
  constructor(private readonly service: FunctionTemplateService) {}

  @ApiOperation({ summary: 'Get all function templates' })
  @Get()
  getTemplates(@Query() searchDto: FunctionTemplateSearchDto) {
    return this.service.getTemplates(searchDto);
  }

  @ApiOperation({ summary: 'Get template by ID' })
  @Get(':id')
  getTemplateById(@Param('id') id: number) {
    return this.service.getTemplateById(Number(id));
  }

  @ApiOperation({ summary: 'Create new template' })
  @Post()
  createTemplate(@Body() dto: CreateFunctionTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @ApiOperation({ summary: 'Update template' })
  @Put(':id')
  async updateTemplate(@Param('id') id: number, @Body() dto: UpdateFunctionTemplateDto) {
    const result = await this.service.updateTemplate(Number(id), dto);
    if (!result) throw new Error('Template not found');
    return result;
  }

  @ApiOperation({ summary: 'Delete template' })
  @Delete(':id')
  deleteTemplate(@Param('id') id: number) {
    return this.service.deleteTemplate(Number(id));
  }

  @ApiOperation({ summary: 'Get template categories' })
  @Get('categories')
  getCategories() {
    return this.service.getCategories();
  }

  @ApiOperation({ summary: 'Get template applications' })
  @Get('applications')
  getApplications() {
    return this.service.getApplications();
  }

  @ApiOperation({ summary: 'Create template category' })
  @Post('categories')
  createCategory(@Body() dto: Omit<FunctionTemplateCategory, 'id'>) {
    return this.service.createCategory(dto);
  }

  @ApiOperation({ summary: 'Create template application' })
  @Post('applications')
  createApplication(@Body() dto: Omit<FunctionTemplateApplication, 'id'>) {
    return this.service.createApplication(dto);
  }
}

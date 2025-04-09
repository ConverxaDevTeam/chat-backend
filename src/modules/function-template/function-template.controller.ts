import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, HttpException, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { LoggingInterceptor } from '@infrastructure/interceptors/logging.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { FunctionTemplateService } from './function-template.service';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { CreateFunctionTemplateDto, UpdateFunctionTemplateDto, FunctionTemplateSearchDto } from './dto/template.dto';
import { CreateFunctionTemplateApplicationDto, UpdateFunctionTemplateApplicationDto } from './dto/application.dto';

@ApiTags('Function Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
@Controller('function-templates')
export class FunctionTemplateController {
  constructor(private readonly service: FunctionTemplateService) {}

  @ApiOperation({ summary: 'Get template categories' })
  @Get('categories')
  async getCategories() {
    try {
      return await this.service.getCategories();
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: 'Error al obtener las categorías',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get template applications' })
  @Get('applications')
  async getApplications() {
    try {
      return await this.service.getApplications();
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: 'Error al obtener las aplicaciones',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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

  @ApiOperation({ summary: 'Create template category' })
  @Post('categories')
  createCategory(@Body() dto: Omit<FunctionTemplateCategory, 'id'>) {
    return this.service.createCategory(dto);
  }

  @ApiOperation({ summary: 'Create template application' })
  @Post('applications')
  @UseInterceptors(FileInterceptor('image'))
  async createApplication(@Body() dto: CreateFunctionTemplateApplicationDto, @UploadedFile() file: Express.Multer.File) {
    try {
      return await this.service.createApplication(dto, file);
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al crear la aplicación',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Update template application' })
  @Put('applications/:id')
  async updateApplication(@Param('id') id: number, @Body() dto: UpdateFunctionTemplateApplicationDto) {
    try {
      const result = await this.service.updateApplication(Number(id), dto);
      if (!result) {
        throw new HttpException(
          {
            ok: false,
            message: 'Aplicación no encontrada',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return result;
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al actualizar la aplicación',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

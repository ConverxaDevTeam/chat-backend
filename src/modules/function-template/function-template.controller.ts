import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, HttpException, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { LoggingInterceptor } from '@infrastructure/interceptors/logging.interceptor';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { FunctionTemplateService } from './function-template.service';
import { TemplateGeneratorService } from './template-generator.service';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { CreateFunctionTemplateDto, UpdateFunctionTemplateDto, FunctionTemplateSearchDto } from './dto/template.dto';
import { CreateFunctionTemplateApplicationDto, UpdateFunctionTemplateApplicationDto } from './dto/application.dto';
import { GenerateTemplateDto, TemplateGenerationResponse, ContinueGenerateTemplateDto } from './dto/generate-template.dto';

@ApiTags('Function Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(LoggingInterceptor)
@Controller('function-templates')
export class FunctionTemplateController {
  constructor(
    private readonly service: FunctionTemplateService,
    private readonly generatorService: TemplateGeneratorService,
  ) {}

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

  @ApiOperation({ summary: 'Generate template from text content using AI' })
  @Post('generate-with-ai')
  async generateTemplateWithAI(@Body() dto: GenerateTemplateDto): Promise<TemplateGenerationResponse> {
    try {
      // Primera llamada, isNewTemplate = true
      return await this.generatorService.generateFromText(dto.content, dto.additionalMessage, 0, true, undefined, dto.domain);
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al generar los templates con IA',
          data: { templates: [], categories: [], applications: [] },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Continue template generation from text content' })
  @Post('generate-with-ai/continue')
  async continueTemplateGeneration(@Body() dto: ContinueGenerateTemplateDto): Promise<TemplateGenerationResponse> {
    try {
      // Llamada subsiguiente, isNewTemplate = false
      return await this.generatorService.generateFromText(dto.content, dto.additionalMessage, dto.lastProcessedLine, false, dto.createdIds, dto.domain);
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al continuar la generación de los templates',
          data: { templates: [], categories: [], applications: [] },
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get templates by application ID' })
  @Get('by-application/:applicationId')
  async getTemplatesByApplicationId(@Param('applicationId') applicationId: number) {
    try {
      return await this.service.getTemplates({
        applicationId: Number(applicationId),
        page: 1,
        limit: 100,
      });
    } catch (error) {
      throw new HttpException(
        {
          ok: false,
          message: error.message || 'Error al obtener los templates por aplicación',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

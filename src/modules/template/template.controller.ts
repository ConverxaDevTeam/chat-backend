import { Controller, Post, Get, Param, Delete, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { Template } from '@models/Template.entity';

@ApiTags('templates')
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo template' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        sourceDepartmentId: { type: 'number' },
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async create(@Body() createTemplateDto: CreateTemplateDto, @UploadedFile() image: Express.Multer.File): Promise<Template> {
    return this.templateService.create(createTemplateDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los templates' })
  async findAll(): Promise<Template[]> {
    return this.templateService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un template por ID' })
  async findOne(@Param('id') id: string): Promise<Template> {
    return this.templateService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un template' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.templateService.remove(+id);
  }
}

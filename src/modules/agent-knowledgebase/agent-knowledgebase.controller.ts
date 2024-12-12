import { Controller, Get, Post, Param, Delete, UseGuards, UseInterceptors, UploadedFiles, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { AgentKnowledgebaseService } from './agent-knowledgebase.service';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const createFileFilter = () => (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedMimeTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname);
    cb(new BadRequestException(`File ${file.originalname} has invalid type. Only PDF, TXT and DOC files are allowed.`), false);
  }
};

@ApiTags('agent-knowledgebase')
@Controller('agent-knowledgebase')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentKnowledgebaseController {
  constructor(private readonly agentKnowledgebaseService: AgentKnowledgebaseService) {}

  @Post('agent/:agentId')
  @UseInterceptors(
    FilesInterceptor('file', 10, {
      storage: memoryStorage(),
      fileFilter: createFileFilter(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (PDF, TXT, DOC). Maximum 10 files, 10MB each.',
        },
      },
    },
  })
  async create(@Param('agentId', ParseIntPipe) agentId: number, @UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      console.log('No files received');
      throw new BadRequestException('No files uploaded');
    }

    const fileDetails = files.map((f) => ({
      name: f.originalname,
      type: f.mimetype,
      size: f.size ? `${Math.round(f.size / 1024)}KB` : 'unknown size',
    }));

    console.log('Processing files:', fileDetails);

    return await this.agentKnowledgebaseService.create(agentId, files);
  }

  @Get('agent/:agentId')
  findAll(@Param('agentId', ParseIntPipe) agentId: number) {
    return this.agentKnowledgebaseService.findAll(agentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.agentKnowledgebaseService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agentKnowledgebaseService.remove(id);
  }
}

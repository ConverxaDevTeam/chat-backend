import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutenticadorService } from './autenticador.service';
import { CreateAutenticadorDto } from './dto/create-autenticador.dto';
import { Autenticador } from '../../models/agent/Autenticador.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { BearerConfig, HttpAutenticador } from 'src/interfaces/function.interface';

@ApiTags('autenticadores')
@Controller('autenticadores')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutenticadorController {
  constructor(private readonly autenticadorService: AutenticadorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new authenticator' })
  create(
    @Body(new ValidationPipe({ transform: true }))
    createAutenticadorDto: CreateAutenticadorDto<HttpAutenticador<BearerConfig>> & { organizationId: string },
  ): Promise<Autenticador> {
    return this.autenticadorService.create(createAutenticadorDto);
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Get all authenticators for an organization' })
  findAll(@Param('organizationId') organizationId: string): Promise<Autenticador[]> {
    return this.autenticadorService.findAll(organizationId);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get one authenticator by id' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Autenticador> {
    return this.autenticadorService.findOne(id);
  }

  @Patch('/:id')
  @ApiOperation({ summary: 'Update an authenticator' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true }))
    updateAutenticadorDto: Partial<CreateAutenticadorDto<HttpAutenticador<BearerConfig>> & { organizationId: string }>,
  ): Promise<Autenticador> {
    return this.autenticadorService.update(id, updateAutenticadorDto);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete an authenticator' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.autenticadorService.remove(id);
  }
}

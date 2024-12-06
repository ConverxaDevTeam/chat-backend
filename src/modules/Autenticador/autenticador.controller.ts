import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutenticadorService } from './autenticador.service';
import { CreateAutenticadorDto } from './dto/create-autenticador.dto';
import { AutenticadorType } from 'src/interfaces/function.interface';
import { Autenticador } from '../../models/agent/Autenticador.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

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
    createAutenticadorDto: CreateAutenticadorDto<{
      type: AutenticadorType;
      config: Record<string, unknown>;
    }>,
  ): Promise<Autenticador> {
    return this.autenticadorService.create(createAutenticadorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all authenticators' })
  findAll(): Promise<Autenticador[]> {
    return this.autenticadorService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an authenticator by ID' })
  findOne(@Param('id') id: string): Promise<Autenticador> {
    return this.autenticadorService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an authenticator' })
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    updateAutenticadorDto: Partial<
      CreateAutenticadorDto<{
        type: AutenticadorType;
        config: Record<string, unknown>;
      }>
    >,
  ): Promise<Autenticador> {
    return this.autenticadorService.update(+id, updateAutenticadorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an authenticator' })
  remove(@Param('id') id: string): Promise<void> {
    return this.autenticadorService.remove(+id);
  }
}

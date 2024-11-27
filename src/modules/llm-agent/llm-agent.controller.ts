import { Controller, Get, Post, Put, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmAgentService } from '../../services/llm-agent/llm-agent.service';
import { Request } from 'express';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from './dto/CreateAgent.dto';
import { AgenteType } from 'src/interfaces/agent';

@ApiTags('Agent')
@Controller('agent')
export class LlmAgentController {
  constructor(private readonly llmAgentService: LlmAgentService) {}

  @ApiOperation({ summary: 'Obtiene un agente por su ID' })
  @Get('/:id')
  async getAgentById(
    @Param('id') id: number,
    @Query('organizacion') organizacionId: number, // Obtener el parámetro `organizacion`
  ): Promise<Agente> {
    return this.llmAgentService.getAgentById(id, organizacionId);
  }

  @ApiBody({ type: CreateAgentDto })
  @ApiOperation({ summary: 'Crea un nuevo agente' })
  @Post('/')
  async createAgent(
    @Body() createAgentDto: CreateAgentDto, // El body incluirá `organizacion_id`
    @Req() request: Request,
  ): Promise<Agente> {
    const { organization_id } = createAgentDto;
    return this.llmAgentService.createAgent(createAgentDto, organization_id);
  }

  @ApiBody({ type: CreateAgentDto })
  @ApiOperation({ summary: 'Actualiza un agente existente' })
  @Put('/:id')
  async updateAgent(
    @Param('id') id: number,
    @Body() updateAgentDto: Partial<CreateAgentDto>, // Body con `organizacion_id`
  ): Promise<Agente> {
    const agenteData: Partial<Agente> = {
      ...updateAgentDto,
      type: updateAgentDto.type as AgenteType,
    };
    return this.llmAgentService.updateAgent(id, agenteData);
  }
}

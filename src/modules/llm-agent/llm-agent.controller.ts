import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmAgentService } from '../../services/llm-agent/llm-agent.service';
import { Request } from 'express';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from './dto/CreateAgent.dto';

@ApiTags('Agent')
@Controller('agent')
export class LlmAgentController {
  constructor(private readonly llmAgentService: LlmAgentService) {}

  @ApiOperation({ summary: 'Obtiene un agente por su ID' })
  @Get('/:id')
  async getAgentById(@Param('id') id: number): Promise<Agente> {
    return this.llmAgentService.getAgentById(id);
  }

  @ApiBody({ type: CreateAgentDto })
  @ApiOperation({ summary: 'Crea un nuevo agente' })
  @Post('/')
  async createAgent(
    @Body() createAgentDto: CreateAgentDto,
    @Req() request: Request,
  ): Promise<Agente> {
    return this.llmAgentService.createAgent(createAgentDto);
  }

  @ApiBody({ type: CreateAgentDto })
  @ApiOperation({ summary: 'Actualiza un agente existente' })
  @Put('/:id')
  async updateAgent(
    @Param('id') id: number,
    @Body() updateAgentDto: Partial<CreateAgentDto>,
  ): Promise<Agente> {
    return this.llmAgentService.updateAgent(id, updateAgentDto);
  }
}


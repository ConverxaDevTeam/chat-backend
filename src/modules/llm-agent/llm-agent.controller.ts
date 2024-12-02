import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from './dto/CreateAgent.dto';
import { AgenteType } from 'src/interfaces/agent';
import { AgentManagerService } from 'src/services/llm-agent/agent-manager.service';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@ApiTags('Agent')
@Controller('agent')
export class LlmAgentController {
  constructor(private readonly agentManagerService: AgentManagerService) {}

  @ApiOperation({ summary: 'Obtiene un agente por su ID' })
  @Get('/:id')
  async getAgentById(
    @Param('id') id: number
  ): Promise<Agente> {
    return this.agentManagerService.getAgentById(id);
  }

  @ApiBody({ type: CreateAgentDto })
  @ApiOperation({ summary: 'Crea un nuevo agente' })
  @Post('/')
  async createAgent(
    @Body() createAgentDto: CreateAgentDto,
  ): Promise<Agente> {
    return this.agentManagerService.createAgent(createAgentDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateAgentDto })
  @ApiOperation({ summary: 'Actualiza un agente existente' })
  @Put('/:id')
  async updateAgent(
    @Param('id') id: number,
    @Body() updateAgentDto: Partial<CreateAgentDto>,
    @GetUser() user: User
  ): Promise<Agente> {
    return this.agentManagerService.updateAgent(id, updateAgentDto, user.id);
  }
}

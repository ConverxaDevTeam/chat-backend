import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, ValidationPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionService } from 'src/services/function/function.service';
import { CreateFunctionDto, UpdateFunctionDto, FunctionType } from 'src/interfaces/function.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('functions')
@Controller('functions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FunctionController {
  constructor(private readonly functionService: FunctionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new function' })
  create(@Body(new ValidationPipe({ transform: true })) createFunctionDto: CreateFunctionDto<FunctionType>): Promise<Funcion> {
    return this.functionService.create(createFunctionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all functions' })
  findAll(): Promise<Funcion[]> {
    return this.functionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a function by id' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Funcion> {
    return this.functionService.findOne(id);
  }

  @Get('agent/:agentId')
  @ApiOperation({ summary: 'Get all functions by agent id' })
  findByAgent(@Param('agentId', ParseIntPipe) agentId: number): Promise<Funcion[]> {
    return this.functionService.findByAgent(agentId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a function' })
  update(@Param('id', ParseIntPipe) id: number, @Body(new ValidationPipe({ transform: true })) updateFunctionDto: UpdateFunctionDto<FunctionType>): Promise<Funcion> {
    return this.functionService.update(id, updateFunctionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a function' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.functionService.remove(id);
  }
}

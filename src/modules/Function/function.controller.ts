import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { FunctionService } from '../../services/function/function.service';
import { CreateFunctionDto, UpdateFunctionDto } from '../../interfaces/function.interface';
import { Funcion } from '../../models/agent/Function.entity';

@Controller('functions')
export class FunctionController {
  constructor(private readonly functionService: FunctionService) {}

  @Post()
  create(@Body() createFunctionDto: CreateFunctionDto): Promise<Funcion> {
    return this.functionService.create(createFunctionDto);
  }

  @Get()
  findAll(): Promise<Funcion[]> {
    return this.functionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Funcion> {
    return this.functionService.findOne(id);
  }

  @Get('agent/:agentId')
  findByAgent(@Param('agentId', ParseIntPipe) agentId: number): Promise<Funcion[]> {
    return this.functionService.findByAgent(agentId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateFunctionDto: UpdateFunctionDto): Promise<Funcion> {
    return this.functionService.update(id, updateFunctionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.functionService.remove(id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionService } from 'src/services/function/function.service';
import { CreateFunctionDto, UpdateFunctionDto, FunctionType } from 'src/interfaces/function.interface';

@Controller('functions')
export class FunctionController {
  constructor(private readonly functionService: FunctionService) {}

  @Post()
  create(@Body(new ValidationPipe({ transform: true })) createFunctionDto: CreateFunctionDto<FunctionType>): Promise<Funcion> {
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
  update(@Param('id', ParseIntPipe) id: number, @Body(new ValidationPipe({ transform: true })) updateFunctionDto: UpdateFunctionDto<FunctionType>): Promise<Funcion> {
    return this.functionService.update(id, updateFunctionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.functionService.remove(id);
  }
}

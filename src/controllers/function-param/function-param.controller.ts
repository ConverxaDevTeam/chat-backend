import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FunctionParamService } from '../../services/function-param/function-param.service';
import { CreateFunctionParamDto, UpdateFunctionParamDto } from '../../interfaces/function-param.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@ApiTags('Function Parameters')
@Controller('functions/:functionId/parameters')
@UseGuards(JwtAuthGuard)
export class FunctionParamController {
  constructor(private readonly functionParamService: FunctionParamService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new function parameter' })
  @ApiResponse({ status: 201, description: 'Parameter created successfully' })
  create(@Param('functionId') functionId: number, @Body() createFunctionParamDto: CreateFunctionParamDto) {
    return this.functionParamService.create(functionId, createFunctionParamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all parameters for a function' })
  @ApiResponse({ status: 200, description: 'List of parameters' })
  findAll(@Param('functionId') functionId: number) {
    return this.functionParamService.findAll(functionId);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get a specific parameter by name' })
  @ApiResponse({ status: 200, description: 'Parameter details' })
  findOne(@Param('functionId') functionId: number, @Param('name') name: string) {
    return this.functionParamService.findOne(functionId, name);
  }

  @Patch(':name')
  @ApiOperation({ summary: 'Update a parameter' })
  @ApiResponse({ status: 200, description: 'Parameter updated successfully' })
  update(@Param('functionId') functionId: number, @Param('name') name: string, @Body() updateFunctionParamDto: UpdateFunctionParamDto) {
    return this.functionParamService.update(functionId, name, updateFunctionParamDto);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete a parameter' })
  @ApiResponse({ status: 200, description: 'Parameter deleted successfully' })
  remove(@Param('functionId') functionId: number, @Param('name') name: string) {
    return this.functionParamService.remove(functionId, name);
  }
}

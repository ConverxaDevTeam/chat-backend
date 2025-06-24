import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FunctionParamService } from '../../services/function-param/function-param.service';
import { UpdateFunctionParamDto } from '../../interfaces/function-param.interface';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { FunctionParam } from 'src/interfaces/function.interface';

@ApiTags('Function Parameters')
@Controller('functions/:functionId/parameters')
@UseGuards(JwtAuthGuard)
export class FunctionParamController {
  constructor(private readonly functionParamService: FunctionParamService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new function parameter' })
  @ApiResponse({ status: 201, description: 'Parameter created successfully' })
  create(@Param('functionId') functionId: number, @Body() createFunctionParamDto: FunctionParam) {
    return this.functionParamService.create(functionId, createFunctionParamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all parameters for a function' })
  @ApiResponse({ status: 200, description: 'List of parameters' })
  findAll(@Param('functionId') functionId: number) {
    return this.functionParamService.findAll(functionId);
  }

  @Patch(':paramIndex')
  @ApiOperation({ summary: 'Update a parameter by index' })
  @ApiResponse({ status: 200, description: 'Parameter updated successfully' })
  update(@Param('functionId') functionId: number, @Param('paramIndex') paramIndex: number, @Body() updateFunctionParamDto: UpdateFunctionParamDto) {
    return this.functionParamService.update(functionId, paramIndex, updateFunctionParamDto);
  }

  @Delete(':paramIndex')
  @ApiOperation({ summary: 'Delete a parameter by index' })
  @ApiResponse({ status: 200, description: 'Parameter deleted successfully' })
  remove(@Param('functionId') functionId: number, @Param('paramIndex') paramIndex: number) {
    return this.functionParamService.remove(functionId, paramIndex);
  }
}

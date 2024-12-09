import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { FunctionParamService } from '../../services/function-param/function-param.service';
import { UpdateFunctionParamDto } from '../../interfaces/function-param.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { FunctionParam } from 'src/interfaces/function.interface';

@ApiTags('Function Parameters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('function-params')
export class FunctionParamController {
  constructor(private readonly functionParamService: FunctionParamService) {}

  @Post(':functionId')
  @ApiOperation({ summary: 'Create a new function parameter' })
  @ApiResponse({ status: 201, description: 'Parameter created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Param('functionId', ParseIntPipe) functionId: number, @Body() createFunctionParamDto: FunctionParam) {
    return this.functionParamService.create(functionId, createFunctionParamDto);
  }

  @Get(':functionId')
  @ApiOperation({ summary: 'Get all parameters for a function' })
  @ApiResponse({ status: 200, description: 'List of parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Param('functionId', ParseIntPipe) functionId: number) {
    return this.functionParamService.findAll(functionId);
  }

  @Patch(':functionId/:paramIndex')
  @ApiOperation({ summary: 'Update a parameter by index' })
  @ApiResponse({ status: 200, description: 'Parameter updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Parameter not found' })
  update(@Param('functionId', ParseIntPipe) functionId: number, @Param('paramIndex', ParseIntPipe) paramIndex: number, @Body() updateFunctionParamDto: UpdateFunctionParamDto) {
    return this.functionParamService.update(functionId, paramIndex, updateFunctionParamDto);
  }

  @Delete(':functionId/:paramIndex')
  @ApiOperation({ summary: 'Delete a parameter by index' })
  @ApiResponse({ status: 200, description: 'Parameter deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Parameter not found' })
  remove(@Param('functionId', ParseIntPipe) functionId: number, @Param('paramIndex', ParseIntPipe) paramIndex: number) {
    return this.functionParamService.remove(functionId, paramIndex);
  }
}

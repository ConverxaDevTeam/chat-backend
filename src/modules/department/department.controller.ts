import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentService } from '../../services/department/department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { ParseIntPipe } from '@nestjs/common';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('departments')
@Controller('departments')
@UseGuards(JwtAuthRolesGuard)
@ApiBearerAuth()
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new department' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by id' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(+id);
  }

  @Get('organization/:id')
  @ApiOperation({ summary: 'Get all departments by organization id' })
  findByOrganization(@Param('id') id: string) {
    return this.departmentService.findByOrganization(+id);
  }

  @Get(':id/workspace')
  @ApiOperation({ summary: 'Get department details with agent information' })
  async getDepartmentWithDetails(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.getDepartmentWithDetails(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department' })
  remove(@Param('id') id: string) {
    return this.departmentService.remove(+id);
  }
}

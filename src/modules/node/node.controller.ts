import { Body, Controller, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NodeService } from './node.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum NodeType {
  FUNCTION = 'function',
  AGENT = 'agent',
}

class UpdateNodePositionDto {
  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;

  @ApiProperty({ enum: NodeType })
  @IsEnum(NodeType)
  type: NodeType;
}

@ApiTags('nodes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('nodes')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Patch(':id/position')
  @ApiOperation({ summary: 'Update node position' })
  async updatePosition(@Param('id', ParseIntPipe) id: number, @Body() positionDto: UpdateNodePositionDto) {
    return this.nodeService.updatePosition(id, positionDto);
  }
}

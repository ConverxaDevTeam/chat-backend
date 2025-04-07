import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { ParamType } from 'src/interfaces/function-param.interface';
import { FunctionTemplateParam } from 'src/interfaces/template.interface';
import { FunctionTemplate } from '@models/function-template/function-template.entity';

class FunctionTemplateParamDto implements FunctionTemplateParam {
  @ApiProperty()
  name: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: ParamType })
  type: ParamType;

  @ApiProperty({ required: false })
  required?: boolean;

  @ApiProperty({ required: false })
  enumValues?: string[];

  @ApiProperty({ required: false })
  defaultValue?: any;

  @ApiProperty({ type: () => FunctionTemplateParamDto, required: false })
  properties?: Record<string, FunctionTemplateParamDto>;
}

export class CreateFunctionTemplateDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  categoryId: number;

  @ApiProperty()
  applicationId: number;

  @ApiProperty()
  tags: string[];

  @ApiProperty({ required: false })
  authenticatorId?: number;

  @ApiProperty()
  url: string;

  @ApiProperty({ default: 'GET' })
  method?: string;

  @ApiProperty({ default: 'json' })
  bodyType?: string;

  @ApiProperty({ type: () => FunctionTemplateParamDto })
  params: Record<string, FunctionTemplateParam>;
}

export class UpdateFunctionTemplateDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  categoryId?: number;

  @ApiProperty({ required: false })
  applicationId?: number;

  @ApiProperty({ required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  authenticatorId?: number;

  @ApiProperty({ required: false })
  url?: string;

  @ApiProperty({ required: false })
  method?: string;

  @ApiProperty({ required: false })
  bodyType?: string;

  @ApiProperty({ type: () => FunctionTemplateParamDto, required: false })
  params?: Record<string, FunctionTemplateParam>;
}

export class FunctionTemplateSearchDto {
  @ApiProperty({ required: false })
  search?: string;

  @ApiProperty({ required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  categoryId?: number;

  @ApiProperty({ required: false })
  applicationId?: number;

  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  limit?: number = 10;
}

@ApiExtraModels(FunctionTemplateSearchDto)
export class FunctionTemplateResponseDto {
  @ApiProperty({ type: () => FunctionTemplate, isArray: true })
  items: FunctionTemplate[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

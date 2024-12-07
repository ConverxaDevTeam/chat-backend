import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum ParamType {
  STRING = 'string',
  NUMBER = 'number',
  ENUM = 'enum',
  REGEX = 'regex',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
}

export class CreateFunctionParamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ParamType)
  @IsNotEmpty()
  type: ParamType;

  @IsString()
  description: string;
}

export class UpdateFunctionParamDto {
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsEnum(ParamType)
  @IsNotEmpty()
  type?: ParamType;

  @IsString()
  description?: string;
}

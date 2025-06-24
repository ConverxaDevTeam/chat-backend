import { IsString, IsNotEmpty, IsEnum, IsBoolean } from 'class-validator';

export enum ParamType {
  STRING = 'string',
  NUMBER = 'number',
  ENUM = 'enum',
  REGEX = 'regex',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
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

  @IsBoolean()
  required?: boolean;
}

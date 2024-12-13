import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { AutenticadorType } from 'src/interfaces/function.interface';

export class CreateAutenticadorDto<T extends { type: AutenticadorType; config: Record<string, unknown> }> {
  @ApiProperty({
    enum: AutenticadorType,
    example: AutenticadorType.ENDPOINT,
    description: 'Type of authenticator',
  })
  @IsEnum(AutenticadorType)
  @IsNotEmpty()
  type: T['type'];

  @ApiProperty({
    example: {
      url: 'https://api.example.com/auth',
      method: 'POST',
      params: { client_id: 'xxx' },
      injectPlace: 'bearerHeader',
      injectConfig: {
        tokenPath: 'access_token',
        refreshPath: 'refresh_token',
      },
    },
    description: 'Configuration for the authenticator',
  })
  @IsObject()
  @IsNotEmpty()
  config: T['config'];

  @ApiProperty({
    example: 'Autenticador name',
    description: 'Name of the authenticator',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 3600,
    description: 'Lifetime in seconds for the authentication token',
  })
  @IsNumber()
  @IsOptional()
  life_time?: number;

  @ApiProperty({
    example: 'Bearer token value',
    description: 'Value of the authenticator (e.g., token)',
  })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiProperty()
  @IsString()
  organizationId: string;
}

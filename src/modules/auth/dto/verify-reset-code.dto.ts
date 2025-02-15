import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetCodeDto {
  @ApiProperty({ example: 'frank@pixeldigita.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: '377595', description: 'Reset password code' })
  code: string;
}

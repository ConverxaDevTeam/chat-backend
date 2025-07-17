import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { WizardStatus } from '@models/Organization.entity';

export class UpdateWizardStatusDto {
  @ApiProperty({
    description: 'Estado del wizard de configuración inicial',
    enum: WizardStatus,
    example: WizardStatus.DEPARTMENT,
  })
  @IsEnum(WizardStatus, {
    message: 'wizardStatus debe ser uno de los valores válidos: organization, department, agent, knowledge, chat, integration',
  })
  @IsNotEmpty()
  wizardStatus: WizardStatus;
}

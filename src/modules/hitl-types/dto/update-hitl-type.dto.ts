import { PartialType } from '@nestjs/swagger';
import { CreateHitlTypeDto } from './create-hitl-type.dto';

export class UpdateHitlTypeDto extends PartialType(CreateHitlTypeDto) {}

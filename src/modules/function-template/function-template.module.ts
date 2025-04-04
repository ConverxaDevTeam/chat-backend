import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionTemplateController } from './function-template.controller';
import { FunctionTemplateService } from './function-template.service';
import { FunctionTemplate } from '@models/function-template/function-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FunctionTemplate])],
  controllers: [FunctionTemplateController],
  providers: [FunctionTemplateService],
  exports: [FunctionTemplateService],
})
export class FunctionTemplateModule {}

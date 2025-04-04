import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionTemplateController } from './function-template.controller';
import { FunctionTemplateService } from './function-template.service';
import { FunctionTemplate } from '@models/function-template/function-template.entity';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FunctionTemplate, FunctionTemplateCategory, FunctionTemplateApplication]), AuthModule],
  controllers: [FunctionTemplateController],
  providers: [FunctionTemplateService],
  exports: [FunctionTemplateService],
})
export class FunctionTemplateModule {}

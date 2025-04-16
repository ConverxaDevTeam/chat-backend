import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionTemplateController } from './function-template.controller';
import { FunctionTemplateService } from './function-template.service';
import { TemplateGeneratorService } from './template-generator.service';
import { FunctionTemplate } from '@models/function-template/function-template.entity';
import { FunctionTemplateCategory } from '@models/function-template/function-template-category.entity';
import { FunctionTemplateApplication } from '@models/function-template/function-template-application.entity';
import { FunctionTemplateTag } from '@models/function-template/function-template-tag.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { FileModule } from '@modules/file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([FunctionTemplate, FunctionTemplateCategory, FunctionTemplateApplication, FunctionTemplateTag]), AuthModule, FileModule],
  controllers: [FunctionTemplateController],
  providers: [FunctionTemplateService, TemplateGeneratorService],
  exports: [FunctionTemplateService],
})
export class FunctionTemplateModule {}

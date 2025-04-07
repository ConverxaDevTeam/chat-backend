import { MigrationInterface, QueryRunner } from "typeorm";

export class FunctionTemplateEntities1744040848575 implements MigrationInterface {
    name = 'FunctionTemplateEntities1744040848575'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "function_template_application" ALTER COLUMN "isActive" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "function_template_application" ALTER COLUMN "isActive" SET DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "function_template_application" ALTER COLUMN "isActive" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "function_template_application" ALTER COLUMN "isActive" SET DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}

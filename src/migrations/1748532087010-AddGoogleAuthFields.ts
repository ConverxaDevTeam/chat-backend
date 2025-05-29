import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleAuthFields1748532087010 implements MigrationInterface {
    name = 'AddGoogleAuthFields1748532087010'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "Users" ADD "google_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "Users" ADD "picture" character varying(1024)`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "picture"`);
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "google_id"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}

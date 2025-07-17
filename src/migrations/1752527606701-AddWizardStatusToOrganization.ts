import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWizardStatusToOrganization1752527606701 implements MigrationInterface {
  name = 'AddWizardStatusToOrganization1752527606701';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `CREATE TYPE "public"."Organizations_wizardstatus_enum" AS ENUM('organization', 'department', 'agent', 'knowledge', 'chat', 'integration', 'link_web')`,
    );
    await queryRunner.query(`ALTER TABLE "Organizations" ADD "wizardStatus" "public"."Organizations_wizardstatus_enum" NOT NULL DEFAULT 'organization'`);
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
    await queryRunner.query(`ALTER TABLE "Organizations" DROP COLUMN "wizardStatus"`);
    await queryRunner.query(`DROP TYPE "public"."Organizations_wizardstatus_enum"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
  }
}

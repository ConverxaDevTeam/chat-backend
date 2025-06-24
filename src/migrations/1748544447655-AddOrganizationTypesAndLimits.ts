import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationTypesAndLimits1748544447655 implements MigrationInterface {
  name = 'AddOrganizationTypesAndLimits1748544447655';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "OrganizationLimits" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "conversationLimit" integer NOT NULL DEFAULT '50', "durationDays" integer NOT NULL DEFAULT '15', "isMonthly" boolean NOT NULL DEFAULT false, "organizationId" integer NOT NULL, CONSTRAINT "PK_095a6f37620f6ad19f0a0ac22d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum" RENAME TO "Organizations_type_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum" AS ENUM('production', 'mvp', 'free', 'custom')`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum" USING "type"::"text"::"public"."Organizations_type_enum"`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
    await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum_old"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
    await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum" RENAME TO "Organizations_type_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum" AS ENUM('production', 'mvp', 'free', 'custom')`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum" USING "type"::"text"::"public"."Organizations_type_enum"`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
    await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum_old"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
    await queryRunner.query(
      `ALTER TABLE "OrganizationLimits" ADD CONSTRAINT "FK_27e15bfaf17851ca2fcdf034d57" FOREIGN KEY ("organizationId") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "OrganizationLimits" DROP CONSTRAINT "FK_27e15bfaf17851ca2fcdf034d57"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
    await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum_old" AS ENUM('production', 'mvp')`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum_old" USING "type"::"text"::"public"."Organizations_type_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
    await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum_old" RENAME TO "Organizations_type_enum"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
    await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum_old" AS ENUM('production', 'mvp')`);
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum_old" USING "type"::"text"::"public"."Organizations_type_enum_old"`,
    );
    await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
    await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum_old" RENAME TO "Organizations_type_enum"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`DROP TABLE "OrganizationLimits"`);
  }
}

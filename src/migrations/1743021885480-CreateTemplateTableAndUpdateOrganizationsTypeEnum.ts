import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTemplateTableAndUpdateOrganizationsTypeEnum1743021885480 implements MigrationInterface {
    name = 'CreateTemplateTableAndUpdateOrganizationsTypeEnum1743021885480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "template" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "description" character varying, "imageUrl" character varying, "sourceDepartmentId" integer NOT NULL, CONSTRAINT "PK_fbae2ac36bd9b5e1e793b957b7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum" RENAME TO "Organizations_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum" AS ENUM('production', 'mvp', 'template')`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum" USING "type"::"text"::"public"."Organizations_type_enum"`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
        await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum" RENAME TO "Organizations_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum" AS ENUM('production', 'mvp', 'template')`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum" USING "type"::"text"::"public"."Organizations_type_enum"`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
        await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "template" ADD CONSTRAINT "FK_707db602c96477aaab80ac82e20" FOREIGN KEY ("sourceDepartmentId") REFERENCES "departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "template" DROP CONSTRAINT "FK_707db602c96477aaab80ac82e20"`);
        await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum_old" AS ENUM('production', 'mvp')`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum_old" USING "type"::"text"::"public"."Organizations_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
        await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum_old" RENAME TO "Organizations_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum_old" AS ENUM('production', 'mvp')`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" TYPE "public"."Organizations_type_enum_old" USING "type"::"text"::"public"."Organizations_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "Organizations" ALTER COLUMN "type" SET DEFAULT 'production'`);
        await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."Organizations_type_enum_old" RENAME TO "Organizations_type_enum"`);
        await queryRunner.query(`DROP TABLE "template"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMetricDisplayTypes1751330682869 implements MigrationInterface {
    name = 'AddMetricDisplayTypes1751330682869'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ChatUserData" DROP CONSTRAINT "FK_ChatUserData_chat_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ChatUserData_chat_user_id_key"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`ALTER TYPE "public"."DashboardCards_displaytype_enum" RENAME TO "DashboardCards_displaytype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."DashboardCards_displaytype_enum" AS ENUM('PIE', 'BAR', 'AREA', 'METRIC', 'METRIC_AVG', 'METRIC_ACUM')`);
        await queryRunner.query(`ALTER TABLE "DashboardCards" ALTER COLUMN "displayType" TYPE "public"."DashboardCards_displaytype_enum" USING "displayType"::"text"::"public"."DashboardCards_displaytype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."DashboardCards_displaytype_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."DashboardCards_displaytype_enum" RENAME TO "DashboardCards_displaytype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."DashboardCards_displaytype_enum" AS ENUM('PIE', 'BAR', 'AREA', 'METRIC', 'METRIC_AVG', 'METRIC_ACUM')`);
        await queryRunner.query(`ALTER TABLE "DashboardCards" ALTER COLUMN "displayType" TYPE "public"."DashboardCards_displaytype_enum" USING "displayType"::"text"::"public"."DashboardCards_displaytype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."DashboardCards_displaytype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_57b3d792162f1dfd42725b17d3" ON "ChatUserData" ("chat_user_id", "key") `);
        await queryRunner.query(`ALTER TABLE "ChatUserData" ADD CONSTRAINT "FK_d0f8b4a2bc1b7344c90f4d818e5" FOREIGN KEY ("chat_user_id") REFERENCES "ChatUsers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ChatUserData" DROP CONSTRAINT "FK_d0f8b4a2bc1b7344c90f4d818e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_57b3d792162f1dfd42725b17d3"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`CREATE TYPE "public"."DashboardCards_displaytype_enum_old" AS ENUM('PIE', 'BAR', 'AREA', 'METRIC')`);
        await queryRunner.query(`ALTER TABLE "DashboardCards" ALTER COLUMN "displayType" TYPE "public"."DashboardCards_displaytype_enum_old" USING "displayType"::"text"::"public"."DashboardCards_displaytype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."DashboardCards_displaytype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."DashboardCards_displaytype_enum_old" RENAME TO "DashboardCards_displaytype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."DashboardCards_displaytype_enum_old" AS ENUM('PIE', 'BAR', 'AREA', 'METRIC')`);
        await queryRunner.query(`ALTER TABLE "DashboardCards" ALTER COLUMN "displayType" TYPE "public"."DashboardCards_displaytype_enum_old" USING "displayType"::"text"::"public"."DashboardCards_displaytype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."DashboardCards_displaytype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."DashboardCards_displaytype_enum_old" RENAME TO "DashboardCards_displaytype_enum"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ChatUserData_chat_user_id_key" ON "ChatUserData" ("chat_user_id", "key") `);
        await queryRunner.query(`ALTER TABLE "ChatUserData" ADD CONSTRAINT "FK_ChatUserData_chat_user_id" FOREIGN KEY ("chat_user_id") REFERENCES "ChatUsers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}

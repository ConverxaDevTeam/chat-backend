import { MigrationInterface, QueryRunner } from "typeorm";

export class FunctionTemplateRelations1743799397887 implements MigrationInterface {
    name = 'FunctionTemplateRelations1743799397887'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "template" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "description" character varying, "imageUrl" character varying, "sourceDepartmentId" integer NOT NULL, CONSTRAINT "PK_fbae2ac36bd9b5e1e793b957b7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "function_template_category" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_6478ee539f326e9e5dd01528e64" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "function_template_application" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "image" character varying, "domain" character varying, "isDynamicDomain" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_7277abc4987f4d28585e288c636" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "function_template" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "categoryId" integer NOT NULL, "applicationId" integer NOT NULL, "tags" text NOT NULL, "url" character varying NOT NULL, "method" character varying NOT NULL DEFAULT 'GET', "bodyType" character varying NOT NULL DEFAULT 'json', "params" jsonb NOT NULL, "organizationId" integer NOT NULL, CONSTRAINT "PK_b3aa1946221bbeadb4cd1866b8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "template" ADD CONSTRAINT "FK_707db602c96477aaab80ac82e20" FOREIGN KEY ("sourceDepartmentId") REFERENCES "departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "function_template" ADD CONSTRAINT "FK_891a32794539ac83ae3c72df34d" FOREIGN KEY ("categoryId") REFERENCES "function_template_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "function_template" ADD CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb" FOREIGN KEY ("applicationId") REFERENCES "function_template_application"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "function_template" DROP CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb"`);
        await queryRunner.query(`ALTER TABLE "function_template" DROP CONSTRAINT "FK_891a32794539ac83ae3c72df34d"`);
        await queryRunner.query(`ALTER TABLE "template" DROP CONSTRAINT "FK_707db602c96477aaab80ac82e20"`);
        await queryRunner.query(`DROP TABLE "function_template"`);
        await queryRunner.query(`DROP TABLE "function_template_application"`);
        await queryRunner.query(`DROP TABLE "function_template_category"`);
        await queryRunner.query(`DROP TABLE "template"`);
    }

}

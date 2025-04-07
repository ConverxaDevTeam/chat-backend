import { MigrationInterface, QueryRunner } from "typeorm";

export class FunctionTemplateEntities1744036431715 implements MigrationInterface {
    name = 'FunctionTemplateEntities1744036431715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "function_template_category" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" text, CONSTRAINT "PK_6478ee539f326e9e5dd01528e64" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "function_template_application" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "isActive" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7277abc4987f4d28585e288c636" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "function_template" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "categoryId" integer NOT NULL, "applicationId" integer NOT NULL, "tags" text NOT NULL, "url" character varying NOT NULL, "method" character varying NOT NULL DEFAULT 'GET', "bodyType" character varying NOT NULL DEFAULT 'json', "params" json NOT NULL, "headers" json NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3aa1946221bbeadb4cd1866b8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "function_template" ADD CONSTRAINT "FK_891a32794539ac83ae3c72df34d" FOREIGN KEY ("categoryId") REFERENCES "function_template_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "function_template" ADD CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb" FOREIGN KEY ("applicationId") REFERENCES "function_template_application"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "function_template" DROP CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb"`);
        await queryRunner.query(`ALTER TABLE "function_template" DROP CONSTRAINT "FK_891a32794539ac83ae3c72df34d"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
        await queryRunner.query(`DROP TABLE "function_template"`);
        await queryRunner.query(`DROP TABLE "function_template_application"`);
        await queryRunner.query(`DROP TABLE "function_template_category"`);
    }

}

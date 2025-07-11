import { MigrationInterface, QueryRunner } from 'typeorm';

export class FunctionTemplateRelations1744054508684 implements MigrationInterface {
  name = 'FunctionTemplateRelations1744054508684';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "function_template_category" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" text, CONSTRAINT "PK_6478ee539f326e9e5dd01528e64" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "function_template_application" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "imageUrl" character varying, "domain" character varying, "isDynamicDomain" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7277abc4987f4d28585e288c636" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "function_template" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "categoryId" integer NOT NULL, "applicationId" integer NOT NULL, "url" character varying NOT NULL, "method" character varying NOT NULL DEFAULT 'GET', "bodyType" character varying NOT NULL DEFAULT 'json', "params" text, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b3aa1946221bbeadb4cd1866b8b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "function_template_tag" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_4a9a24a3d2d84369cad9ad43a85" UNIQUE ("name"), CONSTRAINT "PK_f68415860da467143807fea00bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "function_template_tags_function_template_tag" ("functionTemplateId" integer NOT NULL, "functionTemplateTagId" integer NOT NULL, CONSTRAINT "PK_25a46f1c9320157119b2ef75adf" PRIMARY KEY ("functionTemplateId", "functionTemplateTagId"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_19817bcfeb0a9c9cf77982eaf3" ON "function_template_tags_function_template_tag" ("functionTemplateId") `);
    await queryRunner.query(`CREATE INDEX "IDX_5a331765b20a161378b2fedad4" ON "function_template_tags_function_template_tag" ("functionTemplateTagId") `);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "isActive" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" character varying`);
    await queryRunner.query(
      `ALTER TABLE "function_template" ADD CONSTRAINT "FK_891a32794539ac83ae3c72df34d" FOREIGN KEY ("categoryId") REFERENCES "function_template_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "function_template" ADD CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb" FOREIGN KEY ("applicationId") REFERENCES "function_template_application"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "function_template_tags_function_template_tag" ADD CONSTRAINT "FK_19817bcfeb0a9c9cf77982eaf3b" FOREIGN KEY ("functionTemplateId") REFERENCES "function_template"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "function_template_tags_function_template_tag" ADD CONSTRAINT "FK_5a331765b20a161378b2fedad44" FOREIGN KEY ("functionTemplateTagId") REFERENCES "function_template_tag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "function_template_tags_function_template_tag" DROP CONSTRAINT "FK_5a331765b20a161378b2fedad44"`);
    await queryRunner.query(`ALTER TABLE "function_template_tags_function_template_tag" DROP CONSTRAINT "FK_19817bcfeb0a9c9cf77982eaf3b"`);
    await queryRunner.query(`ALTER TABLE "function_template" DROP CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb"`);
    await queryRunner.query(`ALTER TABLE "function_template" DROP CONSTRAINT "FK_891a32794539ac83ae3c72df34d"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" ADD "description" text`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "function_template_category" DROP COLUMN "isActive"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5a331765b20a161378b2fedad4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_19817bcfeb0a9c9cf77982eaf3"`);
    await queryRunner.query(`DROP TABLE "function_template_tags_function_template_tag"`);
    await queryRunner.query(`DROP TABLE "function_template_tag"`);
    await queryRunner.query(`DROP TABLE "function_template"`);
    await queryRunner.query(`DROP TABLE "function_template_application"`);
    await queryRunner.query(`DROP TABLE "function_template_category"`);
  }
}

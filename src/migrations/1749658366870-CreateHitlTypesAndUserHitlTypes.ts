import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHitlTypesAndUserHitlTypes1749658366870 implements MigrationInterface {
  name = 'CreateHitlTypesAndUserHitlTypes1749658366870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "hitl_types" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "description" character varying(500), "organization_id" integer NOT NULL, "created_by" integer NOT NULL, CONSTRAINT "PK_5815f6f85b453f86d51c32933ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_hitl_types" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_id" integer NOT NULL, "hitl_type_id" integer NOT NULL, "organization_id" integer NOT NULL, CONSTRAINT "PK_af3934cbfdbfbb5de4fed52eada" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "hitl_types" ADD CONSTRAINT "FK_8ed8807e478f67d17e3c5c38e96" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hitl_types" ADD CONSTRAINT "FK_2f5b23590f1c10a0d4b003903b8" FOREIGN KEY ("created_by") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_hitl_types" ADD CONSTRAINT "FK_bbbf9459d138b3c32a27d0b4f05" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_hitl_types" ADD CONSTRAINT "FK_0bce9430cbd3978430bf311ceaf" FOREIGN KEY ("hitl_type_id") REFERENCES "hitl_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_hitl_types" ADD CONSTRAINT "FK_31c6ef7d3d2b57f089609af05c8" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_hitl_types" DROP CONSTRAINT "FK_31c6ef7d3d2b57f089609af05c8"`);
    await queryRunner.query(`ALTER TABLE "user_hitl_types" DROP CONSTRAINT "FK_0bce9430cbd3978430bf311ceaf"`);
    await queryRunner.query(`ALTER TABLE "user_hitl_types" DROP CONSTRAINT "FK_bbbf9459d138b3c32a27d0b4f05"`);
    await queryRunner.query(`ALTER TABLE "hitl_types" DROP CONSTRAINT "FK_2f5b23590f1c10a0d4b003903b8"`);
    await queryRunner.query(`ALTER TABLE "hitl_types" DROP CONSTRAINT "FK_8ed8807e478f67d17e3c5c38e96"`);
    await queryRunner.query(`CREATE TYPE "public"."ChatSessions_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
    await queryRunner.query(`ALTER TABLE "ChatSessions" ADD "priority" "public"."ChatSessions_priority_enum" NOT NULL DEFAULT 'medium'`);
    await queryRunner.query(`DROP TABLE "user_hitl_types"`);
    await queryRunner.query(`DROP TABLE "hitl_types"`);
  }
}

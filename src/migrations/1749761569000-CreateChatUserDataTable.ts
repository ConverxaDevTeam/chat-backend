import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatUserDataTable1749761569000 implements MigrationInterface {
  name = 'CreateChatUserDataTable1749761569000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ChatUserData" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "chat_user_id" integer NOT NULL, "key" character varying(100) NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_ChatUserData" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ChatUserData_chat_user_id_key" ON "ChatUserData" ("chat_user_id", "key")`);
    await queryRunner.query(
      `ALTER TABLE "ChatUserData" ADD CONSTRAINT "FK_ChatUserData_chat_user_id" FOREIGN KEY ("chat_user_id") REFERENCES "ChatUsers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ChatUserData" DROP CONSTRAINT "FK_ChatUserData_chat_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_ChatUserData_chat_user_id_key"`);
    await queryRunner.query(`DROP TABLE "ChatUserData"`);
  }
}

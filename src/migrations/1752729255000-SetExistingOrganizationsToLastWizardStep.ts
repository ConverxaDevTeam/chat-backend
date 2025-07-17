import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetExistingOrganizationsToLastWizardStep1752729255000 implements MigrationInterface {
  name = 'SetExistingOrganizationsToLastWizardStep1752729255000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Actualizar todas las organizaciones existentes para que tengan el wizardStatus en el último paso
    await queryRunner.query(`UPDATE "Organizations" SET "wizardStatus" = 'link_web' WHERE "wizardStatus" != 'link_web'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir todas las organizaciones al estado inicial del wizard
    await queryRunner.query(`UPDATE "Organizations" SET "wizardStatus" = 'organization' WHERE "wizardStatus" = 'link_web'`);
  }
}

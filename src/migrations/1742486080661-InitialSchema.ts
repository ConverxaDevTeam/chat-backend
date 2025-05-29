import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1742486080661 implements MigrationInterface {
    name = 'InitialSchema1742486080661';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear extensión vector primero
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        
        await queryRunner.query(`CREATE TABLE "Sessions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "expiredAt" TIMESTAMP NOT NULL, "ip" character varying NOT NULL, "browser" character varying NOT NULL, "operatingSystem" character varying NOT NULL, "userId" integer, CONSTRAINT "PK_0ff5532d98863bc618809d2d401" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ChatUsers_type_enum" AS ENUM('chat_web', 'whatsapp', 'messenger', 'slack')`);
        await queryRunner.query(`CREATE TABLE "ChatUsers" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "secret" character varying(128), "identified" character varying, "type" "public"."ChatUsers_type_enum" NOT NULL DEFAULT 'chat_web', "phone" character varying, "web" character varying, "name" character varying, "last_login" TIMESTAMP, "address" character varying, "avatar" character varying, "email" character varying, "browser" character varying, "operating_system" character varying, "ip" character varying, CONSTRAINT "PK_85852187b9e3a4144b436663d78" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."ChatSessions_status_enum" AS ENUM('active', 'closed')`);
        await queryRunner.query(`CREATE TABLE "ChatSessions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "status" "public"."ChatSessions_status_enum" NOT NULL DEFAULT 'active', "lastInteractionAt" TIMESTAMP NOT NULL DEFAULT now(), "closedAt" TIMESTAMP, "metadata" json, "conversationId" integer NOT NULL, CONSTRAINT "PK_a13a97991b35f4dc6ec4a5b5507" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Messages_type_enum" AS ENUM('user', 'agent', 'hitl')`);
        await queryRunner.query(`CREATE TYPE "public"."Messages_format_enum" AS ENUM('text', 'image', 'audio')`);
        await queryRunner.query(`CREATE TABLE "Messages" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "text" character varying, "audio" character varying, "time" integer DEFAULT '0', "images" json, "type" "public"."Messages_type_enum" NOT NULL DEFAULT 'user', "format" "public"."Messages_format_enum" NOT NULL DEFAULT 'text', "conversationId" integer, "chatSessionId" integer, CONSTRAINT "PK_ecc722506c4b974388431745e8b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Conversations_type_enum" AS ENUM('chat_web', 'whatsapp', 'messenger', 'slack')`);
        await queryRunner.query(`CREATE TABLE "Conversations" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "user_deleted" boolean NOT NULL DEFAULT false, "type" "public"."Conversations_type_enum" NOT NULL DEFAULT 'chat_web', "config" json, "need_human" boolean NOT NULL DEFAULT false, "userId" integer, "chatUserId" integer, "departamentoId" integer, "integrationId" integer, CONSTRAINT "PK_44f6c6ade92598cd70087acf2a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Integrations_type_enum" AS ENUM('chat_web', 'whatsapp', 'messenger', 'slack', 'messenger_manual', 'whatsapp_manual')`);
        await queryRunner.query(`CREATE TABLE "Integrations" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "config" json NOT NULL DEFAULT '"{}"', "token" character varying, "phone_number_id" character varying, "waba_id" character varying, "page_id" character varying, "team_id" character varying, "authed_user_id" character varying, "bot_user_id" character varying, "team_name" character varying, "slack_channel_id" character varying, "slack_channel_name" character varying, "refresh_token" character varying, "code_webhook" character varying, "validated_webhook" boolean DEFAULT false, "type" "public"."Integrations_type_enum" NOT NULL, "departamentoId" integer, CONSTRAINT "PK_d03a73c576f7ad2f484afe77ec0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."autenticador_type_enum" AS ENUM('endpoint', 'api_key')`);
        await queryRunner.query(`CREATE TABLE "autenticador" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "type" "public"."autenticador_type_enum" NOT NULL, "config" json NOT NULL, "name" character varying(255) NOT NULL, "life_time" integer NOT NULL DEFAULT '0', "field_name" character varying(255) NOT NULL DEFAULT 'Authorization', "value" character varying, "organizationId" integer NOT NULL, CONSTRAINT "PK_11eeee0f5c42100269496f93d1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."funcion_type_enum" AS ENUM('apiEndpoint')`);
        await queryRunner.query(`CREATE TABLE "funcion" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "normalizedName" character varying(255) NOT NULL, "description" text, "type" "public"."funcion_type_enum" NOT NULL, "config" text, "agent_id" integer, "autenticador" integer, CONSTRAINT "UQ_af406a621fe90551c63161acfc9" UNIQUE ("normalizedName", "agent_id"), CONSTRAINT "PK_048102c1546244e94f6dab37f45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "knowledge_base" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "fileId" character varying(50) NOT NULL, "expirationTime" integer, "filename" character varying(255) NOT NULL, "agent_id" integer, CONSTRAINT "PK_19d3f52f6da1501b7e235f1da5c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."agente_type_enum" AS ENUM('sofia_asistente', 'claude')`);
        await queryRunner.query(`CREATE TABLE "agente" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "type" "public"."agente_type_enum" NOT NULL, "config" json, "canEscalateToHuman" boolean NOT NULL DEFAULT true, "departamento_id" integer, CONSTRAINT "REL_7cefc7a63f060d6a45ea01997e" UNIQUE ("departamento_id"), CONSTRAINT "PK_47af256a3a46207eab30a0b126e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "departamento" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "description" text, "organization_id" integer, CONSTRAINT "PK_7fd6f336280fd0c7a9318464723" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."Organizations_type_enum" AS ENUM('production', 'mvp')`);
        await queryRunner.query(`CREATE TABLE "Organizations" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "description" character varying(255), "logo" character varying(255), "type" "public"."Organizations_type_enum" NOT NULL DEFAULT 'production', "deletedAt" TIMESTAMP, CONSTRAINT "PK_e0690a31419f6666194423526f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."UserOrganizations_role_enum" AS ENUM('admin', 'ing_preventa', 'usr_tecnico', 'owner', 'supervisor', 'hitl', 'user')`);
        await queryRunner.query(`CREATE TABLE "UserOrganizations" ("id" SERIAL NOT NULL, "role" "public"."UserOrganizations_role_enum" NOT NULL DEFAULT 'user', "deletedAt" TIMESTAMP, "userId" integer, "organizationId" integer, CONSTRAINT "PK_34f9cbade5083b765064d79617a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Users" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(255) NOT NULL, "email_verified" boolean NOT NULL DEFAULT false, "password" character varying(128) NOT NULL, "is_super_admin" boolean NOT NULL DEFAULT false, "last_login" TIMESTAMP, "first_name" character varying(255), "last_name" character varying(255), "reset_password_code" character varying(6), "reset_password_expires" TIMESTAMP WITH TIME ZONE, "deletedAt" TIMESTAMP, CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3c3ab3f49a87e6ddb607f3c494" ON "Users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('SYSTEM', 'USER')`);
        await queryRunner.query(`CREATE TYPE "public"."notification_status_enum" AS ENUM('READ', 'UNREAD')`);
        await queryRunner.query(`CREATE TABLE "notification" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "title" character varying NOT NULL, "avatar" character varying, "organizationId" integer NOT NULL, "type" "public"."notification_type_enum" NOT NULL DEFAULT 'SYSTEM', "status" "public"."notification_status_enum" NOT NULL DEFAULT 'UNREAD', "link" character varying, "metadata" json, "userId" integer, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."system_events_type_enum" AS ENUM('FUNCTION_CALL', 'FUNCTION_CREATED', 'FUNCTION_UPDATED', 'FUNCTION_DELETED', 'FUNCTION_EXECUTION_STARTED', 'FUNCTION_EXECUTION_COMPLETED', 'FUNCTION_EXECUTION_FAILED', 'FUNCTION_PARAM_VALIDATION_ERROR', 'FUNCTION_NOT_FOUND', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'SESSION_STARTED', 'SESSION_ENDED', 'CONVERSATION_CREATED', 'CONVERSATION_CLOSED', 'CONVERSATION_ASSIGNED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_LOGIN', 'USER_LOGOUT', 'AGENT_CREATED', 'AGENT_UPDATED', 'AGENT_DELETED', 'AGENT_ASSIGNED', 'AGENT_INITIALIZED', 'AGENT_RESPONSE_STARTED', 'AGENT_RESPONSE_COMPLETED', 'AGENT_RESPONSE_FAILED', 'AGENT_MESSAGE_ADDED', 'AGENT_VECTOR_STORE_CREATED', 'AGENT_VECTOR_STORE_DELETED', 'AGENT_VECTOR_STORE_ERROR', 'AGENT_FILE_UPLOADED', 'AGENT_FILE_UPLOAD_ERROR', 'AGENT_FILE_DELETED', 'AGENT_FILE_DELETE_ERROR', 'AGENT_TOOLS_UPDATED', 'AGENT_THREAD_CREATED', 'SYSTEM_ERROR', 'CONFIG_CHANGED')`);
        await queryRunner.query(`CREATE TYPE "public"."system_events_table_name_enum" AS ENUM('users', 'sessions', 'conversations', 'functions', 'messages', 'agents', 'departments', 'organizations', 'system')`);
        await queryRunner.query(`CREATE TABLE "system_events" ("id" SERIAL NOT NULL, "type" "public"."system_events_type_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL, "metadata" jsonb, "table_name" "public"."system_events_table_name_enum" NOT NULL, "table_id" integer NOT NULL, "error_message" character varying, "organization_id" integer, "conversation_id" integer, CONSTRAINT "PK_f28cae54c57b2887d94a4aa745e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."DashboardCards_displaytype_enum" AS ENUM('PIE', 'BAR', 'AREA', 'METRIC')`);
        await queryRunner.query(`CREATE TYPE "public"."DashboardCards_timerange_enum" AS ENUM('1d', '7d', '30d', '90d', '180d', '365d')`);
        await queryRunner.query(`CREATE TABLE "DashboardCards" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "analyticTypes" text NOT NULL, "displayType" "public"."DashboardCards_displaytype_enum" NOT NULL, "timeRange" "public"."DashboardCards_timerange_enum" NOT NULL, "layout" jsonb NOT NULL DEFAULT '{"lg":{"w":12,"h":6,"x":0,"y":0,"i":"0"},"md":{"w":12,"h":6,"x":0,"y":0,"i":"0"},"sm":{"w":12,"h":6,"x":0,"y":0,"i":"0"},"xs":{"w":12,"h":6,"x":0,"y":0,"i":"0"}}', "showLegend" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "userOrganizationId" integer, CONSTRAINT "PK_b6b0910bd8a1d1a9a88bd3b71e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "Sessions" ADD CONSTRAINT "FK_582c3cb0fcddddf078b33e316d3" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ChatSessions" ADD CONSTRAINT "FK_8f358897b9ae3a0743a81cdb91a" FOREIGN KEY ("conversationId") REFERENCES "Conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Messages" ADD CONSTRAINT "FK_a5ff025977810462c680eb48bbf" FOREIGN KEY ("conversationId") REFERENCES "Conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Messages" ADD CONSTRAINT "FK_7f4ef9f385a6fc56ca1acc07d11" FOREIGN KEY ("chatSessionId") REFERENCES "ChatSessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Conversations" ADD CONSTRAINT "FK_d2ef5dea60a365c3d39a2bf606a" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Conversations" ADD CONSTRAINT "FK_4c8a59b0d0386da606816293257" FOREIGN KEY ("chatUserId") REFERENCES "ChatUsers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Conversations" ADD CONSTRAINT "FK_dd894c61ff6b6bce682c3b2a8d4" FOREIGN KEY ("departamentoId") REFERENCES "departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Conversations" ADD CONSTRAINT "FK_c5ad46fe06e70af235da4e6c920" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Integrations" ADD CONSTRAINT "FK_81bf37c8a164eb352b84269963e" FOREIGN KEY ("departamentoId") REFERENCES "departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "autenticador" ADD CONSTRAINT "FK_a8376c776a5c4bc7c037ca84de3" FOREIGN KEY ("organizationId") REFERENCES "Organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "funcion" ADD CONSTRAINT "FK_c61e8b2365cf3f6c3489dd5b990" FOREIGN KEY ("agent_id") REFERENCES "agente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "funcion" ADD CONSTRAINT "FK_c325aa3add633f13247408f66ea" FOREIGN KEY ("autenticador") REFERENCES "autenticador"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_base" ADD CONSTRAINT "FK_2ce7b8636863df81e1fc9cc73fc" FOREIGN KEY ("agent_id") REFERENCES "agente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "agente" ADD CONSTRAINT "FK_7cefc7a63f060d6a45ea01997e1" FOREIGN KEY ("departamento_id") REFERENCES "departamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "departamento" ADD CONSTRAINT "FK_94ea12b63f5f149437c0c9ff9a7" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserOrganizations" ADD CONSTRAINT "FK_98c7340d3f4a85cbf599626c67e" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "UserOrganizations" ADD CONSTRAINT "FK_915869dc09b36555bde1348cd30" FOREIGN KEY ("organizationId") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "system_events" ADD CONSTRAINT "FK_226fafc4fadce76691317e072f1" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "system_events" ADD CONSTRAINT "FK_7c5e1be4579b00f5c7eab73fafa" FOREIGN KEY ("conversation_id") REFERENCES "Conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "DashboardCards" ADD CONSTRAINT "FK_1ca6bde5fd0b0f4feb8115f2b96" FOREIGN KEY ("userOrganizationId") REFERENCES "UserOrganizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        // Crear tabla knowledge_base_documents
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS knowledge_base_documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                content TEXT NOT NULL,
                embedding vector(1024) NOT NULL,
                fileId TEXT NOT NULL,
                agentId INTEGER NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                createdAt TIMESTAMP DEFAULT NOW(),
                updatedAt TIMESTAMP DEFAULT NOW()
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "DashboardCards" DROP CONSTRAINT "FK_1ca6bde5fd0b0f4feb8115f2b96"`);
        await queryRunner.query(`ALTER TABLE "system_events" DROP CONSTRAINT "FK_7c5e1be4579b00f5c7eab73fafa"`);
        await queryRunner.query(`ALTER TABLE "system_events" DROP CONSTRAINT "FK_226fafc4fadce76691317e072f1"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`);
        await queryRunner.query(`ALTER TABLE "UserOrganizations" DROP CONSTRAINT "FK_915869dc09b36555bde1348cd30"`);
        await queryRunner.query(`ALTER TABLE "UserOrganizations" DROP CONSTRAINT "FK_98c7340d3f4a85cbf599626c67e"`);
        await queryRunner.query(`ALTER TABLE "departamento" DROP CONSTRAINT "FK_94ea12b63f5f149437c0c9ff9a7"`);
        await queryRunner.query(`ALTER TABLE "agente" DROP CONSTRAINT "FK_7cefc7a63f060d6a45ea01997e1"`);
        await queryRunner.query(`ALTER TABLE "knowledge_base" DROP CONSTRAINT "FK_2ce7b8636863df81e1fc9cc73fc"`);
        await queryRunner.query(`ALTER TABLE "funcion" DROP CONSTRAINT "FK_c325aa3add633f13247408f66ea"`);
        await queryRunner.query(`ALTER TABLE "funcion" DROP CONSTRAINT "FK_c61e8b2365cf3f6c3489dd5b990"`);
        await queryRunner.query(`ALTER TABLE "autenticador" DROP CONSTRAINT "FK_a8376c776a5c4bc7c037ca84de3"`);
        await queryRunner.query(`ALTER TABLE "Integrations" DROP CONSTRAINT "FK_81bf37c8a164eb352b84269963e"`);
        await queryRunner.query(`ALTER TABLE "Conversations" DROP CONSTRAINT "FK_c5ad46fe06e70af235da4e6c920"`);
        await queryRunner.query(`ALTER TABLE "Conversations" DROP CONSTRAINT "FK_dd894c61ff6b6bce682c3b2a8d4"`);
        await queryRunner.query(`ALTER TABLE "Conversations" DROP CONSTRAINT "FK_4c8a59b0d0386da606816293257"`);
        await queryRunner.query(`ALTER TABLE "Conversations" DROP CONSTRAINT "FK_d2ef5dea60a365c3d39a2bf606a"`);
        await queryRunner.query(`ALTER TABLE "Messages" DROP CONSTRAINT "FK_7f4ef9f385a6fc56ca1acc07d11"`);
        await queryRunner.query(`ALTER TABLE "Messages" DROP CONSTRAINT "FK_a5ff025977810462c680eb48bbf"`);
        await queryRunner.query(`ALTER TABLE "ChatSessions" DROP CONSTRAINT "FK_8f358897b9ae3a0743a81cdb91a"`);
        await queryRunner.query(`ALTER TABLE "Sessions" DROP CONSTRAINT "FK_582c3cb0fcddddf078b33e316d3"`);
        await queryRunner.query(`DROP TABLE "DashboardCards"`);
        await queryRunner.query(`DROP TYPE "public"."DashboardCards_timerange_enum"`);
        await queryRunner.query(`DROP TYPE "public"."DashboardCards_displaytype_enum"`);
        await queryRunner.query(`DROP TABLE "system_events"`);
        await queryRunner.query(`DROP TYPE "public"."system_events_table_name_enum"`);
        await queryRunner.query(`DROP TYPE "public"."system_events_type_enum"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TYPE "public"."notification_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c3ab3f49a87e6ddb607f3c494"`);
        await queryRunner.query(`DROP TABLE "Users"`);
        await queryRunner.query(`DROP TABLE "UserOrganizations"`);
        await queryRunner.query(`DROP TYPE "public"."UserOrganizations_role_enum"`);
        await queryRunner.query(`DROP TABLE "Organizations"`);
        await queryRunner.query(`DROP TYPE "public"."Organizations_type_enum"`);
        await queryRunner.query(`DROP TABLE "departamento"`);
        await queryRunner.query(`DROP TABLE "agente"`);
        await queryRunner.query(`DROP TYPE "public"."agente_type_enum"`);
        await queryRunner.query(`DROP TABLE "knowledge_base"`);
        await queryRunner.query(`DROP TABLE "funcion"`);
        await queryRunner.query(`DROP TYPE "public"."funcion_type_enum"`);
        await queryRunner.query(`DROP TABLE "autenticador"`);
        await queryRunner.query(`DROP TYPE "public"."autenticador_type_enum"`);
        await queryRunner.query(`DROP TABLE "Integrations"`);
        await queryRunner.query(`DROP TYPE "public"."Integrations_type_enum"`);
        await queryRunner.query(`DROP TABLE "Conversations"`);
        await queryRunner.query(`DROP TYPE "public"."Conversations_type_enum"`);
        await queryRunner.query(`DROP TABLE "Messages"`);
        await queryRunner.query(`DROP TYPE "public"."Messages_format_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Messages_type_enum"`);
        await queryRunner.query(`DROP TABLE "ChatSessions"`);
        await queryRunner.query(`DROP TYPE "public"."ChatSessions_status_enum"`);
        await queryRunner.query(`DROP TABLE "ChatUsers"`);
        await queryRunner.query(`DROP TYPE "public"."ChatUsers_type_enum"`);
        await queryRunner.query(`DROP TABLE "Sessions"`);
        await queryRunner.query(`DROP TABLE "knowledge_base_documents"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
    }

}

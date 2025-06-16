--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.10.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.10.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: ChatSessions_status_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."ChatSessions_status_enum" AS ENUM (
    'active',
    'closed'
);


ALTER TYPE public."ChatSessions_status_enum" OWNER TO sofia_chat_user;

--
-- Name: ChatUsers_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."ChatUsers_type_enum" AS ENUM (
    'chat_web',
    'whatsapp',
    'messenger',
    'slack'
);


ALTER TYPE public."ChatUsers_type_enum" OWNER TO sofia_chat_user;

--
-- Name: Conversations_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."Conversations_type_enum" AS ENUM (
    'chat_web',
    'whatsapp',
    'messenger',
    'slack'
);


ALTER TYPE public."Conversations_type_enum" OWNER TO sofia_chat_user;

--
-- Name: DashboardCards_displaytype_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."DashboardCards_displaytype_enum" AS ENUM (
    'PIE',
    'BAR',
    'AREA',
    'METRIC'
);


ALTER TYPE public."DashboardCards_displaytype_enum" OWNER TO sofia_chat_user;

--
-- Name: DashboardCards_timerange_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."DashboardCards_timerange_enum" AS ENUM (
    '1d',
    '7d',
    '30d',
    '90d',
    '180d',
    '365d'
);


ALTER TYPE public."DashboardCards_timerange_enum" OWNER TO sofia_chat_user;

--
-- Name: Integrations_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."Integrations_type_enum" AS ENUM (
    'chat_web',
    'whatsapp',
    'messenger',
    'slack',
    'messenger_manual',
    'whatsapp_manual'
);


ALTER TYPE public."Integrations_type_enum" OWNER TO sofia_chat_user;

--
-- Name: Messages_format_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."Messages_format_enum" AS ENUM (
    'text',
    'image',
    'audio'
);


ALTER TYPE public."Messages_format_enum" OWNER TO sofia_chat_user;

--
-- Name: Messages_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."Messages_type_enum" AS ENUM (
    'user',
    'agent',
    'hitl'
);


ALTER TYPE public."Messages_type_enum" OWNER TO sofia_chat_user;

--
-- Name: Organizations_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."Organizations_type_enum" AS ENUM (
    'production',
    'mvp',
    'free',
    'custom'
);


ALTER TYPE public."Organizations_type_enum" OWNER TO sofia_chat_user;

--
-- Name: Permissions_category_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."Permissions_category_enum" AS ENUM (
    'administration',
    'analytics',
    'integrations',
    'ai_automation',
    'conversations',
    'subscription_billing'
);


ALTER TYPE public."Permissions_category_enum" OWNER TO sofia_chat_user;

--
-- Name: UserOrganizations_role_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public."UserOrganizations_role_enum" AS ENUM (
    'admin',
    'ing_preventa',
    'usr_tecnico',
    'owner',
    'supervisor',
    'hitl',
    'user'
);


ALTER TYPE public."UserOrganizations_role_enum" OWNER TO sofia_chat_user;

--
-- Name: agente_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.agente_type_enum AS ENUM (
    'sofia_asistente',
    'claude'
);


ALTER TYPE public.agente_type_enum OWNER TO sofia_chat_user;

--
-- Name: autenticador_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.autenticador_type_enum AS ENUM (
    'endpoint',
    'api_key'
);


ALTER TYPE public.autenticador_type_enum OWNER TO sofia_chat_user;

--
-- Name: funcion_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.funcion_type_enum AS ENUM (
    'apiEndpoint'
);


ALTER TYPE public.funcion_type_enum OWNER TO sofia_chat_user;

--
-- Name: notification_status_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.notification_status_enum AS ENUM (
    'READ',
    'UNREAD'
);


ALTER TYPE public.notification_status_enum OWNER TO sofia_chat_user;

--
-- Name: notification_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.notification_type_enum AS ENUM (
    'SYSTEM',
    'USER',
    'CUSTOM_PLAN_REQUEST'
);


ALTER TYPE public.notification_type_enum OWNER TO sofia_chat_user;

--
-- Name: subscription_limits_resourcetype_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.subscription_limits_resourcetype_enum AS ENUM (
    'USERS',
    'MESSAGES',
    'STORAGE',
    'API_CALLS'
);


ALTER TYPE public.subscription_limits_resourcetype_enum OWNER TO sofia_chat_user;

--
-- Name: system_events_table_name_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.system_events_table_name_enum AS ENUM (
    'users',
    'sessions',
    'conversations',
    'functions',
    'messages',
    'agents',
    'departments',
    'organizations',
    'system'
);


ALTER TYPE public.system_events_table_name_enum OWNER TO sofia_chat_user;

--
-- Name: system_events_type_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.system_events_type_enum AS ENUM (
    'FUNCTION_CALL',
    'FUNCTION_CREATED',
    'FUNCTION_UPDATED',
    'FUNCTION_DELETED',
    'FUNCTION_EXECUTION_STARTED',
    'FUNCTION_EXECUTION_COMPLETED',
    'FUNCTION_EXECUTION_FAILED',
    'FUNCTION_PARAM_VALIDATION_ERROR',
    'FUNCTION_NOT_FOUND',
    'MESSAGE_SENT',
    'MESSAGE_RECEIVED',
    'SESSION_STARTED',
    'SESSION_ENDED',
    'CONVERSATION_CREATED',
    'CONVERSATION_CLOSED',
    'CONVERSATION_ASSIGNED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_LOGIN',
    'USER_LOGOUT',
    'AGENT_CREATED',
    'AGENT_UPDATED',
    'AGENT_DELETED',
    'AGENT_ASSIGNED',
    'AGENT_INITIALIZED',
    'AGENT_RESPONSE_STARTED',
    'AGENT_RESPONSE_COMPLETED',
    'AGENT_RESPONSE_FAILED',
    'AGENT_MESSAGE_ADDED',
    'AGENT_VECTOR_STORE_CREATED',
    'AGENT_VECTOR_STORE_DELETED',
    'AGENT_VECTOR_STORE_ERROR',
    'AGENT_FILE_UPLOADED',
    'AGENT_FILE_UPLOAD_ERROR',
    'AGENT_FILE_DELETED',
    'AGENT_FILE_DELETE_ERROR',
    'AGENT_TOOLS_UPDATED',
    'AGENT_THREAD_CREATED',
    'SYSTEM_ERROR',
    'CONFIG_CHANGED'
);


ALTER TYPE public.system_events_type_enum OWNER TO sofia_chat_user;

--
-- Name: usage_records_resourcetype_enum; Type: TYPE; Schema: public; Owner: sofia_chat_user
--

CREATE TYPE public.usage_records_resourcetype_enum AS ENUM (
    'USERS',
    'MESSAGES',
    'STORAGE',
    'API_CALLS'
);


ALTER TYPE public.usage_records_resourcetype_enum OWNER TO sofia_chat_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ChatSessions; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."ChatSessions" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    status public."ChatSessions_status_enum" DEFAULT 'active'::public."ChatSessions_status_enum" NOT NULL,
    "lastInteractionAt" timestamp without time zone DEFAULT now() NOT NULL,
    "closedAt" timestamp without time zone,
    metadata json,
    "conversationId" integer NOT NULL
);


ALTER TABLE public."ChatSessions" OWNER TO sofia_chat_user;

--
-- Name: ChatSessions_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."ChatSessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatSessions_id_seq" OWNER TO sofia_chat_user;

--
-- Name: ChatSessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."ChatSessions_id_seq" OWNED BY public."ChatSessions".id;


--
-- Name: ChatUserData; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."ChatUserData" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    chat_user_id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL
);


ALTER TABLE public."ChatUserData" OWNER TO sofia_chat_user;

--
-- Name: ChatUserData_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."ChatUserData_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatUserData_id_seq" OWNER TO sofia_chat_user;

--
-- Name: ChatUserData_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."ChatUserData_id_seq" OWNED BY public."ChatUserData".id;


--
-- Name: ChatUsers; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."ChatUsers" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    secret character varying(128),
    identified character varying,
    type public."ChatUsers_type_enum" DEFAULT 'chat_web'::public."ChatUsers_type_enum" NOT NULL,
    phone character varying,
    web character varying,
    name character varying,
    last_login timestamp without time zone,
    address character varying,
    avatar character varying,
    email character varying,
    browser character varying,
    operating_system character varying,
    ip character varying
);


ALTER TABLE public."ChatUsers" OWNER TO sofia_chat_user;

--
-- Name: ChatUsers_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."ChatUsers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatUsers_id_seq" OWNER TO sofia_chat_user;

--
-- Name: ChatUsers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."ChatUsers_id_seq" OWNED BY public."ChatUsers".id;


--
-- Name: Conversations; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Conversations" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    user_deleted boolean DEFAULT false NOT NULL,
    type public."Conversations_type_enum" DEFAULT 'chat_web'::public."Conversations_type_enum" NOT NULL,
    config json,
    need_human boolean DEFAULT false NOT NULL,
    "userId" integer,
    "chatUserId" integer,
    "departamentoId" integer,
    "integrationId" integer
);


ALTER TABLE public."Conversations" OWNER TO sofia_chat_user;

--
-- Name: Conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Conversations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Conversations_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Conversations_id_seq" OWNED BY public."Conversations".id;


--
-- Name: DashboardCards; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."DashboardCards" (
    id integer NOT NULL,
    title character varying NOT NULL,
    "analyticTypes" text NOT NULL,
    "displayType" public."DashboardCards_displaytype_enum" NOT NULL,
    "timeRange" public."DashboardCards_timerange_enum" NOT NULL,
    layout jsonb DEFAULT '{"lg": {"h": 6, "i": "0", "w": 12, "x": 0, "y": 0}, "md": {"h": 6, "i": "0", "w": 12, "x": 0, "y": 0}, "sm": {"h": 6, "i": "0", "w": 12, "x": 0, "y": 0}, "xs": {"h": 6, "i": "0", "w": 12, "x": 0, "y": 0}}'::jsonb NOT NULL,
    "showLegend" boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    "userOrganizationId" integer
);


ALTER TABLE public."DashboardCards" OWNER TO sofia_chat_user;

--
-- Name: DashboardCards_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."DashboardCards_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."DashboardCards_id_seq" OWNER TO sofia_chat_user;

--
-- Name: DashboardCards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."DashboardCards_id_seq" OWNED BY public."DashboardCards".id;


--
-- Name: Integrations; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Integrations" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    config json DEFAULT '"{}"'::json NOT NULL,
    token character varying,
    phone_number_id character varying,
    waba_id character varying,
    page_id character varying,
    team_id character varying,
    authed_user_id character varying,
    bot_user_id character varying,
    team_name character varying,
    slack_channel_id character varying,
    slack_channel_name character varying,
    refresh_token character varying,
    code_webhook character varying,
    validated_webhook boolean DEFAULT false,
    type public."Integrations_type_enum" NOT NULL,
    "departamentoId" integer
);


ALTER TABLE public."Integrations" OWNER TO sofia_chat_user;

--
-- Name: Integrations_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Integrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Integrations_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Integrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Integrations_id_seq" OWNED BY public."Integrations".id;


--
-- Name: Messages; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Messages" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    text character varying,
    audio character varying,
    "time" integer DEFAULT 0,
    images json,
    type public."Messages_type_enum" DEFAULT 'user'::public."Messages_type_enum" NOT NULL,
    format public."Messages_format_enum" DEFAULT 'text'::public."Messages_format_enum" NOT NULL,
    "conversationId" integer,
    "chatSessionId" integer
);


ALTER TABLE public."Messages" OWNER TO sofia_chat_user;

--
-- Name: Messages_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Messages_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Messages_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Messages_id_seq" OWNED BY public."Messages".id;


--
-- Name: OrganizationLimits; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."OrganizationLimits" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    "conversationLimit" integer DEFAULT 50 NOT NULL,
    "durationDays" integer DEFAULT 15 NOT NULL,
    "isMonthly" boolean DEFAULT false NOT NULL,
    "organizationId" integer NOT NULL
);


ALTER TABLE public."OrganizationLimits" OWNER TO sofia_chat_user;

--
-- Name: OrganizationLimits_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."OrganizationLimits_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."OrganizationLimits_id_seq" OWNER TO sofia_chat_user;

--
-- Name: OrganizationLimits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."OrganizationLimits_id_seq" OWNED BY public."OrganizationLimits".id;


--
-- Name: OrganizationTags; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."OrganizationTags" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying NOT NULL,
    color character varying DEFAULT '#3498db'::character varying,
    "organizationId" integer
);


ALTER TABLE public."OrganizationTags" OWNER TO sofia_chat_user;

--
-- Name: OrganizationTags_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."OrganizationTags_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."OrganizationTags_id_seq" OWNER TO sofia_chat_user;

--
-- Name: OrganizationTags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."OrganizationTags_id_seq" OWNED BY public."OrganizationTags".id;


--
-- Name: Organizations; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Organizations" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    description character varying(255),
    logo character varying(255),
    type public."Organizations_type_enum" DEFAULT 'production'::public."Organizations_type_enum" NOT NULL,
    "deletedAt" timestamp without time zone,
    "conversationCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Organizations" OWNER TO sofia_chat_user;

--
-- Name: Organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Organizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Organizations_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Organizations_id_seq" OWNED BY public."Organizations".id;


--
-- Name: Permissions; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Permissions" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    description text,
    category public."Permissions_category_enum" DEFAULT 'administration'::public."Permissions_category_enum" NOT NULL
);


ALTER TABLE public."Permissions" OWNER TO sofia_chat_user;

--
-- Name: Permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Permissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Permissions_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Permissions_id_seq" OWNED BY public."Permissions".id;


--
-- Name: RolePermissions; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."RolePermissions" (
    id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    role_id integer,
    permission_id integer
);


ALTER TABLE public."RolePermissions" OWNER TO sofia_chat_user;

--
-- Name: RolePermissions_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."RolePermissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RolePermissions_id_seq" OWNER TO sofia_chat_user;

--
-- Name: RolePermissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."RolePermissions_id_seq" OWNED BY public."RolePermissions".id;


--
-- Name: Roles; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Roles" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    description text,
    "organizationId" integer NOT NULL
);


ALTER TABLE public."Roles" OWNER TO sofia_chat_user;

--
-- Name: Roles_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Roles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Roles_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Roles_id_seq" OWNED BY public."Roles".id;


--
-- Name: SessionTags; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."SessionTags" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tag character varying,
    "chatSessionId" integer,
    "createdById" integer,
    color character varying DEFAULT '#3498db'::character varying,
    "organizationTagId" integer
);


ALTER TABLE public."SessionTags" OWNER TO sofia_chat_user;

--
-- Name: SessionTags_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."SessionTags_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SessionTags_id_seq" OWNER TO sofia_chat_user;

--
-- Name: SessionTags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."SessionTags_id_seq" OWNED BY public."SessionTags".id;


--
-- Name: Sessions; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Sessions" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    "expiredAt" timestamp without time zone NOT NULL,
    ip character varying NOT NULL,
    browser character varying NOT NULL,
    "operatingSystem" character varying NOT NULL,
    "userId" integer
);


ALTER TABLE public."Sessions" OWNER TO sofia_chat_user;

--
-- Name: Sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Sessions_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Sessions_id_seq" OWNED BY public."Sessions".id;


--
-- Name: SuggestionRatings; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."SuggestionRatings" (
    id integer NOT NULL,
    rating integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    "suggestionId" integer NOT NULL,
    "userId" integer NOT NULL
);


ALTER TABLE public."SuggestionRatings" OWNER TO sofia_chat_user;

--
-- Name: SuggestionRatings_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."SuggestionRatings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."SuggestionRatings_id_seq" OWNER TO sofia_chat_user;

--
-- Name: SuggestionRatings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."SuggestionRatings_id_seq" OWNED BY public."SuggestionRatings".id;


--
-- Name: Suggestions; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Suggestions" (
    id integer NOT NULL,
    text text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    "messageId" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Suggestions" OWNER TO sofia_chat_user;

--
-- Name: Suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Suggestions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Suggestions_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Suggestions_id_seq" OWNED BY public."Suggestions".id;


--
-- Name: UserOrganizations; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."UserOrganizations" (
    id integer NOT NULL,
    role public."UserOrganizations_role_enum" DEFAULT 'user'::public."UserOrganizations_role_enum" NOT NULL,
    "deletedAt" timestamp without time zone,
    "userId" integer,
    "organizationId" integer
);


ALTER TABLE public."UserOrganizations" OWNER TO sofia_chat_user;

--
-- Name: UserOrganizations_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."UserOrganizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."UserOrganizations_id_seq" OWNER TO sofia_chat_user;

--
-- Name: UserOrganizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."UserOrganizations_id_seq" OWNED BY public."UserOrganizations".id;


--
-- Name: Users; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public."Users" (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    password character varying(128) NOT NULL,
    is_super_admin boolean DEFAULT false NOT NULL,
    last_login timestamp without time zone,
    first_name character varying(255),
    last_name character varying(255),
    reset_password_code character varying(6),
    reset_password_expires timestamp with time zone,
    "deletedAt" timestamp without time zone,
    google_id character varying(255),
    picture character varying(1024)
);


ALTER TABLE public."Users" OWNER TO sofia_chat_user;

--
-- Name: Users_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public."Users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Users_id_seq" OWNER TO sofia_chat_user;

--
-- Name: Users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public."Users_id_seq" OWNED BY public."Users".id;


--
-- Name: agente; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.agente (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    type public.agente_type_enum NOT NULL,
    config json,
    "canEscalateToHuman" boolean DEFAULT true NOT NULL,
    departamento_id integer
);


ALTER TABLE public.agente OWNER TO sofia_chat_user;

--
-- Name: agente_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.agente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agente_id_seq OWNER TO sofia_chat_user;

--
-- Name: agente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.agente_id_seq OWNED BY public.agente.id;


--
-- Name: autenticador; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.autenticador (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    type public.autenticador_type_enum NOT NULL,
    config json NOT NULL,
    name character varying(255) NOT NULL,
    life_time integer DEFAULT 0 NOT NULL,
    field_name character varying(255) DEFAULT 'Authorization'::character varying NOT NULL,
    value character varying,
    "organizationId" integer NOT NULL
);


ALTER TABLE public.autenticador OWNER TO sofia_chat_user;

--
-- Name: autenticador_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.autenticador_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.autenticador_id_seq OWNER TO sofia_chat_user;

--
-- Name: autenticador_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.autenticador_id_seq OWNED BY public.autenticador.id;


--
-- Name: departamento; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.departamento (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    description text,
    organization_id integer
);


ALTER TABLE public.departamento OWNER TO sofia_chat_user;

--
-- Name: departamento_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.departamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departamento_id_seq OWNER TO sofia_chat_user;

--
-- Name: departamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.departamento_id_seq OWNED BY public.departamento.id;


--
-- Name: funcion; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.funcion (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    "normalizedName" character varying(255) NOT NULL,
    description text,
    type public.funcion_type_enum NOT NULL,
    config text,
    agent_id integer,
    autenticador integer
);


ALTER TABLE public.funcion OWNER TO sofia_chat_user;

--
-- Name: funcion_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.funcion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.funcion_id_seq OWNER TO sofia_chat_user;

--
-- Name: funcion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.funcion_id_seq OWNED BY public.funcion.id;


--
-- Name: function_template; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.function_template (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "categoryId" integer NOT NULL,
    "applicationId" integer NOT NULL,
    url character varying NOT NULL,
    method character varying DEFAULT 'GET'::character varying NOT NULL,
    "bodyType" character varying DEFAULT 'json'::character varying NOT NULL,
    params text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.function_template OWNER TO sofia_chat_user;

--
-- Name: function_template_application; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.function_template_application (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "imageUrl" character varying,
    domain character varying,
    "isDynamicDomain" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.function_template_application OWNER TO sofia_chat_user;

--
-- Name: function_template_application_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.function_template_application_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.function_template_application_id_seq OWNER TO sofia_chat_user;

--
-- Name: function_template_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.function_template_application_id_seq OWNED BY public.function_template_application.id;


--
-- Name: function_template_category; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.function_template_category (
    id integer NOT NULL,
    name character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    description character varying
);


ALTER TABLE public.function_template_category OWNER TO sofia_chat_user;

--
-- Name: function_template_category_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.function_template_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.function_template_category_id_seq OWNER TO sofia_chat_user;

--
-- Name: function_template_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.function_template_category_id_seq OWNED BY public.function_template_category.id;


--
-- Name: function_template_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.function_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.function_template_id_seq OWNER TO sofia_chat_user;

--
-- Name: function_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.function_template_id_seq OWNED BY public.function_template.id;


--
-- Name: function_template_tag; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.function_template_tag (
    id integer NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.function_template_tag OWNER TO sofia_chat_user;

--
-- Name: function_template_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.function_template_tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.function_template_tag_id_seq OWNER TO sofia_chat_user;

--
-- Name: function_template_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.function_template_tag_id_seq OWNED BY public.function_template_tag.id;


--
-- Name: function_template_tags_function_template_tag; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.function_template_tags_function_template_tag (
    "functionTemplateId" integer NOT NULL,
    "functionTemplateTagId" integer NOT NULL
);


ALTER TABLE public.function_template_tags_function_template_tag OWNER TO sofia_chat_user;

--
-- Name: hitl_types; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.hitl_types (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying(255) NOT NULL,
    description character varying(500),
    organization_id integer NOT NULL,
    created_by integer NOT NULL
);


ALTER TABLE public.hitl_types OWNER TO sofia_chat_user;

--
-- Name: hitl_types_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.hitl_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hitl_types_id_seq OWNER TO sofia_chat_user;

--
-- Name: hitl_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.hitl_types_id_seq OWNED BY public.hitl_types.id;


--
-- Name: knowledge_base; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.knowledge_base (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    "fileId" character varying(50) NOT NULL,
    "expirationTime" integer,
    filename character varying(255) NOT NULL,
    agent_id integer
);


ALTER TABLE public.knowledge_base OWNER TO sofia_chat_user;

--
-- Name: knowledge_base_documents; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.knowledge_base_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    embedding public.vector(1024) NOT NULL,
    fileid text NOT NULL,
    agentid integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    createdat timestamp without time zone DEFAULT now(),
    updatedat timestamp without time zone DEFAULT now()
);


ALTER TABLE public.knowledge_base_documents OWNER TO sofia_chat_user;

--
-- Name: knowledge_base_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.knowledge_base_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_base_id_seq OWNER TO sofia_chat_user;

--
-- Name: knowledge_base_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.knowledge_base_id_seq OWNED BY public.knowledge_base.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO sofia_chat_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO sofia_chat_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.notification (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    title character varying NOT NULL,
    avatar character varying,
    "organizationId" integer NOT NULL,
    type public.notification_type_enum DEFAULT 'SYSTEM'::public.notification_type_enum NOT NULL,
    status public.notification_status_enum DEFAULT 'UNREAD'::public.notification_status_enum NOT NULL,
    link character varying,
    metadata json,
    "userId" integer
);


ALTER TABLE public.notification OWNER TO sofia_chat_user;

--
-- Name: notification_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_id_seq OWNER TO sofia_chat_user;

--
-- Name: notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.notification_id_seq OWNED BY public.notification.id;


--
-- Name: organization_subscriptions; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.organization_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "organizationId" integer NOT NULL,
    "planId" uuid NOT NULL,
    "startDate" timestamp without time zone NOT NULL,
    "endDate" timestamp without time zone,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.organization_subscriptions OWNER TO sofia_chat_user;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.plans OWNER TO sofia_chat_user;

--
-- Name: subscription_limits; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.subscription_limits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "planId" uuid NOT NULL,
    "resourceType" public.subscription_limits_resourcetype_enum NOT NULL,
    "maxValue" integer
);


ALTER TABLE public.subscription_limits OWNER TO sofia_chat_user;

--
-- Name: system_events; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.system_events (
    id integer NOT NULL,
    type public.system_events_type_enum NOT NULL,
    created_at timestamp without time zone NOT NULL,
    metadata jsonb,
    table_name public.system_events_table_name_enum NOT NULL,
    table_id integer NOT NULL,
    error_message character varying,
    organization_id integer,
    conversation_id integer
);


ALTER TABLE public.system_events OWNER TO sofia_chat_user;

--
-- Name: system_events_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.system_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_events_id_seq OWNER TO sofia_chat_user;

--
-- Name: system_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.system_events_id_seq OWNED BY public.system_events.id;


--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.usage_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "organizationId" integer NOT NULL,
    "resourceType" public.usage_records_resourcetype_enum NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    period character varying(7) NOT NULL
);


ALTER TABLE public.usage_records OWNER TO sofia_chat_user;

--
-- Name: user_hitl_types; Type: TABLE; Schema: public; Owner: sofia_chat_user
--

CREATE TABLE public.user_hitl_types (
    id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    user_id integer NOT NULL,
    hitl_type_id integer NOT NULL,
    organization_id integer NOT NULL
);


ALTER TABLE public.user_hitl_types OWNER TO sofia_chat_user;

--
-- Name: user_hitl_types_id_seq; Type: SEQUENCE; Schema: public; Owner: sofia_chat_user
--

CREATE SEQUENCE public.user_hitl_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_hitl_types_id_seq OWNER TO sofia_chat_user;

--
-- Name: user_hitl_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: sofia_chat_user
--

ALTER SEQUENCE public.user_hitl_types_id_seq OWNED BY public.user_hitl_types.id;


--
-- Name: ChatSessions id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatSessions" ALTER COLUMN id SET DEFAULT nextval('public."ChatSessions_id_seq"'::regclass);


--
-- Name: ChatUserData id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatUserData" ALTER COLUMN id SET DEFAULT nextval('public."ChatUserData_id_seq"'::regclass);


--
-- Name: ChatUsers id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatUsers" ALTER COLUMN id SET DEFAULT nextval('public."ChatUsers_id_seq"'::regclass);


--
-- Name: Conversations id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Conversations" ALTER COLUMN id SET DEFAULT nextval('public."Conversations_id_seq"'::regclass);


--
-- Name: DashboardCards id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."DashboardCards" ALTER COLUMN id SET DEFAULT nextval('public."DashboardCards_id_seq"'::regclass);


--
-- Name: Integrations id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Integrations" ALTER COLUMN id SET DEFAULT nextval('public."Integrations_id_seq"'::regclass);


--
-- Name: Messages id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Messages" ALTER COLUMN id SET DEFAULT nextval('public."Messages_id_seq"'::regclass);


--
-- Name: OrganizationLimits id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."OrganizationLimits" ALTER COLUMN id SET DEFAULT nextval('public."OrganizationLimits_id_seq"'::regclass);


--
-- Name: OrganizationTags id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."OrganizationTags" ALTER COLUMN id SET DEFAULT nextval('public."OrganizationTags_id_seq"'::regclass);


--
-- Name: Organizations id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Organizations" ALTER COLUMN id SET DEFAULT nextval('public."Organizations_id_seq"'::regclass);


--
-- Name: Permissions id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Permissions" ALTER COLUMN id SET DEFAULT nextval('public."Permissions_id_seq"'::regclass);


--
-- Name: RolePermissions id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."RolePermissions" ALTER COLUMN id SET DEFAULT nextval('public."RolePermissions_id_seq"'::regclass);


--
-- Name: Roles id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Roles" ALTER COLUMN id SET DEFAULT nextval('public."Roles_id_seq"'::regclass);


--
-- Name: SessionTags id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SessionTags" ALTER COLUMN id SET DEFAULT nextval('public."SessionTags_id_seq"'::regclass);


--
-- Name: Sessions id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Sessions" ALTER COLUMN id SET DEFAULT nextval('public."Sessions_id_seq"'::regclass);


--
-- Name: SuggestionRatings id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SuggestionRatings" ALTER COLUMN id SET DEFAULT nextval('public."SuggestionRatings_id_seq"'::regclass);


--
-- Name: Suggestions id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Suggestions" ALTER COLUMN id SET DEFAULT nextval('public."Suggestions_id_seq"'::regclass);


--
-- Name: UserOrganizations id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."UserOrganizations" ALTER COLUMN id SET DEFAULT nextval('public."UserOrganizations_id_seq"'::regclass);


--
-- Name: Users id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Users" ALTER COLUMN id SET DEFAULT nextval('public."Users_id_seq"'::regclass);


--
-- Name: agente id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.agente ALTER COLUMN id SET DEFAULT nextval('public.agente_id_seq'::regclass);


--
-- Name: autenticador id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.autenticador ALTER COLUMN id SET DEFAULT nextval('public.autenticador_id_seq'::regclass);


--
-- Name: departamento id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.departamento ALTER COLUMN id SET DEFAULT nextval('public.departamento_id_seq'::regclass);


--
-- Name: funcion id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.funcion ALTER COLUMN id SET DEFAULT nextval('public.funcion_id_seq'::regclass);


--
-- Name: function_template id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template ALTER COLUMN id SET DEFAULT nextval('public.function_template_id_seq'::regclass);


--
-- Name: function_template_application id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_application ALTER COLUMN id SET DEFAULT nextval('public.function_template_application_id_seq'::regclass);


--
-- Name: function_template_category id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_category ALTER COLUMN id SET DEFAULT nextval('public.function_template_category_id_seq'::regclass);


--
-- Name: function_template_tag id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_tag ALTER COLUMN id SET DEFAULT nextval('public.function_template_tag_id_seq'::regclass);


--
-- Name: hitl_types id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.hitl_types ALTER COLUMN id SET DEFAULT nextval('public.hitl_types_id_seq'::regclass);


--
-- Name: knowledge_base id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.knowledge_base ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notification id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.notification ALTER COLUMN id SET DEFAULT nextval('public.notification_id_seq'::regclass);


--
-- Name: system_events id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.system_events ALTER COLUMN id SET DEFAULT nextval('public.system_events_id_seq'::regclass);


--
-- Name: user_hitl_types id; Type: DEFAULT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.user_hitl_types ALTER COLUMN id SET DEFAULT nextval('public.user_hitl_types_id_seq'::regclass);


--
-- Data for Name: ChatSessions; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."ChatSessions" (id, created_at, updated_at, deleted_at, status, "lastInteractionAt", "closedAt", metadata, "conversationId") FROM stdin;
2	2025-05-29 18:01:52.069568+00	2025-05-29 18:01:59.998168+00	\N	active	2025-05-29 18:01:59.995	\N	\N	2
3	2025-05-29 18:12:11.471306+00	2025-05-29 18:12:15.670033+00	\N	active	2025-05-29 18:12:15.667	\N	\N	4
4	2025-05-29 18:12:49.601144+00	2025-05-29 18:12:53.53737+00	\N	active	2025-05-29 18:12:53.535	\N	\N	5
5	2025-05-29 21:55:39.136967+00	2025-05-29 21:55:44.179984+00	\N	active	2025-05-29 21:55:44.175	\N	\N	7
6	2025-05-29 22:38:25.371657+00	2025-05-29 22:44:57.107671+00	\N	active	2025-05-29 22:44:57.104	\N	\N	6
7	2025-06-10 21:33:44.996995+00	2025-06-10 21:34:01.863235+00	\N	active	2025-06-10 21:34:01.86	\N	\N	9
1	2025-05-28 19:24:59.425298+00	2025-06-12 19:59:39.171759+00	\N	closed	2025-05-28 20:23:11.808	2025-06-12 19:59:39.168	\N	1
8	2025-06-12 19:59:39.181581+00	2025-06-12 19:59:39.181581+00	\N	active	2025-06-12 19:59:39.181581	\N	\N	1
9	2025-06-16 17:40:38.9166+00	2025-06-16 17:43:56.711785+00	\N	active	2025-06-16 17:43:56.707	\N	\N	10
\.


--
-- Data for Name: ChatUserData; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."ChatUserData" (id, created_at, updated_at, deleted_at, chat_user_id, key, value) FROM stdin;
\.


--
-- Data for Name: ChatUsers; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."ChatUsers" (id, created_at, updated_at, deleted_at, secret, identified, type, phone, web, name, last_login, address, avatar, email, browser, operating_system, ip) FROM stdin;
4	2025-05-29 18:11:56.079815+00	2025-05-29 18:29:26.123013+00	\N	y7gaoy6kf7m	\N	chat_web	\N	https://grumpybells.s3-tastewp.com	\N	2025-05-29 18:29:26.111	\N	\N	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36	\N
5	2025-05-29 21:44:51.404092+00	2025-05-29 22:46:30.772585+00	\N	in6wg2iosjs	\N	chat_web	\N	https://monbolitos.s4-tastewp.com	\N	2025-05-29 22:46:30.756	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	\N
6	2025-05-29 21:49:06.109552+00	2025-05-29 22:47:43.119403+00	\N	vuw7nd2h7n	\N	chat_web	\N	https://grumpybells.s3-tastewp.com	\N	2025-05-29 22:47:43.109	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	\N
2	2025-05-29 17:57:22.508553+00	2025-05-29 19:45:06.56299+00	\N	7noietxx0kp	\N	chat_web	\N	https://grumpybells.s3-tastewp.com	\N	2025-05-29 19:45:06.555	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	\N
8	2025-06-10 21:04:07.198849+00	2025-06-10 21:04:07.198849+00	\N	87riqb05sa4	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-10 21:04:07.197	\N	\N	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:139.0) Gecko/20100101 Firefox/139.0	\N
9	2025-06-11 09:01:14.943623+00	2025-06-11 09:01:14.943623+00	\N	v9wrzkpwkjf	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 09:01:14.939	\N	\N	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1	\N
10	2025-06-11 09:08:21.98762+00	2025-06-11 09:08:21.98762+00	\N	ik36jw9urx	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 09:08:21.986	\N	\N	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1	\N
11	2025-06-11 09:08:22.742458+00	2025-06-11 09:08:22.742458+00	\N	govhjrt9cbu	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 09:08:22.741	\N	\N	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1	\N
1	2025-05-28 19:18:43.49228+00	2025-05-29 02:59:46.069555+00	\N	rnso98kxptg	\N	chat_web	\N	http://localhost:3000	\N	2025-05-29 02:59:46.065	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	\N
3	2025-05-29 17:57:25.361189+00	2025-05-29 17:57:25.361189+00	\N	y4kyt9680t	\N	chat_web	\N	https://grumpybells.s3-tastewp.com	\N	2025-05-29 17:57:25.36	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36	\N
12	2025-06-11 19:48:05.2975+00	2025-06-11 19:48:05.2975+00	\N	laqtwpqoxf	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 19:48:05.293	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36	\N
13	2025-06-11 20:48:52.26887+00	2025-06-11 20:48:52.26887+00	\N	ysxzogekj9	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 20:48:52.267	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36	\N
14	2025-06-11 21:46:40.356178+00	2025-06-11 21:46:40.356178+00	\N	4e2w649cde4	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 21:46:40.355	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36	\N
15	2025-06-11 21:47:39.066989+00	2025-06-11 21:47:39.066989+00	\N	hboq6c3l23v	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-11 21:47:39.066	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36	\N
16	2025-06-12 00:34:26.815095+00	2025-06-12 00:34:26.815095+00	\N	3st8j0bd6wj	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-12 00:34:26.812	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36	\N
17	2025-06-12 22:20:07.194608+00	2025-06-12 22:20:07.194608+00	\N	bnhj5rf0jpb	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-12 22:20:07.192	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36	\N
18	2025-06-14 20:58:11.560147+00	2025-06-14 20:58:11.560147+00	\N	upxi9uis7cj	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-14 20:58:11.559	\N	\N	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36	\N
7	2025-06-10 20:51:10.776481+00	2025-06-16 17:47:16.436277+00	\N	coigaenhxmj	\N	chat_web	\N	https://developer.neuraforge.net	\N	2025-06-16 17:47:16.414	\N	\N	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N
\.


--
-- Data for Name: Conversations; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Conversations" (id, created_at, updated_at, deleted_at, user_deleted, type, config, need_human, "userId", "chatUserId", "departamentoId", "integrationId") FROM stdin;
10	2025-06-16 17:40:35.446165+00	2025-06-16 17:42:56.95376+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_YYnaUdsOyOPF6uXo5JDXyfZn"}}	t	4	7	1	\N
2	2025-05-29 17:59:21.367211+00	2025-05-29 18:01:59.981883+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_s4J0cTlZiCuecx3v7Xs0Oidk"}}	f	\N	2	1	\N
3	2025-05-29 18:04:41.391391+00	2025-05-29 18:04:41.391391+00	\N	f	chat_web	\N	f	\N	2	1	\N
4	2025-05-29 18:12:07.681349+00	2025-05-29 18:12:15.651876+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_nJZxrrU41Dqy4NkhqMzvEVGj"}}	f	\N	4	1	\N
5	2025-05-29 18:12:47.238597+00	2025-05-29 18:12:53.522231+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_IHHT39ytPIl3ASKFdQSN6pxS"}}	f	\N	4	1	\N
7	2025-05-29 21:55:36.706179+00	2025-05-29 21:55:44.15694+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_Zl5rXq7kutUKsqqoG5IpZS18"}}	f	\N	6	1	\N
8	2025-05-29 21:55:53.08012+00	2025-05-29 21:55:53.08012+00	\N	f	chat_web	\N	f	\N	5	1	\N
9	2025-06-10 21:33:41.769509+00	2025-06-10 21:33:50.080359+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_PWLzdSCk60eNM13zq4Z2QAwT","threatId":"thread_xlagUb3sjc3JRJJVQq5br6Zv"}}	f	\N	7	5	\N
1	2025-05-28 19:24:50.688457+00	2025-06-16 15:51:18.836655+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_WEk1FrjA9CtiV2LMDgy4lS8x"}}	f	1	1	1	\N
6	2025-05-29 21:44:53.089656+00	2025-06-16 15:51:21.749193+00	\N	f	chat_web	{"type":"sofia_asistente","agentIdentifier":{"type":"chat","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF","threatId":"thread_JNIL0nA0ZHqXwysQbKjNec3F"}}	f	1	5	1	\N
\.


--
-- Data for Name: DashboardCards; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."DashboardCards" (id, title, "analyticTypes", "displayType", "timeRange", layout, "showLegend", created_at, updated_at, deleted_at, "userOrganizationId") FROM stdin;
5	Avg. Sesiones por usuario	SESSIONS_PER_USER	METRIC	30d	{"lg": {"h": 5, "i": "5", "w": 9, "x": 9, "y": 6}, "md": {"h": 5, "i": "5", "w": 9, "x": 0, "y": 11}, "sm": {"h": 4, "i": "5", "w": 6, "x": 0, "y": 16}, "xs": {"h": 4, "i": "5", "w": 12, "x": 0, "y": 28}}	f	2025-05-28 19:17:02.307448	2025-05-28 19:17:02.307448	\N	1
6	Mensajes por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 5, "i": "6", "w": 9, "x": 0, "y": 11}, "md": {"h": 5, "i": "6", "w": 9, "x": 9, "y": 11}, "sm": {"h": 4, "i": "6", "w": 9, "x": 0, "y": 20}, "xs": {"h": 4, "i": "6", "w": 9, "x": 3, "y": 32}}	f	2025-05-28 19:17:02.307448	2025-05-28 19:17:02.307448	\N	1
1	Usuarios	RECURRING_USERS,TOTAL_USERS,NEW_USERS	AREA	180d	{"lg": {"h": 6, "i": "1", "w": 18, "x": 0, "y": 0}, "md": {"h": 6, "i": "1", "w": 15, "x": 0, "y": 0}, "sm": {"h": 6, "i": "1", "w": 18, "x": 0, "y": 0}, "xs": {"h": 6, "i": "1", "w": 12, "x": 0, "y": 0}}	t	2025-05-28 19:17:02.307448	2025-06-12 22:56:20.304992	\N	1
3	Avg. Mensajes IA por sesión	IA_MESSAGES_PER_SESSION	AREA	30d	{"lg": {"h": 5, "i": "3", "w": 9, "x": 0, "y": 6}, "md": {"h": 5, "i": "3", "w": 9, "x": 0, "y": 6}, "sm": {"h": 4, "i": "3", "w": 6, "x": 0, "y": 12}, "xs": {"h": 4, "i": "3", "w": 12, "x": 0, "y": 12}}	f	2025-05-28 19:17:02.307448	2025-06-12 22:56:30.800584	\N	1
4	Avg. Mensajes HITL por sesión	HITL_MESSAGES_PER_SESSION	BAR	30d	{"lg": {"h": 5, "i": "4", "w": 9, "x": 9, "y": 11}, "md": {"h": 5, "i": "4", "w": 9, "x": 9, "y": 6}, "sm": {"h": 4, "i": "4", "w": 9, "x": 9, "y": 20}, "xs": {"h": 4, "i": "4", "w": 12, "x": 0, "y": 24}}	f	2025-05-28 19:17:02.307448	2025-06-12 22:56:42.90485	\N	1
8	Distribución por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 10, "i": "8", "w": 17, "x": 18, "y": 6}, "md": {"h": 10, "i": "8", "w": 12, "x": 18, "y": 6}, "sm": {"h": 8, "i": "8", "w": 12, "x": 6, "y": 12}, "xs": {"h": 8, "i": "8", "w": 12, "x": 0, "y": 16}}	t	2025-05-28 19:17:02.307448	2025-06-16 17:23:55.079972	\N	1
9	Usuarios	RECURRING_USERS,TOTAL_USERS,NEW_USERS	METRIC	90d	{"lg": {"h": 6, "i": "9", "w": 18, "x": 0, "y": 0}, "md": {"h": 6, "i": "9", "w": 14, "x": 0, "y": 0}, "sm": {"h": 6, "i": "9", "w": 18, "x": 0, "y": 0}, "xs": {"h": 6, "i": "9", "w": 12, "x": 0, "y": 0}}	t	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
10	Mensajes	IA_MESSAGES,HITL_MESSAGES	AREA	7d	{"lg": {"h": 6, "i": "10", "w": 18, "x": 18, "y": 0}, "md": {"h": 6, "i": "10", "w": 15, "x": 15, "y": 0}, "sm": {"h": 6, "i": "10", "w": 18, "x": 0, "y": 6}, "xs": {"h": 6, "i": "10", "w": 12, "x": 0, "y": 6}}	t	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
11	Avg. Mensajes IA por sesión	IA_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "11", "w": 9, "x": 0, "y": 6}, "md": {"h": 5, "i": "11", "w": 9, "x": 0, "y": 6}, "sm": {"h": 4, "i": "11", "w": 6, "x": 0, "y": 12}, "xs": {"h": 4, "i": "11", "w": 12, "x": 0, "y": 12}}	f	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
12	Avg. Mensajes HITL por sesión	HITL_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "12", "w": 9, "x": 9, "y": 11}, "md": {"h": 5, "i": "12", "w": 9, "x": 9, "y": 6}, "sm": {"h": 4, "i": "12", "w": 9, "x": 9, "y": 20}, "xs": {"h": 4, "i": "12", "w": 12, "x": 0, "y": 24}}	f	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
13	Avg. Sesiones por usuario	SESSIONS_PER_USER	METRIC	30d	{"lg": {"h": 5, "i": "13", "w": 9, "x": 9, "y": 6}, "md": {"h": 5, "i": "13", "w": 9, "x": 0, "y": 11}, "sm": {"h": 4, "i": "13", "w": 6, "x": 0, "y": 16}, "xs": {"h": 4, "i": "13", "w": 12, "x": 0, "y": 28}}	f	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
14	Mensajes por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 5, "i": "14", "w": 9, "x": 0, "y": 11}, "md": {"h": 5, "i": "14", "w": 9, "x": 9, "y": 11}, "sm": {"h": 4, "i": "14", "w": 9, "x": 0, "y": 20}, "xs": {"h": 4, "i": "14", "w": 9, "x": 3, "y": 32}}	f	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
15	Funciones	FUNCTIONS_PER_SESSION	BAR	7d	{"lg": {"h": 6, "i": "15", "w": 36, "x": 0, "y": 16}, "md": {"h": 6, "i": "15", "w": 30, "x": 0, "y": 16}, "sm": {"h": 6, "i": "15", "w": 18, "x": 0, "y": 24}, "xs": {"h": 6, "i": "15", "w": 12, "x": 0, "y": 36}}	t	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
16	Distribución por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 10, "i": "16", "w": 12, "x": 24, "y": 6}, "md": {"h": 10, "i": "16", "w": 12, "x": 18, "y": 6}, "sm": {"h": 8, "i": "16", "w": 12, "x": 6, "y": 12}, "xs": {"h": 8, "i": "16", "w": 12, "x": 0, "y": 16}}	t	2025-05-30 16:48:06.61801	2025-05-30 16:48:06.646506	\N	2
17	Usuarios	RECURRING_USERS,TOTAL_USERS,NEW_USERS	METRIC	90d	{"lg": {"h": 6, "i": "17", "w": 18, "x": 0, "y": 0}, "md": {"h": 6, "i": "17", "w": 14, "x": 0, "y": 0}, "sm": {"h": 6, "i": "17", "w": 18, "x": 0, "y": 0}, "xs": {"h": 6, "i": "17", "w": 12, "x": 0, "y": 0}}	t	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
18	Mensajes	IA_MESSAGES,HITL_MESSAGES	AREA	7d	{"lg": {"h": 6, "i": "18", "w": 18, "x": 18, "y": 0}, "md": {"h": 6, "i": "18", "w": 15, "x": 15, "y": 0}, "sm": {"h": 6, "i": "18", "w": 18, "x": 0, "y": 6}, "xs": {"h": 6, "i": "18", "w": 12, "x": 0, "y": 6}}	t	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
19	Avg. Mensajes IA por sesión	IA_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "19", "w": 9, "x": 0, "y": 6}, "md": {"h": 5, "i": "19", "w": 9, "x": 0, "y": 6}, "sm": {"h": 4, "i": "19", "w": 6, "x": 0, "y": 12}, "xs": {"h": 4, "i": "19", "w": 12, "x": 0, "y": 12}}	f	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
20	Avg. Mensajes HITL por sesión	HITL_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "20", "w": 9, "x": 9, "y": 11}, "md": {"h": 5, "i": "20", "w": 9, "x": 9, "y": 6}, "sm": {"h": 4, "i": "20", "w": 9, "x": 9, "y": 20}, "xs": {"h": 4, "i": "20", "w": 12, "x": 0, "y": 24}}	f	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
21	Avg. Sesiones por usuario	SESSIONS_PER_USER	METRIC	30d	{"lg": {"h": 5, "i": "21", "w": 9, "x": 9, "y": 6}, "md": {"h": 5, "i": "21", "w": 9, "x": 0, "y": 11}, "sm": {"h": 4, "i": "21", "w": 6, "x": 0, "y": 16}, "xs": {"h": 4, "i": "21", "w": 12, "x": 0, "y": 28}}	f	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
22	Mensajes por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 5, "i": "22", "w": 9, "x": 0, "y": 11}, "md": {"h": 5, "i": "22", "w": 9, "x": 9, "y": 11}, "sm": {"h": 4, "i": "22", "w": 9, "x": 0, "y": 20}, "xs": {"h": 4, "i": "22", "w": 9, "x": 3, "y": 32}}	f	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
23	Funciones	FUNCTIONS_PER_SESSION	BAR	7d	{"lg": {"h": 6, "i": "23", "w": 36, "x": 0, "y": 16}, "md": {"h": 6, "i": "23", "w": 30, "x": 0, "y": 16}, "sm": {"h": 6, "i": "23", "w": 18, "x": 0, "y": 24}, "xs": {"h": 6, "i": "23", "w": 12, "x": 0, "y": 36}}	t	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
24	Distribución por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 10, "i": "24", "w": 12, "x": 24, "y": 6}, "md": {"h": 10, "i": "24", "w": 12, "x": 18, "y": 6}, "sm": {"h": 8, "i": "24", "w": 12, "x": 6, "y": 12}, "xs": {"h": 8, "i": "24", "w": 12, "x": 0, "y": 16}}	t	2025-06-06 10:37:19.068528	2025-06-06 10:37:19.085525	\N	3
25	Usuarios	RECURRING_USERS,TOTAL_USERS,NEW_USERS	METRIC	90d	{"lg": {"h": 6, "i": "25", "w": 18, "x": 0, "y": 0}, "md": {"h": 6, "i": "25", "w": 14, "x": 0, "y": 0}, "sm": {"h": 6, "i": "25", "w": 18, "x": 0, "y": 0}, "xs": {"h": 6, "i": "25", "w": 12, "x": 0, "y": 0}}	t	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
26	Mensajes	IA_MESSAGES,HITL_MESSAGES	AREA	7d	{"lg": {"h": 6, "i": "26", "w": 18, "x": 18, "y": 0}, "md": {"h": 6, "i": "26", "w": 15, "x": 15, "y": 0}, "sm": {"h": 6, "i": "26", "w": 18, "x": 0, "y": 6}, "xs": {"h": 6, "i": "26", "w": 12, "x": 0, "y": 6}}	t	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
27	Avg. Mensajes IA por sesión	IA_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "27", "w": 9, "x": 0, "y": 6}, "md": {"h": 5, "i": "27", "w": 9, "x": 0, "y": 6}, "sm": {"h": 4, "i": "27", "w": 6, "x": 0, "y": 12}, "xs": {"h": 4, "i": "27", "w": 12, "x": 0, "y": 12}}	f	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
28	Avg. Mensajes HITL por sesión	HITL_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "28", "w": 9, "x": 9, "y": 11}, "md": {"h": 5, "i": "28", "w": 9, "x": 9, "y": 6}, "sm": {"h": 4, "i": "28", "w": 9, "x": 9, "y": 20}, "xs": {"h": 4, "i": "28", "w": 12, "x": 0, "y": 24}}	f	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
29	Avg. Sesiones por usuario	SESSIONS_PER_USER	METRIC	30d	{"lg": {"h": 5, "i": "29", "w": 9, "x": 9, "y": 6}, "md": {"h": 5, "i": "29", "w": 9, "x": 0, "y": 11}, "sm": {"h": 4, "i": "29", "w": 6, "x": 0, "y": 16}, "xs": {"h": 4, "i": "29", "w": 12, "x": 0, "y": 28}}	f	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
30	Mensajes por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 5, "i": "30", "w": 9, "x": 0, "y": 11}, "md": {"h": 5, "i": "30", "w": 9, "x": 9, "y": 11}, "sm": {"h": 4, "i": "30", "w": 9, "x": 0, "y": 20}, "xs": {"h": 4, "i": "30", "w": 9, "x": 3, "y": 32}}	f	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
31	Funciones	FUNCTIONS_PER_SESSION	BAR	7d	{"lg": {"h": 6, "i": "31", "w": 36, "x": 0, "y": 16}, "md": {"h": 6, "i": "31", "w": 30, "x": 0, "y": 16}, "sm": {"h": 6, "i": "31", "w": 18, "x": 0, "y": 24}, "xs": {"h": 6, "i": "31", "w": 12, "x": 0, "y": 36}}	t	2025-06-06 15:45:57.771749	2025-06-06 15:45:57.790032	\N	4
34	Mensajes	IA_MESSAGES,HITL_MESSAGES	AREA	7d	{"lg": {"h": 6, "i": "34", "w": 18, "x": 18, "y": 0}, "md": {"h": 6, "i": "34", "w": 15, "x": 15, "y": 0}, "sm": {"h": 6, "i": "34", "w": 18, "x": 0, "y": 6}, "xs": {"h": 6, "i": "34", "w": 12, "x": 0, "y": 6}}	t	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
32	Distribución por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 10, "i": "32", "w": 18, "x": 18, "y": 6}, "md": {"h": 10, "i": "32", "w": 12, "x": 18, "y": 6}, "sm": {"h": 8, "i": "32", "w": 12, "x": 6, "y": 12}, "xs": {"h": 8, "i": "32", "w": 12, "x": 0, "y": 16}}	t	2025-06-06 15:45:57.771749	2025-06-06 16:20:34.293865	\N	4
35	Avg. Mensajes IA por sesión	IA_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "35", "w": 9, "x": 0, "y": 6}, "md": {"h": 5, "i": "35", "w": 9, "x": 0, "y": 6}, "sm": {"h": 4, "i": "35", "w": 6, "x": 0, "y": 12}, "xs": {"h": 4, "i": "35", "w": 12, "x": 0, "y": 12}}	f	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
36	Avg. Mensajes HITL por sesión	HITL_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "36", "w": 9, "x": 9, "y": 11}, "md": {"h": 5, "i": "36", "w": 9, "x": 9, "y": 6}, "sm": {"h": 4, "i": "36", "w": 9, "x": 9, "y": 20}, "xs": {"h": 4, "i": "36", "w": 12, "x": 0, "y": 24}}	f	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
37	Avg. Sesiones por usuario	SESSIONS_PER_USER	METRIC	30d	{"lg": {"h": 5, "i": "37", "w": 9, "x": 9, "y": 6}, "md": {"h": 5, "i": "37", "w": 9, "x": 0, "y": 11}, "sm": {"h": 4, "i": "37", "w": 6, "x": 0, "y": 16}, "xs": {"h": 4, "i": "37", "w": 12, "x": 0, "y": 28}}	f	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
38	Mensajes por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 5, "i": "38", "w": 9, "x": 0, "y": 11}, "md": {"h": 5, "i": "38", "w": 9, "x": 9, "y": 11}, "sm": {"h": 4, "i": "38", "w": 9, "x": 0, "y": 20}, "xs": {"h": 4, "i": "38", "w": 9, "x": 3, "y": 32}}	f	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
39	Funciones	FUNCTIONS_PER_SESSION	BAR	7d	{"lg": {"h": 6, "i": "39", "w": 36, "x": 0, "y": 16}, "md": {"h": 6, "i": "39", "w": 30, "x": 0, "y": 16}, "sm": {"h": 6, "i": "39", "w": 18, "x": 0, "y": 24}, "xs": {"h": 6, "i": "39", "w": 12, "x": 0, "y": 36}}	t	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
40	Distribución por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 10, "i": "40", "w": 12, "x": 24, "y": 6}, "md": {"h": 10, "i": "40", "w": 12, "x": 18, "y": 6}, "sm": {"h": 8, "i": "40", "w": 12, "x": 6, "y": 12}, "xs": {"h": 8, "i": "40", "w": 12, "x": 0, "y": 16}}	t	2025-06-06 22:27:04.258299	2025-06-06 22:27:04.300251	\N	6
41	Usuarios	RECURRING_USERS,TOTAL_USERS,NEW_USERS	METRIC	90d	{"lg": {"h": 6, "i": "41", "w": 18, "x": 0, "y": 0}, "md": {"h": 6, "i": "41", "w": 14, "x": 0, "y": 0}, "sm": {"h": 6, "i": "41", "w": 18, "x": 0, "y": 0}, "xs": {"h": 6, "i": "41", "w": 12, "x": 0, "y": 0}}	t	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
42	Mensajes	IA_MESSAGES,HITL_MESSAGES	AREA	7d	{"lg": {"h": 6, "i": "42", "w": 18, "x": 18, "y": 0}, "md": {"h": 6, "i": "42", "w": 15, "x": 15, "y": 0}, "sm": {"h": 6, "i": "42", "w": 18, "x": 0, "y": 6}, "xs": {"h": 6, "i": "42", "w": 12, "x": 0, "y": 6}}	t	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
33	Usuarios	RECURRING_USERS,TOTAL_USERS,NEW_USERS	BAR	180d	{"lg": {"h": 6, "i": "33", "w": 18, "x": 0, "y": 0}, "md": {"h": 6, "i": "33", "w": 15, "x": 0, "y": 0}, "sm": {"h": 6, "i": "33", "w": 18, "x": 0, "y": 0}, "xs": {"h": 6, "i": "33", "w": 12, "x": 0, "y": 0}}	t	2025-06-06 22:27:04.258299	2025-06-11 16:32:45.825397	\N	6
2	Mensajes	IA_MESSAGES,HITL_MESSAGES	AREA	30d	{"lg": {"h": 6, "i": "2", "w": 17, "x": 18, "y": 0}, "md": {"h": 6, "i": "2", "w": 15, "x": 15, "y": 0}, "sm": {"h": 6, "i": "2", "w": 18, "x": 0, "y": 6}, "xs": {"h": 6, "i": "2", "w": 12, "x": 0, "y": 6}}	t	2025-05-28 19:17:02.307448	2025-06-13 20:41:04.359355	\N	1
43	Avg. Mensajes IA por sesión	IA_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "43", "w": 9, "x": 0, "y": 6}, "md": {"h": 5, "i": "43", "w": 9, "x": 0, "y": 6}, "sm": {"h": 4, "i": "43", "w": 6, "x": 0, "y": 12}, "xs": {"h": 4, "i": "43", "w": 12, "x": 0, "y": 12}}	f	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
44	Avg. Mensajes HITL por sesión	HITL_MESSAGES_PER_SESSION	METRIC	30d	{"lg": {"h": 5, "i": "44", "w": 9, "x": 9, "y": 11}, "md": {"h": 5, "i": "44", "w": 9, "x": 9, "y": 6}, "sm": {"h": 4, "i": "44", "w": 9, "x": 9, "y": 20}, "xs": {"h": 4, "i": "44", "w": 12, "x": 0, "y": 24}}	f	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
45	Avg. Sesiones por usuario	SESSIONS_PER_USER	METRIC	30d	{"lg": {"h": 5, "i": "45", "w": 9, "x": 9, "y": 6}, "md": {"h": 5, "i": "45", "w": 9, "x": 0, "y": 11}, "sm": {"h": 4, "i": "45", "w": 6, "x": 0, "y": 16}, "xs": {"h": 4, "i": "45", "w": 12, "x": 0, "y": 28}}	f	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
46	Mensajes por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 5, "i": "46", "w": 9, "x": 0, "y": 11}, "md": {"h": 5, "i": "46", "w": 9, "x": 9, "y": 11}, "sm": {"h": 4, "i": "46", "w": 9, "x": 0, "y": 20}, "xs": {"h": 4, "i": "46", "w": 9, "x": 3, "y": 32}}	f	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
47	Funciones	FUNCTIONS_PER_SESSION	BAR	7d	{"lg": {"h": 6, "i": "47", "w": 36, "x": 0, "y": 16}, "md": {"h": 6, "i": "47", "w": 30, "x": 0, "y": 16}, "sm": {"h": 6, "i": "47", "w": 18, "x": 0, "y": 24}, "xs": {"h": 6, "i": "47", "w": 12, "x": 0, "y": 36}}	t	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
48	Distribución por canal	MESSAGES_BY_WHATSAPP,MESSAGES_BY_FACEBOOK,MESSAGES_BY_WEB	PIE	30d	{"lg": {"h": 10, "i": "48", "w": 12, "x": 24, "y": 6}, "md": {"h": 10, "i": "48", "w": 12, "x": 18, "y": 6}, "sm": {"h": 8, "i": "48", "w": 12, "x": 6, "y": 12}, "xs": {"h": 8, "i": "48", "w": 12, "x": 0, "y": 16}}	t	2025-06-16 17:36:47.216765	2025-06-16 17:36:47.241174	\N	12
\.


--
-- Data for Name: Integrations; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Integrations" (id, created_at, updated_at, deleted_at, config, token, phone_number_id, waba_id, page_id, team_id, authed_user_id, bot_user_id, team_name, slack_channel_id, slack_channel_name, refresh_token, code_webhook, validated_webhook, type, "departamentoId") FROM stdin;
2	2025-05-28 19:43:17.894412+00	2025-05-28 20:09:53.019061+00	\N	"{\\"url\\":\\"wss://dev-sofia-chat.sofiacall.com/api/socket/web-chat\\",\\"url_assets\\":\\"https://dev-sofia-chat.sofiacall.com\\",\\"name\\":\\"SOF.IA\\",\\"title\\":\\"SOF.IA LLM\\",\\"cors\\":[],\\"sub_title\\":\\"Descubre todo lo que SOFIA puede hacer por ti.\\",\\"description\\":\\"¡Hola y bienvenido a SOFIA! Estoy aquí para ayudarte a encontrar respuestas y soluciones de manera rápida y sencilla. ¿En qué puedo asistirte hoy?\\",\\"logo\\":\\"/mvp/avatar.svg\\",\\"horizontal_logo\\":\\"horizontal-logo.png\\",\\"edge_radius\\":\\"10\\",\\"message_radius\\":\\"20\\",\\"bg_color\\":\\"#15ECDA\\",\\"bg_chat\\":\\"#3c8dd8\\",\\"bg_user\\":\\"#ffffff\\",\\"bg_assistant\\":\\"#b1f6f0\\",\\"text_color\\":\\"#000000\\",\\"text_title\\":\\"#000000\\",\\"text_date\\":\\"#969696\\",\\"button_color\\":\\"#15ECDA\\",\\"button_text\\":\\"#ffffff\\"}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	chat_web	2
9	2025-06-06 17:50:46.463355+00	2025-06-06 17:50:46.463355+00	\N	"{\\"pin\\":\\"585876\\"}"	EAARU3fQUtBQBOxDgAhKodHkmfceRMgzzCy895V74gbgHlOGzIE2mkjOGUuHwaLMX422zjHF3H0enthfwRz33AOegan88Pxze387ciaIDkJNKlPZAQAzJYEadFyUMNEs6qfRUPxnbjs2J7cit4n91iOwlmbOZC0pJkTxkUZCvlfaer2lgUfslZCWjYILE0CkYG0ZCAlNTMc0ltpNUzPxa2mytgAH5TwcvqjaoxVElsmyB90M1NdpYTIUlLWkQJ	702825712905027	1764415427751954	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	whatsapp	4
11	2025-06-09 17:30:00.371956+00	2025-06-09 17:30:00.371956+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	3OD2aIqL44IqV0iuxG9aqoShTRsWVZ	f	whatsapp_manual	1
14	2025-06-10 15:13:23.476109+00	2025-06-10 15:13:23.476109+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	nOaAJqJSQemBGXmVfLCgftoW95hIrs	f	whatsapp_manual	1
7	2025-06-06 15:49:30.124832+00	2025-06-10 20:29:10.216487+00	\N	"{\\"url\\":\\"wss://dev-sofia-chat.sofiacall.com/api/socket/web-chat\\",\\"url_assets\\":\\"https://dev-sofia-chat.sofiacall.com\\",\\"name\\":\\"SOF.IA\\",\\"title\\":\\"SOF.IA LLM\\",\\"cors\\":[\\"https://developer.neuraforge.net/\\",\\"developer.neuraforge.net\\"],\\"sub_title\\":\\"Descubre todo lo que SOFIA puede hacer por ti.\\",\\"description\\":\\"¡Hola y bienvenido a SOFIA! Estoy aquí para ayudarte a encontrar respuestas y soluciones de manera rápida y sencilla. ¿En qué puedo asistirte hoy?\\",\\"logo\\":\\"/mvp/avatar.svg\\",\\"horizontal_logo\\":\\"horizontal-logo.png\\",\\"edge_radius\\":\\"10\\",\\"message_radius\\":\\"20\\",\\"bg_color\\":\\"#15ECDA\\",\\"bg_chat\\":\\"#F5F5F5\\",\\"bg_user\\":\\"#ffffff\\",\\"bg_assistant\\":\\"#b1f6f0\\",\\"text_color\\":\\"#000000\\",\\"text_title\\":\\"#000000\\",\\"text_date\\":\\"#969696\\",\\"button_color\\":\\"#15ECDA\\",\\"button_text\\":\\"#ffffff\\"}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	chat_web	5
21	2025-06-10 21:05:41.113889+00	2025-06-10 21:05:41.113889+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	xFjiqJdlTpQoSDk9v2PMB2qe7GvILl	f	messenger_manual	1
23	2025-06-10 21:38:23.627384+00	2025-06-10 21:38:23.627384+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Wdf1Db1AUnttPkSLfQJf64hYTdNlVx	f	whatsapp_manual	5
26	2025-06-10 22:58:27.380771+00	2025-06-10 22:58:27.380771+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	GqFgWxTs9Gx7ZvON2iJOiy1qVnSBaM	f	messenger_manual	6
27	2025-06-10 22:58:38.958243+00	2025-06-10 22:58:38.958243+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	MkAqQdMbfXGqqdHGoKN8fiZlMe1U1u	f	messenger_manual	1
1	2025-05-28 19:17:14.46303+00	2025-06-16 17:40:49.956118+00	\N	"{\\"url\\":\\"wss://dev-sofia-chat.sofiacall.com/api/socket/web-chat\\",\\"url_assets\\":\\"https://dev-sofia-chat.sofiacall.com\\",\\"name\\":\\"SOF.IA\\",\\"title\\":\\"SOF.IA LLM\\",\\"cors\\":[\\"http://localhost:4000\\",\\"https://grumpybells.s3-tastewp.com/\\",\\"https://monbolitos.s4-tastewp.com/\\",\\"https://developer.neuraforge.net/\\"],\\"sub_title\\":\\"Descubre todo lo que SOFIA puede hacer por ti. edited\\",\\"description\\":\\"¡Hola y bienvenido a SOFIA! Estoy aquí para ayudarte a encontrar respuestas y soluciones de manera rápida y sencilla. ¿En qué puedo asistirte hoy?\\",\\"logo\\":\\"/mvp/avatar.svg\\",\\"horizontal_logo\\":\\"horizontal-logo.png\\",\\"edge_radius\\":\\"10\\",\\"message_radius\\":\\"20\\",\\"bg_color\\":\\"#4A90E2\\",\\"bg_chat\\":\\"#D9E8F5\\",\\"bg_user\\":\\"#FFFFFF\\",\\"bg_assistant\\":\\"#72C2F1\\",\\"text_color\\":\\"#333333\\",\\"text_title\\":\\"#FFFFFF\\",\\"text_date\\":\\"#A5B8C2\\",\\"button_color\\":\\"#4A90E2\\",\\"button_text\\":\\"#FFFFFF\\"}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	chat_web	1
29	2025-06-11 16:29:41.394619+00	2025-06-11 16:29:41.394619+00	\N	"{}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	rRiZ8vJT9eNUq3G9iN00fkRKL1nFbc	f	whatsapp_manual	6
32	2025-06-16 18:45:07.158313+00	2025-06-16 18:45:07.158313+00	\N	"{\\"url\\":\\"wss://dev-sofia-chat.sofiacall.com/api/socket/web-chat\\",\\"url_assets\\":\\"https://dev-sofia-chat.sofiacall.com\\",\\"name\\":\\"SOF.IA\\",\\"title\\":\\"SOF.IA LLM\\",\\"cors\\":[],\\"sub_title\\":\\"Descubre todo lo que SOFIA puede hacer por ti.\\",\\"description\\":\\"¡Hola y bienvenido a SOFIA! Estoy aquí para ayudarte a encontrar respuestas y soluciones de manera rápida y sencilla. ¿En qué puedo asistirte hoy?\\",\\"logo\\":\\"/mvp/avatar.svg\\",\\"horizontal_logo\\":\\"horizontal-logo.png\\",\\"edge_radius\\":\\"10\\",\\"message_radius\\":\\"20\\",\\"bg_color\\":\\"#15ECDA\\",\\"bg_chat\\":\\"#F5F5F5\\",\\"bg_user\\":\\"#ffffff\\",\\"bg_assistant\\":\\"#b1f6f0\\",\\"text_color\\":\\"#000000\\",\\"text_title\\":\\"#000000\\",\\"text_date\\":\\"#969696\\",\\"button_color\\":\\"#15ECDA\\",\\"button_text\\":\\"#ffffff\\"}"	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	chat_web	6
\.


--
-- Data for Name: Messages; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Messages" (id, created_at, updated_at, deleted_at, text, audio, "time", images, type, format, "conversationId", "chatSessionId") FROM stdin;
1	2025-05-28 19:24:59.4118+00	2025-05-28 19:24:59.43628+00	\N	hola	\N	0	[]	user	text	1	1
2	2025-05-28 19:25:08.273689+00	2025-05-28 19:25:08.301455+00	\N	¡Hola! ¿Cómo puedo ayudarte hoy? Si tienes alguna queja o comentario, estaré encantado de registrarlo.	\N	0	\N	agent	text	1	1
3	2025-05-28 20:11:45.609381+00	2025-05-28 20:11:45.635771+00	\N	Holajaja	\N	0	["https://dev-sofia-chat.sofiacall.com/images/1748463105604-yb2hfe.png"]	user	text	1	1
4	2025-05-28 20:13:36.183822+00	2025-05-28 20:13:36.21204+00	\N	Do something.	a4c4d15f-c40e-4432-9200-8d4106dbc7b6.wav	192	\N	user	audio	1	1
5	2025-05-28 20:22:15.711304+00	2025-05-28 20:22:15.755651+00	\N		\N	0	["https://dev-sofia-chat.sofiacall.com/images/1748463735704-l7ztxo.png"]	user	text	1	1
6	2025-05-28 20:22:25.517143+00	2025-05-28 20:22:25.579259+00	\N		\N	0	["https://dev-sofia-chat.sofiacall.com/images/1748463745500-l5oysa.png"]	user	text	1	1
7	2025-05-28 20:23:11.793266+00	2025-05-28 20:23:11.825499+00	\N	HOLA	\N	0	[]	user	text	1	1
8	2025-05-29 18:01:52.057979+00	2025-05-29 18:01:52.08171+00	\N	hola probando	\N	0	[]	user	text	2	2
9	2025-05-29 18:01:59.988179+00	2025-05-29 18:02:00.009811+00	\N	¡Hola! ¿Cómo puedo ayudarte hoy? Si tienes alguna queja o consulta, no dudes en decírmelo.	\N	0	\N	agent	text	2	2
10	2025-05-29 18:12:11.458738+00	2025-05-29 18:12:11.482585+00	\N	hola	\N	0	[]	user	text	4	3
11	2025-05-29 18:12:15.65967+00	2025-05-29 18:12:15.687278+00	\N	¡Hola! ¿En qué puedo ayudarte hoy? Si tienes alguna queja o inquietud, estaré encantado de registrarla.	\N	0	\N	agent	text	4	3
12	2025-05-29 18:12:49.591345+00	2025-05-29 18:12:49.609162+00	\N	hola	\N	0	[]	user	text	5	4
13	2025-05-29 18:12:53.527945+00	2025-05-29 18:12:53.544111+00	\N	¡Hola! ¿Cómo puedo ayudarte hoy?	\N	0	\N	agent	text	5	4
14	2025-05-29 21:55:39.121595+00	2025-05-29 21:55:39.15068+00	\N	hola	\N	0	[]	user	text	7	5
15	2025-05-29 21:55:44.165211+00	2025-05-29 21:55:44.191106+00	\N	¡Hola! ¿En qué puedo ayudarte hoy? Si tienes alguna queja o inquietud, no dudes en decírmelo.	\N	0	\N	agent	text	7	5
16	2025-05-29 22:38:25.351922+00	2025-05-29 22:38:25.382484+00	\N	hola	\N	0	[]	user	text	6	6
17	2025-05-29 22:38:30.420135+00	2025-05-29 22:38:30.441346+00	\N	¡Hola! ¿Cómo puedo ayudarte hoy? Si tienes alguna queja o mensaje que quieras registrar, estoy aquí para ayudarte.	\N	0	\N	agent	text	6	6
18	2025-05-29 22:44:40.809508+00	2025-05-29 22:44:40.831724+00	\N	Si.	2205e21e-e630-450f-a003-4bb01403ad1f.wav	222	\N	user	audio	6	6
19	2025-05-29 22:44:44.507794+00	2025-05-29 22:44:44.528982+00	\N	Perfecto. Por favor, cuéntame cuál es tu queja o el mensaje que deseas registrar.	\N	0	\N	agent	text	6	6
20	2025-05-29 22:44:53.687959+00	2025-05-29 22:44:53.713282+00	\N	hola 	\N	0	[]	user	text	6	6
21	2025-05-29 22:44:57.096516+00	2025-05-29 22:44:57.115365+00	\N	Hola nuevamente. Parece que todavía no has compartido tu queja. ¿Hay algo específico de lo que te gustaría hablar o registrar? Estoy aquí para ayudarte.	\N	0	\N	agent	text	6	6
22	2025-06-10 21:33:44.966007+00	2025-06-10 21:33:45.033816+00	\N	hola	\N	0	[]	user	text	9	7
23	2025-06-10 21:33:50.088298+00	2025-06-10 21:33:50.111284+00	\N	¡Hola! ¿Cómo puedo ayudarte hoy?	\N	0	\N	agent	text	9	7
24	2025-06-10 21:33:57.24743+00	2025-06-10 21:33:57.274754+00	\N	hola necesito de tu ayuda	\N	0	[]	user	text	9	7
25	2025-06-10 21:34:01.850737+00	2025-06-10 21:34:01.872761+00	\N	¡Por supuesto! Estoy aquí para ayudarte. ¿Cuál es tu pregunta o en qué necesitas asistencia?	\N	0	\N	agent	text	9	7
27	2025-06-16 17:40:38.904658+00	2025-06-16 17:40:38.931747+00	\N	hola buen dia	\N	0	[]	user	text	10	9
28	2025-06-16 17:40:43.509779+00	2025-06-16 17:40:43.542294+00	\N	¡Hola! Buen día. ¿En qué puedo ayudarte hoy?	\N	0	\N	agent	text	10	9
31	2025-06-16 17:42:00.148851+00	2025-06-16 17:42:00.179577+00	\N	me asignas al encargad humano de soporte tecnico porfavor	\N	0	[]	user	text	10	9
32	2025-06-16 17:42:08.8767+00	2025-06-16 17:42:08.912232+00	\N	He enviado tu solicitud a un agente humano de soporte técnico y se le ha notificado. Ellos se pondrán en contacto contigo pronto para ayudarte con tu problema. Si necesitas algo más, no dudes en decírmelo.	\N	0	\N	agent	text	10	9
29	2025-06-16 17:41:33.647002+00	2025-06-16 17:41:33.672425+00	\N	necesito ayuda con un tema de soporte tecnico	\N	0	[]	user	text	10	9
30	2025-06-16 17:41:38.547789+00	2025-06-16 17:41:38.564114+00	\N	Claro, puedo ayudarte con eso. ¿Cuál es el problema específico que estás enfrentando?	\N	0	\N	agent	text	10	9
33	2025-06-16 17:43:56.694082+00	2025-06-16 17:43:56.720081+00	\N	que tal en que puedo ayudarle	\N	0	[]	hitl	text	10	9
26	2025-06-12 19:59:39.141099+00	2025-06-12 19:59:39.191015+00	\N	hola	\N	0	[]	hitl	text	1	8
\.


--
-- Data for Name: OrganizationLimits; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."OrganizationLimits" (id, created_at, updated_at, deleted_at, "conversationLimit", "durationDays", "isMonthly", "organizationId") FROM stdin;
1	2025-05-30 16:48:05.647583+00	2025-05-30 16:48:05.647583+00	\N	50	15	f	2
2	2025-06-06 15:45:56.804576+00	2025-06-06 15:45:56.804576+00	\N	50	15	f	4
3	2025-06-06 22:28:03.139537+00	2025-06-06 22:28:03.139537+00	\N	50	15	f	6
\.


--
-- Data for Name: OrganizationTags; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."OrganizationTags" (id, created_at, updated_at, deleted_at, name, color, "organizationId") FROM stdin;
\.


--
-- Data for Name: Organizations; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Organizations" (id, created_at, updated_at, deleted_at, name, description, logo, type, "deletedAt", "conversationCount") FROM stdin;
2	2025-05-30 16:48:05.606237+00	2025-05-30 16:48:05.62963+00	\N	primera dev	primera dewv	https://dev-sofia-chat.sofiacall.com/organizations/2/logo.png	free	\N	0
3	2025-06-06 09:53:25.845468+00	2025-06-06 09:53:25.857233+00	\N	facebook	tests de facebook	https://dev-sofia-chat.sofiacall.com/organizations/3/logo.png	mvp	\N	0
5	2025-06-06 22:26:34.2032+00	2025-06-06 22:26:34.219455+00	\N	second	sdfdsfs	https://dev-sofia-chat.sofiacall.com/organizations/5/logo.png	mvp	\N	0
6	2025-06-06 22:26:58.219785+00	2025-06-06 22:27:21.123654+00	\N	cxvxc	xcvxcvcxvcx	https://dev-sofia-chat.sofiacall.com/organizations/6/logo.png	free	\N	0
4	2025-06-06 15:45:56.776819+00	2025-06-10 21:33:41.760946+00	\N	Jai	Organizacion test	https://dev-sofia-chat.sofiacall.com/organizations/4/logo.png	mvp	\N	1001
7	2025-06-11 22:57:24.092995+00	2025-06-12 18:58:46.678176+00	\N	Meta prospectos	Organización encargada en la atención de prospectos en Meta y sus productos.	https://dev-sofia-chat.sofiacall.com/organizations/7/logo.png	production	\N	0
1	2025-05-28 19:15:33.697501+00	2025-06-16 17:40:35.438951+00	\N	testing dev	sdfdsfs	https://dev-sofia-chat.sofiacall.com/organizations/1/logo.png	mvp	\N	1
\.


--
-- Data for Name: Permissions; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Permissions" (id, created_at, updated_at, deleted_at, name, description, category) FROM stdin;
2	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_roles	Permite gestionar roles	administration
3	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	view_analytics	Permite ver analíticas	analytics
4	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_integrations	Permite gestionar integraciones	integrations
5	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	access_api	Permite acceder a la API	integrations
6	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_ai_settings	Permite gestionar configuraciones de IA	ai_automation
7	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	view_conversations	Permite ver conversaciones	conversations
8	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	respond_to_chats	Permite responder a chats	conversations
9	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_ai_models	Permite gestionar modelos de IA	ai_automation
10	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	view_chat_threads	Permite ver hilos de chat	conversations
11	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_notifications	Permite gestionar notificaciones	administration
12	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_subscription	Permite gestionar suscripciones	subscription_billing
13	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_payment_methods	Permite gestionar métodos de pago	subscription_billing
14	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	manage_team_members	Permite gestionar miembros del equipo	subscription_billing
15	2025-05-28 18:30:47.726329+00	2025-05-28 18:30:47.726329+00	\N	view_subscription	Permite ver información de suscripción	subscription_billing
\.


--
-- Data for Name: RolePermissions; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."RolePermissions" (id, "createdAt", role_id, permission_id) FROM stdin;
\.


--
-- Data for Name: Roles; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Roles" (id, created_at, updated_at, deleted_at, name, description, "organizationId") FROM stdin;
\.


--
-- Data for Name: SessionTags; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."SessionTags" (id, created_at, updated_at, deleted_at, tag, "chatSessionId", "createdById", color, "organizationTagId") FROM stdin;
\.


--
-- Data for Name: Sessions; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Sessions" (id, created_at, updated_at, deleted_at, "expiredAt", ip, browser, "operatingSystem", "userId") FROM stdin;
2	2025-05-28 19:16:57.402352+00	2025-05-28 19:16:57.402352+00	\N	2025-06-04 19:16:56.792	192.168.16.1	Chrome	GNU/Linux	1
45	2025-06-16 16:11:54.770409+00	2025-06-16 16:11:54.770409+00	\N	2025-06-23 16:11:54.76	192.168.0.1	Chrome	GNU/Linux	1
46	2025-06-16 17:13:23.770627+00	2025-06-16 17:13:23.770627+00	\N	2025-06-23 17:13:22.595	192.168.0.1	Chrome	Mac	1
5	2025-05-29 21:44:02.657955+00	2025-05-29 21:44:02.657955+00	\N	2025-06-05 21:44:01.494	192.168.128.1	Chrome	Windows	1
48	2025-06-16 17:24:07.215196+00	2025-06-16 17:24:07.215196+00	\N	2025-06-23 17:24:06.548	192.168.0.1	Chrome	Mac	1
8	2025-05-30 16:47:53.655207+00	2025-05-30 16:47:53.655207+00	\N	2025-06-06 16:47:53.642	192.168.208.1	Chrome	GNU/Linux	2
51	2025-06-16 17:42:29.888849+00	2025-06-16 17:42:29.888849+00	\N	2025-06-23 17:42:29.877	192.168.0.1	Chrome	Mac	4
27	2025-06-06 22:26:11.538903+00	2025-06-06 22:26:11.538903+00	\N	2025-06-13 22:26:10.528	192.168.96.1	Chrome	GNU/Linux	1
29	2025-06-09 19:56:42.175472+00	2025-06-09 19:56:42.175472+00	\N	2025-06-16 19:56:42.164	192.168.96.1	Chrome	Windows	1
30	2025-06-09 21:54:15.924297+00	2025-06-09 21:54:15.924297+00	\N	2025-06-16 21:54:15.905	192.168.96.1	Chrome	Mac	1
31	2025-06-10 20:50:48.016791+00	2025-06-10 20:50:48.016791+00	\N	2025-06-17 20:50:46.966	172.22.0.1	Chrome	GNU/Linux	1
33	2025-06-11 07:56:28.601919+00	2025-06-11 07:56:28.601919+00	\N	2025-06-18 07:56:27.513	172.25.0.1	Chrome	GNU/Linux	1
34	2025-06-11 08:12:49.132321+00	2025-06-11 08:12:49.132321+00	\N	2025-06-18 08:12:48.151	172.25.0.1	Chrome	GNU/Linux	1
35	2025-06-11 08:27:21.379859+00	2025-06-11 08:27:21.379859+00	\N	2025-06-18 08:27:20.102	172.25.0.1	Chrome	GNU/Linux	1
36	2025-06-12 19:02:07.918519+00	2025-06-12 19:02:07.918519+00	\N	2025-06-19 19:02:06.231	172.25.0.1	Chrome	Mac	1
37	2025-06-13 17:57:55.565916+00	2025-06-13 17:57:55.565916+00	\N	2025-06-20 17:57:54.459	172.25.0.1	Chrome	GNU/Linux	1
39	2025-06-13 20:26:45.722968+00	2025-06-13 20:26:45.722968+00	\N	2025-06-20 20:26:45.012	192.168.0.1	Chrome	Windows	1
42	2025-06-16 01:27:31.821486+00	2025-06-16 01:27:31.821486+00	\N	2025-06-23 01:27:31.804	192.168.0.1	Chrome	GNU/Linux	2
\.


--
-- Data for Name: SuggestionRatings; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."SuggestionRatings" (id, rating, created_at, updated_at, "suggestionId", "userId") FROM stdin;
\.


--
-- Data for Name: Suggestions; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Suggestions" (id, text, created_at, "messageId", "isActive") FROM stdin;
\.


--
-- Data for Name: UserOrganizations; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."UserOrganizations" (id, role, "deletedAt", "userId", "organizationId") FROM stdin;
1	owner	\N	1	1
2	owner	\N	2	2
3	owner	\N	3	3
4	owner	\N	4	4
5	owner	\N	2	5
6	owner	\N	1	6
7	owner	\N	5	7
9	user	\N	2	1
8	user	\N	5	6
11	user	2025-06-16 17:29:55.406911	4	1
12	hitl	\N	4	1
10	user	\N	2	6
\.


--
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public."Users" (id, created_at, updated_at, deleted_at, email, email_verified, password, is_super_admin, last_login, first_name, last_name, reset_password_code, reset_password_expires, "deletedAt", google_id, picture) FROM stdin;
2	2025-05-30 16:47:53.617758+00	2025-06-16 01:27:31.798695+00	\N	frank.orozco.11.87@gmail.com	t	$2b$10$JSBunZcWkDvmUBYwMBHKFOtHP1vZZX3dMjU.LMpRhwTMsyUWNBHhC	f	2025-06-16 01:27:31.795	frank	orozco	\N	\N	\N	104364671386985490655	https://lh3.googleusercontent.com/a/ACg8ocJP02_tSBysq9YbgqGMXJbhTERoDyJcLUfiEzsXnMQ5ixLq8Fo=s96-c
3	2025-06-06 09:53:25.421652+00	2025-06-16 15:42:38.323938+00	\N	digay54383@jio1.com	f	$2b$10$4i2a4aHgj9COVM3iOl0fce9FDphs1BjQ/NxGYLoyX6kSq4cNSUtLy	f	2025-06-16 15:42:38.32	\N	\N	\N	\N	\N	\N	\N
5	2025-06-11 22:57:23.761479+00	2025-06-11 22:57:23.761479+00	\N	manuelccts@gmail.com	f	$2b$10$YU1o4WuDcAZm6wwb.XYuoORi5yINv/t/GpkX/LqwXM4sWltY6f7TC	f	\N	\N	\N	\N	\N	\N	\N	\N
1	2024-12-13 16:16:05.128+00	2025-06-16 17:37:25.211257+00	\N	frank@pixeldigita.com	t	$2b$10$eXOw4ZydC7IzjbW0/c9HX.jGRz1xq/8V/UPo7IjiMEoxFwwkJd9vK	t	2025-06-16 17:37:25.207	Frank	Orozco		\N	\N	117695592118493900454	https://lh3.googleusercontent.com/a/ACg8ocLIZmhKd3OTk1Xt5oIThVTXuVzKDvPh6554j0dxfYmco_rMag=s96-c
4	2025-06-06 15:45:35.378378+00	2025-06-16 17:42:29.871757+00	\N	dev@jai-call.com	f	$2b$10$CtExlr74c831JI4ISpu6Nu6/Pb/pPdrzM6JE9Q.I85T8sX36gOxrS	f	2025-06-16 17:42:29.868	Gio	Hernandez	\N	\N	\N	\N	\N
\.


--
-- Data for Name: agente; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.agente (id, created_at, updated_at, deleted_at, name, type, config, "canEscalateToHuman", departamento_id) FROM stdin;
2	2025-05-28 19:43:13.831889+00	2025-05-28 19:43:14.578725+00	\N	default agent	sofia_asistente	{"instruccion":"Eres un asistente para registrar las quejas de los usuarios","agentId":"asst_3BljlFhtMnIb85bCb9QD33As"}	t	2
3	2025-06-02 20:41:43.979352+00	2025-06-02 20:41:44.895296+00	\N	default agent	sofia_asistente	{"instruccion":"Eres un asistente para registrar las quejas de los usuarios","agentId":"asst_KyWRoiG5y4oiKwU46TCUAba7"}	t	3
4	2025-06-06 10:37:53.67056+00	2025-06-06 10:37:54.321689+00	\N	default agent	sofia_asistente	{"instruccion":"Eres un asistente para registrar las quejas de los usuarios","agentId":"asst_MlNeZ77fDlWhj4we0GsSLJfY"}	t	4
5	2025-06-06 15:49:15.413425+00	2025-06-10 20:28:15.398379+00	\N	Connie	sofia_asistente	{"instruccion":"Eres un asistente virtual especializado en atención al cliente. Tu objetivo es ayudar a los usuarios a resolver sus dudas sobre nuestros productos y servicios de manera amable y eficiente. Debes ser capaz de proporcionar información precisa y ofrecer soluciones prácticas a los problemas comunes.","agentId":"asst_PWLzdSCk60eNM13zq4Z2QAwT"}	t	5
6	2025-06-10 22:58:22.956684+00	2025-06-10 22:58:23.517642+00	\N	default agent	sofia_asistente	{"instruccion":"Eres un asistente para registrar las quejas de los usuarios","agentId":"asst_w2WwH727UuEnh1qMr1vNgeEc"}	t	6
1	2025-05-28 19:17:11.28417+00	2025-06-16 17:38:10.136469+00	\N	Test1	sofia_asistente	{"instruccion":"Eres un asistente para registrar las quejas de los usuarios y darles seguimiento a los diferentes temas de la empresa, por ejemplo, finanzas, soporte tecnico, ventas","agentId":"asst_mzPeHkWRPeijUS7TQV0d6cjF"}	t	1
\.


--
-- Data for Name: autenticador; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.autenticador (id, created_at, updated_at, deleted_at, type, config, name, life_time, field_name, value, "organizationId") FROM stdin;
\.


--
-- Data for Name: departamento; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.departamento (id, created_at, updated_at, deleted_at, name, description, organization_id) FROM stdin;
1	2025-05-28 19:17:07.928382+00	2025-05-28 19:17:07.928382+00	\N	default agent	dfgdg	1
2	2025-05-28 19:43:01.308582+00	2025-05-28 19:43:01.308582+00	\N	tetsinvgv2		1
3	2025-06-02 20:41:37.397813+00	2025-06-02 20:41:37.397813+00	\N	testing whatspa	testing	2
4	2025-06-06 10:37:41.697422+00	2025-06-06 10:37:41.697422+00	\N	testing whatsapp		3
5	2025-06-06 15:48:06.702066+00	2025-06-06 15:48:06.702066+00	\N	SAC	Chat Primario	4
6	2025-06-10 22:32:19.253548+00	2025-06-10 22:32:19.253548+00	\N	Ventas whatsapp	departamento de prueba manu	6
\.


--
-- Data for Name: funcion; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.funcion (id, created_at, updated_at, deleted_at, name, "normalizedName", description, type, config, agent_id, autenticador) FROM stdin;
1	2025-06-05 17:27:24.791316+00	2025-06-16 18:32:30.36877+00	\N	testing 	testing_	checking templates	apiEndpoint	{"url":"https://fakestoreapi.com/products/category/:category","method":"GET","bodyType":"JSON","position":{"x":666.9792166077199,"y":228.7908557509292}}	1	\N
\.


--
-- Data for Name: function_template; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.function_template (id, name, description, "categoryId", "applicationId", url, method, "bodyType", params, "isActive", "createdAt", "updatedAt") FROM stdin;
1	testing 	checking templates	1	2	https://fakestoreapi.com/products/category/:category	GET	JSON	{"param_1":{"id":"param_1","name":"param_1","title":"testing","description":"params","type":"string","required":false}}	t	2025-06-05 17:26:11.52424	2025-06-05 17:26:11.52424
\.


--
-- Data for Name: function_template_application; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.function_template_application (id, name, description, "imageUrl", domain, "isDynamicDomain", "isActive", "createdAt", "updatedAt") FROM stdin;
1	testing	aplication	https://dev-sofia-chat.sofiacall.com/templates/1/app_1.png	\N	t	t	2025-06-05 17:25:07.672644	2025-06-05 17:25:07.672644
2	testing	aplication	https://dev-sofia-chat.sofiacall.com/templates/2/app_2.png	\N	t	t	2025-06-05 17:25:32.122176	2025-06-05 17:25:32.122176
\.


--
-- Data for Name: function_template_category; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.function_template_category (id, name, "isActive", "createdAt", "updatedAt", description) FROM stdin;
1	testing	t	2025-06-13 20:04:52.96332	2025-06-13 20:04:52.96332	\N
\.


--
-- Data for Name: function_template_tag; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.function_template_tag (id, name) FROM stdin;
\.


--
-- Data for Name: function_template_tags_function_template_tag; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.function_template_tags_function_template_tag ("functionTemplateId", "functionTemplateTagId") FROM stdin;
\.


--
-- Data for Name: hitl_types; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.hitl_types (id, created_at, updated_at, deleted_at, name, description, organization_id, created_by) FROM stdin;
1	2025-06-16 15:27:26.654016+00	2025-06-16 15:27:26.654016+00	\N	default agentsdf	sdfsdfsdfs	6	1
3	2025-06-16 17:33:17.531334+00	2025-06-16 17:33:17.531334+00	\N	Soporte Tecnico	Este tipo es para todas las conversaciones o solicitude de soporte tecnico que la IA no pueda resolver	1	1
2	2025-06-16 15:38:48.618807+00	2025-06-16 18:57:01.238307+00	\N	soporte tecnico	dfgfdgfdgd	6	1
\.


--
-- Data for Name: knowledge_base; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.knowledge_base (id, created_at, updated_at, deleted_at, "fileId", "expirationTime", filename, agent_id) FROM stdin;
\.


--
-- Data for Name: knowledge_base_documents; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.knowledge_base_documents (id, content, embedding, fileid, agentid, metadata, createdat, updatedat) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1742486080661	InitialSchema1742486080661
2	1744054508684	FunctionTemplateRelations1744054508684
3	1746469565227	CreateSessionTagsTable1746469565227
4	1746469981580	UpdateFunctionTemplateCategory1746469981580
5	1746473718000	AddColorToSessionTags1746473718000
6	1746541769509	AddPriorityFieldToSession1746541769509
7	1746647970290	CreateOrganizationTags1746647970290
8	1746728700093	ChangeSessionTagRelationToChatSession1746728700093
9	1746812943199	CreateSuggestionAndRatingTablesWithActive1746812943199
10	1747856932846	RolesPermissionsSystem1747856932846
11	1747900000000	RolesMigrationData1747900000000
12	1748008679341	CreateSubscriptionTables1748008679341
13	1748008700000	InsertInitialPlans1748008700000
14	1748018993875	AddInvitationStatusToUserOrganization1748018993875
15	1748279791447	AddInvitationTrackingFields1748279791447
16	1748353909060	AddNewPermissions1748353909060
17	1748368120379	AddAvatarToUser1748368120379
18	1748377758402	UpdatePermissionsAndCategories1748377758402
19	1748532087010	AddGoogleAuthFields1748532087010
20	1748544447655	AddOrganizationTypesAndLimits1748544447655
21	1748549692707	AddConversationCountToOrganization1748549692707
22	1749658366870	CreateHitlTypesAndUserHitlTypes1749658366870
23	1749761569000	CreateChatUserDataTable1749761569000
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.notification (id, created_at, updated_at, deleted_at, title, avatar, "organizationId", type, status, link, metadata, "userId") FROM stdin;
1	2025-06-16 17:42:04.832753+00	2025-06-16 17:42:56.945778+00	\N	[Soporte Tecnico] El usuario necesita asistencia con un problema de soporte técnico.	\N	1	USER	READ	https://dev-sofia-chat-frontend.sofiacall.com/conversation/detail/10	{"conversationId":10,"hitlType":"Soporte Tecnico"}	4
\.


--
-- Data for Name: organization_subscriptions; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.organization_subscriptions (id, "organizationId", "planId", "startDate", "endDate", "isActive") FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.plans (id, name, description, price) FROM stdin;
f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454	Free	Basic features for small teams	0.00
a9d7e3c1-6b5a-4f2d-8e9c-1d2f3e4c5b6a	Pro	Everything you need for growing teams	49.00
b8e7d6c5-4f3e-2d1c-0b9a-8f7e6d5c4b3a	Enterprise	Advanced features for large organizations	199.00
\.


--
-- Data for Name: subscription_limits; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.subscription_limits (id, "planId", "resourceType", "maxValue") FROM stdin;
2723878e-2938-48e7-bf78-fc3d75c0c39a	f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454	USERS	3
9eb43a87-261c-4ffb-9213-f8f18ee58623	f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454	MESSAGES	1000
2e9787d0-32c1-4c6f-8ad9-543d131b214d	f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454	STORAGE	1
dff2a937-75b0-41dc-aa37-e24c9972be0c	f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454	API_CALLS	1000
e7e5cd6a-bd39-441d-afde-a7a740945cd1	a9d7e3c1-6b5a-4f2d-8e9c-1d2f3e4c5b6a	USERS	10
96f129ea-bc4c-46b3-a89d-1e550d21c332	a9d7e3c1-6b5a-4f2d-8e9c-1d2f3e4c5b6a	MESSAGES	10000
8958bb0c-4d3a-4b63-bdd9-62e9d9217f3c	a9d7e3c1-6b5a-4f2d-8e9c-1d2f3e4c5b6a	STORAGE	10
3eda9927-8639-4323-8044-fa04985091ef	a9d7e3c1-6b5a-4f2d-8e9c-1d2f3e4c5b6a	API_CALLS	100000
74ececa8-e60d-4af9-8805-32b89c9fe2ea	b8e7d6c5-4f3e-2d1c-0b9a-8f7e6d5c4b3a	USERS	\N
a93e2133-0659-4cbf-8067-91e690724eea	b8e7d6c5-4f3e-2d1c-0b9a-8f7e6d5c4b3a	MESSAGES	\N
550e5b8e-75a7-4bef-b5ea-923a16d13705	b8e7d6c5-4f3e-2d1c-0b9a-8f7e6d5c4b3a	STORAGE	\N
109a3105-9f63-47f3-9450-ddf1975bc4da	b8e7d6c5-4f3e-2d1c-0b9a-8f7e6d5c4b3a	API_CALLS	\N
\.


--
-- Data for Name: system_events; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.system_events (id, type, created_at, metadata, table_name, table_id, error_message, organization_id, conversation_id) FROM stdin;
1	AGENT_THREAD_CREATED	2025-05-28 19:24:59.893	{"thread_id": "thread_WEk1FrjA9CtiV2LMDgy4lS8x"}	agents	1	\N	1	1
2	AGENT_RESPONSE_STARTED	2025-05-28 19:24:59.903	{}	agents	1	\N	1	1
3	AGENT_MESSAGE_ADDED	2025-05-28 19:25:00.157	{"message": "hola"}	agents	1	\N	1	1
4	AGENT_RESPONSE_COMPLETED	2025-05-28 19:25:08.246	{"message": "¡Hola! ¿Cómo puedo ayudarte hoy? Si tienes alguna queja o comentario, estaré encantado de registrarlo.", "response_time": 8776}	agents	1	\N	1	1
5	AGENT_RESPONSE_STARTED	2025-05-28 20:11:45.671	{}	agents	1	\N	1	1
6	AGENT_MESSAGE_ADDED	2025-05-28 20:11:46.43	{"message": "Holajaja"}	agents	1	\N	1	1
7	AGENT_RESPONSE_FAILED	2025-05-28 20:11:50.438	{"error": "Assistant run failed", "stack": "Error: Assistant run failed\\n    at SofiaLLMService._runAgent (/app/dist/src/services/llm-agent/sofia-llm.service.js:272:23)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\\n    at async SofiaLLMService.response (/app/dist/src/services/llm-agent/base-agent.js:252:28)\\n    at async AgentService.getAgentResponse (/app/dist/src/modules/agent/agentServer.js:127:26)\\n    at async AgentService.processMessageWithConversation (/app/dist/src/modules/agent/agentServer.js:272:26)\\n    at async IntegrationRouterService.processMessage (/app/dist/src/modules/integration-router/integration.router.service.js:89:26)\\n    at async WebSocket.<anonymous> (/app/dist/src/modules/socket/socket.gateway.js:235:50)", "message": "Holajaja", "response_time": 4766}	agents	1	Assistant run failed	1	1
8	AGENT_RESPONSE_STARTED	2025-05-28 20:13:36.242	{}	agents	1	\N	1	1
9	AGENT_MESSAGE_ADDED	2025-05-28 20:13:36.811	{"message": "Do something."}	agents	1	\N	1	1
10	AGENT_RESPONSE_FAILED	2025-05-28 20:13:39.712	{"error": "Assistant run failed", "stack": "Error: Assistant run failed\\n    at SofiaLLMService._runAgent (/app/dist/src/services/llm-agent/sofia-llm.service.js:272:23)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\\n    at async SofiaLLMService.response (/app/dist/src/services/llm-agent/base-agent.js:252:28)\\n    at async AgentService.getAgentResponse (/app/dist/src/modules/agent/agentServer.js:127:26)\\n    at async AgentService.processMessageWithConversation (/app/dist/src/modules/agent/agentServer.js:272:26)\\n    at async IntegrationRouterService.processMessage (/app/dist/src/modules/integration-router/integration.router.service.js:89:26)\\n    at async WebSocket.<anonymous> (/app/dist/src/modules/socket/socket.gateway.js:268:50)", "message": "Do something.", "response_time": 3470}	agents	1	Assistant run failed	1	1
11	AGENT_RESPONSE_STARTED	2025-05-28 20:22:15.8	{}	agents	1	\N	1	1
12	AGENT_MESSAGE_ADDED	2025-05-28 20:22:16.254	{"message": ""}	agents	1	\N	1	1
13	AGENT_RESPONSE_FAILED	2025-05-28 20:22:19.632	{"error": "Assistant run failed", "stack": "Error: Assistant run failed\\n    at SofiaLLMService._runAgent (/app/dist/src/services/llm-agent/sofia-llm.service.js:272:23)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\\n    at async SofiaLLMService.response (/app/dist/src/services/llm-agent/base-agent.js:252:28)\\n    at async AgentService.getAgentResponse (/app/dist/src/modules/agent/agentServer.js:127:26)\\n    at async AgentService.processMessageWithConversation (/app/dist/src/modules/agent/agentServer.js:272:26)\\n    at async IntegrationRouterService.processMessage (/app/dist/src/modules/integration-router/integration.router.service.js:89:26)\\n    at async WebSocket.<anonymous> (/app/dist/src/modules/socket/socket.gateway.js:235:50)", "message": "", "response_time": 3832}	agents	1	Assistant run failed	1	1
14	AGENT_RESPONSE_STARTED	2025-05-28 20:22:25.608	{}	agents	1	\N	1	1
15	AGENT_MESSAGE_ADDED	2025-05-28 20:22:25.941	{"message": ""}	agents	1	\N	1	1
16	AGENT_RESPONSE_FAILED	2025-05-28 20:22:28.916	{"error": "Assistant run failed", "stack": "Error: Assistant run failed\\n    at SofiaLLMService._runAgent (/app/dist/src/services/llm-agent/sofia-llm.service.js:272:23)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\\n    at async SofiaLLMService.response (/app/dist/src/services/llm-agent/base-agent.js:252:28)\\n    at async AgentService.getAgentResponse (/app/dist/src/modules/agent/agentServer.js:127:26)\\n    at async AgentService.processMessageWithConversation (/app/dist/src/modules/agent/agentServer.js:272:26)\\n    at async IntegrationRouterService.processMessage (/app/dist/src/modules/integration-router/integration.router.service.js:89:26)\\n    at async WebSocket.<anonymous> (/app/dist/src/modules/socket/socket.gateway.js:235:50)", "message": "", "response_time": 3308}	agents	1	Assistant run failed	1	1
17	AGENT_RESPONSE_STARTED	2025-05-28 20:23:11.862	{}	agents	1	\N	1	1
18	AGENT_MESSAGE_ADDED	2025-05-28 20:23:12.134	{"message": "HOLA"}	agents	1	\N	1	1
19	AGENT_RESPONSE_FAILED	2025-05-28 20:23:18.054	{"error": "Assistant run failed", "stack": "Error: Assistant run failed\\n    at SofiaLLMService._runAgent (/app/dist/src/services/llm-agent/sofia-llm.service.js:272:23)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\\n    at async SofiaLLMService.response (/app/dist/src/services/llm-agent/base-agent.js:252:28)\\n    at async AgentService.getAgentResponse (/app/dist/src/modules/agent/agentServer.js:127:26)\\n    at async AgentService.processMessageWithConversation (/app/dist/src/modules/agent/agentServer.js:272:26)\\n    at async IntegrationRouterService.processMessage (/app/dist/src/modules/integration-router/integration.router.service.js:89:26)\\n    at async WebSocket.<anonymous> (/app/dist/src/modules/socket/socket.gateway.js:235:50)", "message": "HOLA", "response_time": 6192}	agents	1	Assistant run failed	1	1
20	AGENT_THREAD_CREATED	2025-05-29 18:01:53.113	{"thread_id": "thread_s4J0cTlZiCuecx3v7Xs0Oidk"}	agents	1	\N	1	2
21	AGENT_RESPONSE_STARTED	2025-05-29 18:01:53.122	{}	agents	1	\N	1	2
22	AGENT_MESSAGE_ADDED	2025-05-29 18:01:53.405	{"message": "hola probando"}	agents	1	\N	1	2
23	AGENT_RESPONSE_COMPLETED	2025-05-29 18:01:59.971	{"message": "¡Hola! ¿Cómo puedo ayudarte hoy? Si tienes alguna queja o consulta, no dudes en decírmelo.", "response_time": 7855}	agents	1	\N	1	2
24	AGENT_THREAD_CREATED	2025-05-29 18:12:11.749	{"thread_id": "thread_nJZxrrU41Dqy4NkhqMzvEVGj"}	agents	1	\N	1	4
25	AGENT_RESPONSE_STARTED	2025-05-29 18:12:11.757	{}	agents	1	\N	1	4
26	AGENT_MESSAGE_ADDED	2025-05-29 18:12:12.123	{"message": "hola"}	agents	1	\N	1	4
27	AGENT_RESPONSE_COMPLETED	2025-05-29 18:12:15.639	{"message": "¡Hola! ¿En qué puedo ayudarte hoy? Si tienes alguna queja o inquietud, estaré encantado de registrarla.", "response_time": 4132}	agents	1	\N	1	4
28	AGENT_THREAD_CREATED	2025-05-29 18:12:49.867	{"thread_id": "thread_IHHT39ytPIl3ASKFdQSN6pxS"}	agents	1	\N	1	5
29	AGENT_RESPONSE_STARTED	2025-05-29 18:12:49.874	{}	agents	1	\N	1	5
30	AGENT_MESSAGE_ADDED	2025-05-29 18:12:50.207	{"message": "hola"}	agents	1	\N	1	5
31	AGENT_RESPONSE_COMPLETED	2025-05-29 18:12:53.513	{"message": "¡Hola! ¿Cómo puedo ayudarte hoy?", "response_time": 3884}	agents	1	\N	1	5
32	AGENT_THREAD_CREATED	2025-05-29 21:55:39.872	{"thread_id": "thread_Zl5rXq7kutUKsqqoG5IpZS18"}	agents	1	\N	1	7
33	AGENT_RESPONSE_STARTED	2025-05-29 21:55:39.887	{}	agents	1	\N	1	7
34	AGENT_MESSAGE_ADDED	2025-05-29 21:55:40.222	{"message": "hola"}	agents	1	\N	1	7
35	AGENT_RESPONSE_COMPLETED	2025-05-29 21:55:44.144	{"message": "¡Hola! ¿En qué puedo ayudarte hoy? Si tienes alguna queja o inquietud, no dudes en decírmelo.", "response_time": 4953}	agents	1	\N	1	7
36	AGENT_THREAD_CREATED	2025-05-29 22:38:25.945	{"thread_id": "thread_JNIL0nA0ZHqXwysQbKjNec3F"}	agents	1	\N	1	6
37	AGENT_RESPONSE_STARTED	2025-05-29 22:38:25.973	{}	agents	1	\N	1	6
38	AGENT_MESSAGE_ADDED	2025-05-29 22:38:26.84	{"message": "hola"}	agents	1	\N	1	6
39	AGENT_RESPONSE_COMPLETED	2025-05-29 22:38:30.398	{"message": "¡Hola! ¿Cómo puedo ayudarte hoy? Si tienes alguna queja o mensaje que quieras registrar, estoy aquí para ayudarte.", "response_time": 4985}	agents	1	\N	1	6
40	AGENT_RESPONSE_STARTED	2025-05-29 22:44:40.856	{}	agents	1	\N	1	6
41	AGENT_MESSAGE_ADDED	2025-05-29 22:44:41.102	{"message": "Si."}	agents	1	\N	1	6
42	AGENT_RESPONSE_COMPLETED	2025-05-29 22:44:44.499	{"message": "Perfecto. Por favor, cuéntame cuál es tu queja o el mensaje que deseas registrar.", "response_time": 3643}	agents	1	\N	1	6
43	AGENT_RESPONSE_STARTED	2025-05-29 22:44:53.75	{}	agents	1	\N	1	6
44	AGENT_MESSAGE_ADDED	2025-05-29 22:44:54.08	{"message": "hola "}	agents	1	\N	1	6
45	AGENT_RESPONSE_COMPLETED	2025-05-29 22:44:57.088	{"message": "Hola nuevamente. Parece que todavía no has compartido tu queja. ¿Hay algo específico de lo que te gustaría hablar o registrar? Estoy aquí para ayudarte.", "response_time": 3337}	agents	1	\N	1	6
46	AGENT_TOOLS_UPDATED	2025-06-05 17:27:26.614	{"hitl": true, "functions": [{"id": 1, "name": "testing ", "type": "apiEndpoint", "config": {"url": "https://fakestoreapi.com/products/category/:category", "method": "GET", "bodyType": "JSON"}, "created_at": "2025-06-05T17:27:24.791Z", "deleted_at": null, "updated_at": "2025-06-05T17:27:24.791Z", "description": "checking templates", "normalizedName": "testing_"}]}	agents	1	\N	1	\N
47	AGENT_THREAD_CREATED	2025-06-10 21:33:45.656	{"thread_id": "thread_xlagUb3sjc3JRJJVQq5br6Zv"}	agents	5	\N	4	9
48	AGENT_RESPONSE_STARTED	2025-06-10 21:33:45.667	{}	agents	5	\N	4	9
49	AGENT_MESSAGE_ADDED	2025-06-10 21:33:46.251	{"message": "hola"}	agents	5	\N	4	9
50	AGENT_RESPONSE_COMPLETED	2025-06-10 21:33:50.057	{"message": "¡Hola! ¿Cómo puedo ayudarte hoy?", "response_time": 4934}	agents	5	\N	4	9
51	AGENT_RESPONSE_STARTED	2025-06-10 21:33:57.304	{}	agents	5	\N	4	9
52	AGENT_MESSAGE_ADDED	2025-06-10 21:33:57.625	{"message": "hola necesito de tu ayuda"}	agents	5	\N	4	9
53	AGENT_RESPONSE_COMPLETED	2025-06-10 21:34:01.842	{"message": "¡Por supuesto! Estoy aquí para ayudarte. ¿Cuál es tu pregunta o en qué necesitas asistencia?", "response_time": 4539}	agents	5	\N	4	9
54	AGENT_TOOLS_UPDATED	2025-06-16 15:27:27.276	{"hitl": true, "functions": []}	agents	6	\N	6	\N
55	AGENT_TOOLS_UPDATED	2025-06-16 15:27:43.918	{"hitl": true, "functions": []}	agents	6	\N	6	\N
56	AGENT_TOOLS_UPDATED	2025-06-16 15:38:49.242	{"hitl": true, "functions": []}	agents	6	\N	6	\N
57	AGENT_TOOLS_UPDATED	2025-06-16 16:50:42.112	{"hitl": true, "functions": []}	agents	6	\N	6	\N
58	AGENT_TOOLS_UPDATED	2025-06-16 17:33:18.208	{"hitl": true, "functions": []}	agents	2	\N	1	\N
59	AGENT_TOOLS_UPDATED	2025-06-16 17:33:19.456	{"hitl": true, "functions": [{"id": 1, "name": "testing ", "type": "apiEndpoint", "config": {"url": "https://fakestoreapi.com/products/category/:category", "method": "GET", "bodyType": "JSON", "position": {"x": 666.9792166077199, "y": 228.7908557509292}}, "created_at": "2025-06-05T17:27:24.791Z", "deleted_at": null, "updated_at": "2025-06-16T17:23:57.322Z", "description": "checking templates", "normalizedName": "testing_"}]}	agents	1	\N	1	\N
60	AGENT_TOOLS_UPDATED	2025-06-16 17:35:24.557	{"hitl": true, "functions": []}	agents	2	\N	1	\N
61	AGENT_TOOLS_UPDATED	2025-06-16 17:35:25.578	{"hitl": true, "functions": [{"id": 1, "name": "testing ", "type": "apiEndpoint", "config": {"url": "https://fakestoreapi.com/products/category/:category", "method": "GET", "bodyType": "JSON", "position": {"x": 666.9792166077199, "y": 228.7908557509292}}, "created_at": "2025-06-05T17:27:24.791Z", "deleted_at": null, "updated_at": "2025-06-16T17:23:57.322Z", "description": "checking templates", "normalizedName": "testing_"}]}	agents	1	\N	1	\N
62	AGENT_THREAD_CREATED	2025-06-16 17:40:39.264	{"thread_id": "thread_YYnaUdsOyOPF6uXo5JDXyfZn"}	agents	1	\N	1	10
63	AGENT_RESPONSE_STARTED	2025-06-16 17:40:39.291	{}	agents	1	\N	1	10
64	AGENT_MESSAGE_ADDED	2025-06-16 17:40:39.953	{"message": "hola buen dia"}	agents	1	\N	1	10
65	AGENT_RESPONSE_COMPLETED	2025-06-16 17:40:43.461	{"message": "¡Hola! Buen día. ¿En qué puedo ayudarte hoy?", "response_time": 4498}	agents	1	\N	1	10
66	AGENT_RESPONSE_STARTED	2025-06-16 17:41:33.71	{}	agents	1	\N	1	10
67	AGENT_MESSAGE_ADDED	2025-06-16 17:41:34.806	{"message": "necesito ayuda con un tema de soporte tecnico"}	agents	1	\N	1	10
68	AGENT_RESPONSE_COMPLETED	2025-06-16 17:41:38.54	{"message": "Claro, puedo ayudarte con eso. ¿Cuál es el problema específico que estás enfrentando?", "response_time": 4830}	agents	1	\N	1	10
69	AGENT_RESPONSE_STARTED	2025-06-16 17:42:00.218	{}	agents	1	\N	1	10
70	AGENT_MESSAGE_ADDED	2025-06-16 17:42:00.605	{"message": "me asignas al encargad humano de soporte tecnico porfavor"}	agents	1	\N	1	10
71	CONVERSATION_ASSIGNED	2025-06-16 17:42:04.84	{"agentId": 1, "message": "El usuario necesita asistencia con un problema de soporte técnico.", "hitlType": "Soporte Tecnico", "functionName": "sofia__hitl", "usersNotified": 1, "conversationId": 10, "humanAssistanceRequested": true}	conversations	10	\N	1	10
72	AGENT_RESPONSE_COMPLETED	2025-06-16 17:42:08.858	{"message": "He enviado tu solicitud a un agente humano de soporte técnico y se le ha notificado. Ellos se pondrán en contacto contigo pronto para ayudarte con tu problema. Si necesitas algo más, no dudes en decírmelo.", "response_time": 8640}	agents	1	\N	1	10
73	AGENT_TOOLS_UPDATED	2025-06-16 18:57:01.933	{"hitl": true, "functions": []}	agents	6	\N	6	\N
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.usage_records (id, "organizationId", "resourceType", count, period) FROM stdin;
\.


--
-- Data for Name: user_hitl_types; Type: TABLE DATA; Schema: public; Owner: sofia_chat_user
--

COPY public.user_hitl_types (id, created_at, updated_at, deleted_at, user_id, hitl_type_id, organization_id) FROM stdin;
1	2025-06-16 15:27:43.312733+00	2025-06-16 15:27:43.312733+00	\N	5	1	6
3	2025-06-16 17:35:24.074829+00	2025-06-16 17:35:24.074829+00	\N	4	3	1
\.


--
-- Name: ChatSessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."ChatSessions_id_seq"', 9, true);


--
-- Name: ChatUserData_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."ChatUserData_id_seq"', 1, false);


--
-- Name: ChatUsers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."ChatUsers_id_seq"', 18, true);


--
-- Name: Conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Conversations_id_seq"', 10, true);


--
-- Name: DashboardCards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."DashboardCards_id_seq"', 48, true);


--
-- Name: Integrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Integrations_id_seq"', 32, true);


--
-- Name: Messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Messages_id_seq"', 33, true);


--
-- Name: OrganizationLimits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."OrganizationLimits_id_seq"', 3, true);


--
-- Name: OrganizationTags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."OrganizationTags_id_seq"', 1, false);


--
-- Name: Organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Organizations_id_seq"', 7, true);


--
-- Name: Permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Permissions_id_seq"', 15, true);


--
-- Name: RolePermissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."RolePermissions_id_seq"', 1, false);


--
-- Name: Roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Roles_id_seq"', 1, false);


--
-- Name: SessionTags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."SessionTags_id_seq"', 1, false);


--
-- Name: Sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Sessions_id_seq"', 51, true);


--
-- Name: SuggestionRatings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."SuggestionRatings_id_seq"', 1, false);


--
-- Name: Suggestions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Suggestions_id_seq"', 1, false);


--
-- Name: UserOrganizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."UserOrganizations_id_seq"', 12, true);


--
-- Name: Users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public."Users_id_seq"', 5, true);


--
-- Name: agente_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.agente_id_seq', 6, true);


--
-- Name: autenticador_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.autenticador_id_seq', 1, false);


--
-- Name: departamento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.departamento_id_seq', 6, true);


--
-- Name: funcion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.funcion_id_seq', 1, true);


--
-- Name: function_template_application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.function_template_application_id_seq', 2, true);


--
-- Name: function_template_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.function_template_category_id_seq', 1, true);


--
-- Name: function_template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.function_template_id_seq', 1, true);


--
-- Name: function_template_tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.function_template_tag_id_seq', 1, false);


--
-- Name: hitl_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.hitl_types_id_seq', 3, true);


--
-- Name: knowledge_base_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.knowledge_base_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 23, true);


--
-- Name: notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.notification_id_seq', 1, true);


--
-- Name: system_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.system_events_id_seq', 73, true);


--
-- Name: user_hitl_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: sofia_chat_user
--

SELECT pg_catalog.setval('public.user_hitl_types_id_seq', 3, true);


--
-- Name: funcion PK_048102c1546244e94f6dab37f45; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT "PK_048102c1546244e94f6dab37f45" PRIMARY KEY (id);


--
-- Name: OrganizationLimits PK_095a6f37620f6ad19f0a0ac22d9; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."OrganizationLimits"
    ADD CONSTRAINT "PK_095a6f37620f6ad19f0a0ac22d9" PRIMARY KEY (id);


--
-- Name: Sessions PK_0ff5532d98863bc618809d2d401; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Sessions"
    ADD CONSTRAINT "PK_0ff5532d98863bc618809d2d401" PRIMARY KEY (id);


--
-- Name: autenticador PK_11eeee0f5c42100269496f93d1d; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.autenticador
    ADD CONSTRAINT "PK_11eeee0f5c42100269496f93d1d" PRIMARY KEY (id);


--
-- Name: Users PK_16d4f7d636df336db11d87413e3; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY (id);


--
-- Name: knowledge_base PK_19d3f52f6da1501b7e235f1da5c; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT "PK_19d3f52f6da1501b7e235f1da5c" PRIMARY KEY (id);


--
-- Name: function_template_tags_function_template_tag PK_25a46f1c9320157119b2ef75adf; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_tags_function_template_tag
    ADD CONSTRAINT "PK_25a46f1c9320157119b2ef75adf" PRIMARY KEY ("functionTemplateId", "functionTemplateTagId");


--
-- Name: RolePermissions PK_29cf5edaa365f1e090b95eb6708; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "PK_29cf5edaa365f1e090b95eb6708" PRIMARY KEY (id);


--
-- Name: UserOrganizations PK_34f9cbade5083b765064d79617a; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."UserOrganizations"
    ADD CONSTRAINT "PK_34f9cbade5083b765064d79617a" PRIMARY KEY (id);


--
-- Name: plans PK_3720521a81c7c24fe9b7202ba61; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY (id);


--
-- Name: OrganizationTags PK_40b950c449ae9175679779ef8b5; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."OrganizationTags"
    ADD CONSTRAINT "PK_40b950c449ae9175679779ef8b5" PRIMARY KEY (id);


--
-- Name: Conversations PK_44f6c6ade92598cd70087acf2a1; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Conversations"
    ADD CONSTRAINT "PK_44f6c6ade92598cd70087acf2a1" PRIMARY KEY (id);


--
-- Name: agente PK_47af256a3a46207eab30a0b126e; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.agente
    ADD CONSTRAINT "PK_47af256a3a46207eab30a0b126e" PRIMARY KEY (id);


--
-- Name: subscription_limits PK_49f015e87dc34f34f8593f64179; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.subscription_limits
    ADD CONSTRAINT "PK_49f015e87dc34f34f8593f64179" PRIMARY KEY (id);


--
-- Name: hitl_types PK_5815f6f85b453f86d51c32933ce; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.hitl_types
    ADD CONSTRAINT "PK_5815f6f85b453f86d51c32933ce" PRIMARY KEY (id);


--
-- Name: SuggestionRatings PK_5a316f4e21f985b3440ea827a65; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SuggestionRatings"
    ADD CONSTRAINT "PK_5a316f4e21f985b3440ea827a65" PRIMARY KEY (id);


--
-- Name: function_template_category PK_6478ee539f326e9e5dd01528e64; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_category
    ADD CONSTRAINT "PK_6478ee539f326e9e5dd01528e64" PRIMARY KEY (id);


--
-- Name: organization_subscriptions PK_64e17f1dc8ebe056b49e751a494; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT "PK_64e17f1dc8ebe056b49e751a494" PRIMARY KEY (id);


--
-- Name: notification PK_705b6c7cdf9b2c2ff7ac7872cb7; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY (id);


--
-- Name: function_template_application PK_7277abc4987f4d28585e288c636; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_application
    ADD CONSTRAINT "PK_7277abc4987f4d28585e288c636" PRIMARY KEY (id);


--
-- Name: departamento PK_7fd6f336280fd0c7a9318464723; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT "PK_7fd6f336280fd0c7a9318464723" PRIMARY KEY (id);


--
-- Name: Suggestions PK_8046880333dc79f13b3c8a78599; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Suggestions"
    ADD CONSTRAINT "PK_8046880333dc79f13b3c8a78599" PRIMARY KEY (id);


--
-- Name: ChatUsers PK_85852187b9e3a4144b436663d78; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatUsers"
    ADD CONSTRAINT "PK_85852187b9e3a4144b436663d78" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: ChatUserData PK_ChatUserData; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatUserData"
    ADD CONSTRAINT "PK_ChatUserData" PRIMARY KEY (id);


--
-- Name: ChatSessions PK_a13a97991b35f4dc6ec4a5b5507; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatSessions"
    ADD CONSTRAINT "PK_a13a97991b35f4dc6ec4a5b5507" PRIMARY KEY (id);


--
-- Name: user_hitl_types PK_af3934cbfdbfbb5de4fed52eada; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.user_hitl_types
    ADD CONSTRAINT "PK_af3934cbfdbfbb5de4fed52eada" PRIMARY KEY (id);


--
-- Name: function_template PK_b3aa1946221bbeadb4cd1866b8b; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template
    ADD CONSTRAINT "PK_b3aa1946221bbeadb4cd1866b8b" PRIMARY KEY (id);


--
-- Name: DashboardCards PK_b6b0910bd8a1d1a9a88bd3b71e7; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."DashboardCards"
    ADD CONSTRAINT "PK_b6b0910bd8a1d1a9a88bd3b71e7" PRIMARY KEY (id);


--
-- Name: Integrations PK_d03a73c576f7ad2f484afe77ec0; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Integrations"
    ADD CONSTRAINT "PK_d03a73c576f7ad2f484afe77ec0" PRIMARY KEY (id);


--
-- Name: SessionTags PK_daa4268663c69d7331a777eee78; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SessionTags"
    ADD CONSTRAINT "PK_daa4268663c69d7331a777eee78" PRIMARY KEY (id);


--
-- Name: Organizations PK_e0690a31419f6666194423526f2; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Organizations"
    ADD CONSTRAINT "PK_e0690a31419f6666194423526f2" PRIMARY KEY (id);


--
-- Name: usage_records PK_e511cf9f7dc53851569f87467a5; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY (id);


--
-- Name: Permissions PK_e83fa8a46bd5a3bfaa095d40812; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Permissions"
    ADD CONSTRAINT "PK_e83fa8a46bd5a3bfaa095d40812" PRIMARY KEY (id);


--
-- Name: Messages PK_ecc722506c4b974388431745e8b; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Messages"
    ADD CONSTRAINT "PK_ecc722506c4b974388431745e8b" PRIMARY KEY (id);


--
-- Name: Roles PK_efba48c6a0c7a9b6260f771b165; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Roles"
    ADD CONSTRAINT "PK_efba48c6a0c7a9b6260f771b165" PRIMARY KEY (id);


--
-- Name: system_events PK_f28cae54c57b2887d94a4aa745e; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT "PK_f28cae54c57b2887d94a4aa745e" PRIMARY KEY (id);


--
-- Name: function_template_tag PK_f68415860da467143807fea00bd; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_tag
    ADD CONSTRAINT "PK_f68415860da467143807fea00bd" PRIMARY KEY (id);


--
-- Name: agente REL_7cefc7a63f060d6a45ea01997e; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.agente
    ADD CONSTRAINT "REL_7cefc7a63f060d6a45ea01997e" UNIQUE (departamento_id);


--
-- Name: plans UQ_253d25dae4c94ee913bc5ec4850; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "UQ_253d25dae4c94ee913bc5ec4850" UNIQUE (name);


--
-- Name: function_template_tag UQ_4a9a24a3d2d84369cad9ad43a85; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_tag
    ADD CONSTRAINT "UQ_4a9a24a3d2d84369cad9ad43a85" UNIQUE (name);


--
-- Name: funcion UQ_af406a621fe90551c63161acfc9; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT "UQ_af406a621fe90551c63161acfc9" UNIQUE ("normalizedName", agent_id);


--
-- Name: knowledge_base_documents knowledge_base_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.knowledge_base_documents
    ADD CONSTRAINT knowledge_base_documents_pkey PRIMARY KEY (id);


--
-- Name: IDX_19817bcfeb0a9c9cf77982eaf3; Type: INDEX; Schema: public; Owner: sofia_chat_user
--

CREATE INDEX "IDX_19817bcfeb0a9c9cf77982eaf3" ON public.function_template_tags_function_template_tag USING btree ("functionTemplateId");


--
-- Name: IDX_3c3ab3f49a87e6ddb607f3c494; Type: INDEX; Schema: public; Owner: sofia_chat_user
--

CREATE UNIQUE INDEX "IDX_3c3ab3f49a87e6ddb607f3c494" ON public."Users" USING btree (email);


--
-- Name: IDX_5a331765b20a161378b2fedad4; Type: INDEX; Schema: public; Owner: sofia_chat_user
--

CREATE INDEX "IDX_5a331765b20a161378b2fedad4" ON public.function_template_tags_function_template_tag USING btree ("functionTemplateTagId");


--
-- Name: IDX_ChatUserData_chat_user_id_key; Type: INDEX; Schema: public; Owner: sofia_chat_user
--

CREATE UNIQUE INDEX "IDX_ChatUserData_chat_user_id_key" ON public."ChatUserData" USING btree (chat_user_id, key);


--
-- Name: SessionTags FK_00edc684ceda0be01449e6328b5; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SessionTags"
    ADD CONSTRAINT "FK_00edc684ceda0be01449e6328b5" FOREIGN KEY ("chatSessionId") REFERENCES public."ChatSessions"(id) ON DELETE CASCADE;


--
-- Name: RolePermissions FK_073f7c14abfd15761ca3e9d85b4; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "FK_073f7c14abfd15761ca3e9d85b4" FOREIGN KEY (permission_id) REFERENCES public."Permissions"(id) ON DELETE CASCADE;


--
-- Name: function_template FK_0bb3aa62f93eea1254bc047c5fb; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template
    ADD CONSTRAINT "FK_0bb3aa62f93eea1254bc047c5fb" FOREIGN KEY ("applicationId") REFERENCES public.function_template_application(id);


--
-- Name: user_hitl_types FK_0bce9430cbd3978430bf311ceaf; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.user_hitl_types
    ADD CONSTRAINT "FK_0bce9430cbd3978430bf311ceaf" FOREIGN KEY (hitl_type_id) REFERENCES public.hitl_types(id);


--
-- Name: usage_records FK_139b12af7ac259044807889d062; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "FK_139b12af7ac259044807889d062" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id);


--
-- Name: function_template_tags_function_template_tag FK_19817bcfeb0a9c9cf77982eaf3b; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_tags_function_template_tag
    ADD CONSTRAINT "FK_19817bcfeb0a9c9cf77982eaf3b" FOREIGN KEY ("functionTemplateId") REFERENCES public.function_template(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DashboardCards FK_1ca6bde5fd0b0f4feb8115f2b96; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."DashboardCards"
    ADD CONSTRAINT "FK_1ca6bde5fd0b0f4feb8115f2b96" FOREIGN KEY ("userOrganizationId") REFERENCES public."UserOrganizations"(id);


--
-- Name: notification FK_1ced25315eb974b73391fb1c81b; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES public."Users"(id);


--
-- Name: organization_subscriptions FK_2016a3c2d041c98f2a46d9a13fd; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT "FK_2016a3c2d041c98f2a46d9a13fd" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id);


--
-- Name: system_events FK_226fafc4fadce76691317e072f1; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT "FK_226fafc4fadce76691317e072f1" FOREIGN KEY (organization_id) REFERENCES public."Organizations"(id);


--
-- Name: OrganizationLimits FK_27e15bfaf17851ca2fcdf034d57; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."OrganizationLimits"
    ADD CONSTRAINT "FK_27e15bfaf17851ca2fcdf034d57" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id) ON DELETE CASCADE;


--
-- Name: knowledge_base FK_2ce7b8636863df81e1fc9cc73fc; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT "FK_2ce7b8636863df81e1fc9cc73fc" FOREIGN KEY (agent_id) REFERENCES public.agente(id);


--
-- Name: hitl_types FK_2f5b23590f1c10a0d4b003903b8; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.hitl_types
    ADD CONSTRAINT "FK_2f5b23590f1c10a0d4b003903b8" FOREIGN KEY (created_by) REFERENCES public."Users"(id);


--
-- Name: user_hitl_types FK_31c6ef7d3d2b57f089609af05c8; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.user_hitl_types
    ADD CONSTRAINT "FK_31c6ef7d3d2b57f089609af05c8" FOREIGN KEY (organization_id) REFERENCES public."Organizations"(id);


--
-- Name: Conversations FK_4c8a59b0d0386da606816293257; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Conversations"
    ADD CONSTRAINT "FK_4c8a59b0d0386da606816293257" FOREIGN KEY ("chatUserId") REFERENCES public."ChatUsers"(id);


--
-- Name: organization_subscriptions FK_4ff83b571a6a52ae494a4b9c0c5; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.organization_subscriptions
    ADD CONSTRAINT "FK_4ff83b571a6a52ae494a4b9c0c5" FOREIGN KEY ("planId") REFERENCES public.plans(id);


--
-- Name: RolePermissions FK_52ea58017fb4c7d1e117cdcc4a8; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."RolePermissions"
    ADD CONSTRAINT "FK_52ea58017fb4c7d1e117cdcc4a8" FOREIGN KEY (role_id) REFERENCES public."Roles"(id) ON DELETE CASCADE;


--
-- Name: Sessions FK_582c3cb0fcddddf078b33e316d3; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Sessions"
    ADD CONSTRAINT "FK_582c3cb0fcddddf078b33e316d3" FOREIGN KEY ("userId") REFERENCES public."Users"(id);


--
-- Name: function_template_tags_function_template_tag FK_5a331765b20a161378b2fedad44; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template_tags_function_template_tag
    ADD CONSTRAINT "FK_5a331765b20a161378b2fedad44" FOREIGN KEY ("functionTemplateTagId") REFERENCES public.function_template_tag(id);


--
-- Name: SuggestionRatings FK_60181fe1e2ecc75f85547096308; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SuggestionRatings"
    ADD CONSTRAINT "FK_60181fe1e2ecc75f85547096308" FOREIGN KEY ("userId") REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: subscription_limits FK_61f16db72f55f6753dfde2c0bca; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.subscription_limits
    ADD CONSTRAINT "FK_61f16db72f55f6753dfde2c0bca" FOREIGN KEY ("planId") REFERENCES public.plans(id);


--
-- Name: Suggestions FK_6dbdcda8524d6327f923a1e98b4; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Suggestions"
    ADD CONSTRAINT "FK_6dbdcda8524d6327f923a1e98b4" FOREIGN KEY ("messageId") REFERENCES public."Messages"(id) ON DELETE CASCADE;


--
-- Name: Roles FK_6f4bf6e1d7b9fbb3a8824e2d9ac; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Roles"
    ADD CONSTRAINT "FK_6f4bf6e1d7b9fbb3a8824e2d9ac" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id);


--
-- Name: system_events FK_7c5e1be4579b00f5c7eab73fafa; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.system_events
    ADD CONSTRAINT "FK_7c5e1be4579b00f5c7eab73fafa" FOREIGN KEY (conversation_id) REFERENCES public."Conversations"(id);


--
-- Name: agente FK_7cefc7a63f060d6a45ea01997e1; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.agente
    ADD CONSTRAINT "FK_7cefc7a63f060d6a45ea01997e1" FOREIGN KEY (departamento_id) REFERENCES public.departamento(id);


--
-- Name: Messages FK_7f4ef9f385a6fc56ca1acc07d11; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Messages"
    ADD CONSTRAINT "FK_7f4ef9f385a6fc56ca1acc07d11" FOREIGN KEY ("chatSessionId") REFERENCES public."ChatSessions"(id);


--
-- Name: Integrations FK_81bf37c8a164eb352b84269963e; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Integrations"
    ADD CONSTRAINT "FK_81bf37c8a164eb352b84269963e" FOREIGN KEY ("departamentoId") REFERENCES public.departamento(id);


--
-- Name: function_template FK_891a32794539ac83ae3c72df34d; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.function_template
    ADD CONSTRAINT "FK_891a32794539ac83ae3c72df34d" FOREIGN KEY ("categoryId") REFERENCES public.function_template_category(id);


--
-- Name: hitl_types FK_8ed8807e478f67d17e3c5c38e96; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.hitl_types
    ADD CONSTRAINT "FK_8ed8807e478f67d17e3c5c38e96" FOREIGN KEY (organization_id) REFERENCES public."Organizations"(id);


--
-- Name: ChatSessions FK_8f358897b9ae3a0743a81cdb91a; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatSessions"
    ADD CONSTRAINT "FK_8f358897b9ae3a0743a81cdb91a" FOREIGN KEY ("conversationId") REFERENCES public."Conversations"(id);


--
-- Name: SessionTags FK_912b14c8fbed73a8977fd862241; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SessionTags"
    ADD CONSTRAINT "FK_912b14c8fbed73a8977fd862241" FOREIGN KEY ("organizationTagId") REFERENCES public."OrganizationTags"(id);


--
-- Name: UserOrganizations FK_915869dc09b36555bde1348cd30; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."UserOrganizations"
    ADD CONSTRAINT "FK_915869dc09b36555bde1348cd30" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id) ON DELETE CASCADE;


--
-- Name: departamento FK_94ea12b63f5f149437c0c9ff9a7; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT "FK_94ea12b63f5f149437c0c9ff9a7" FOREIGN KEY (organization_id) REFERENCES public."Organizations"(id);


--
-- Name: UserOrganizations FK_98c7340d3f4a85cbf599626c67e; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."UserOrganizations"
    ADD CONSTRAINT "FK_98c7340d3f4a85cbf599626c67e" FOREIGN KEY ("userId") REFERENCES public."Users"(id) ON DELETE CASCADE;


--
-- Name: ChatUserData FK_ChatUserData_chat_user_id; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."ChatUserData"
    ADD CONSTRAINT "FK_ChatUserData_chat_user_id" FOREIGN KEY (chat_user_id) REFERENCES public."ChatUsers"(id) ON DELETE CASCADE;


--
-- Name: Messages FK_a5ff025977810462c680eb48bbf; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Messages"
    ADD CONSTRAINT "FK_a5ff025977810462c680eb48bbf" FOREIGN KEY ("conversationId") REFERENCES public."Conversations"(id);


--
-- Name: SuggestionRatings FK_a65266dead685f62880cb67f681; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SuggestionRatings"
    ADD CONSTRAINT "FK_a65266dead685f62880cb67f681" FOREIGN KEY ("suggestionId") REFERENCES public."Suggestions"(id) ON DELETE CASCADE;


--
-- Name: autenticador FK_a8376c776a5c4bc7c037ca84de3; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.autenticador
    ADD CONSTRAINT "FK_a8376c776a5c4bc7c037ca84de3" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id);


--
-- Name: OrganizationTags FK_b69cc00de0889a7df12e9250113; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."OrganizationTags"
    ADD CONSTRAINT "FK_b69cc00de0889a7df12e9250113" FOREIGN KEY ("organizationId") REFERENCES public."Organizations"(id) ON DELETE CASCADE;


--
-- Name: user_hitl_types FK_bbbf9459d138b3c32a27d0b4f05; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.user_hitl_types
    ADD CONSTRAINT "FK_bbbf9459d138b3c32a27d0b4f05" FOREIGN KEY (user_id) REFERENCES public."Users"(id);


--
-- Name: funcion FK_c325aa3add633f13247408f66ea; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT "FK_c325aa3add633f13247408f66ea" FOREIGN KEY (autenticador) REFERENCES public.autenticador(id);


--
-- Name: Conversations FK_c5ad46fe06e70af235da4e6c920; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Conversations"
    ADD CONSTRAINT "FK_c5ad46fe06e70af235da4e6c920" FOREIGN KEY ("integrationId") REFERENCES public."Integrations"(id) ON DELETE SET NULL;


--
-- Name: funcion FK_c61e8b2365cf3f6c3489dd5b990; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public.funcion
    ADD CONSTRAINT "FK_c61e8b2365cf3f6c3489dd5b990" FOREIGN KEY (agent_id) REFERENCES public.agente(id);


--
-- Name: Conversations FK_d2ef5dea60a365c3d39a2bf606a; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Conversations"
    ADD CONSTRAINT "FK_d2ef5dea60a365c3d39a2bf606a" FOREIGN KEY ("userId") REFERENCES public."Users"(id);


--
-- Name: Conversations FK_dd894c61ff6b6bce682c3b2a8d4; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."Conversations"
    ADD CONSTRAINT "FK_dd894c61ff6b6bce682c3b2a8d4" FOREIGN KEY ("departamentoId") REFERENCES public.departamento(id);


--
-- Name: SessionTags FK_e3bfce07d2b72e9bb692b52e254; Type: FK CONSTRAINT; Schema: public; Owner: sofia_chat_user
--

ALTER TABLE ONLY public."SessionTags"
    ADD CONSTRAINT "FK_e3bfce07d2b72e9bb692b52e254" FOREIGN KEY ("createdById") REFERENCES public."Users"(id);


--
-- PostgreSQL database dump complete
--


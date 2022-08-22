--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.24
-- Dumped by pg_dump version 14.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: wallet_user
--

ALTER SCHEMA public OWNER TO wallet_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: wallet_user
--

COMMENT ON SCHEMA public IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
--
-- Name: entity_trust_request_type; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.entity_trust_request_type AS ENUM (
    'send',
    'receive',
    'manage',
    'yield',
    'deduct',
    'release'
);


ALTER TYPE public.entity_trust_request_type OWNER TO wallet_user;

--
-- Name: entity_trust_state_type; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.entity_trust_state_type AS ENUM (
    'requested',
    'cancelled_by_originator',
    'cancelled_by_actor',
    'cancelled_by_target',
    'trusted'
);


ALTER TYPE public.entity_trust_state_type OWNER TO wallet_user;

--
-- Name: entity_trust_type; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.entity_trust_type AS ENUM (
    'send',
    'manage',
    'deduct'
);


ALTER TYPE public.entity_trust_type OWNER TO wallet_user;

--
-- Name: transfer_state; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.transfer_state AS ENUM (
    'requested',
    'pending',
    'completed',
    'cancelled',
    'failed'
);


ALTER TYPE public.transfer_state OWNER TO wallet_user;

--
-- Name: transfer_state_change_approval_type; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.transfer_state_change_approval_type AS ENUM (
    'trusted',
    'manual',
    'machine'
);


ALTER TYPE public.transfer_state_change_approval_type OWNER TO wallet_user;

--
-- Name: transfer_type; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.transfer_type AS ENUM (
    'send',
    'deduct',
    'managed'
);


ALTER TYPE public.transfer_type OWNER TO wallet_user;

--
-- Name: wallet_event_type; Type: TYPE; Schema: public; Owner: wallet_user
--

CREATE TYPE public.wallet_event_type AS ENUM (
    'trust_request',
    'trust_request_granted',
    'trust_request_cancelled_by_originator',
    'trust_request_cancelled_by_actor',
    'trust_request_cancelled_by_target',
    'transfer_requested',
    'transfer_request_cancelled_by_source',
    'transfer_request_cancelled_by_destination',
    'transfer_request_cancelled_by_originator',
    'transfer_pending_cancelled_by_source',
    'transfer_pending_cancelled_by_destination',
    'transfer_pending_cancelled_by_requestor',
    'transfer_completed',
    'transfer_failed'
);


ALTER TYPE public.wallet_event_type OWNER TO wallet_user;

SET default_tablespace = '';

--
-- Name: api_key; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.api_key (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying,
    tree_token_api_access boolean,
    hash character varying,
    salt character varying,
    name character varying
);


ALTER TABLE public.api_key OWNER TO wallet_user;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


ALTER TABLE public.migrations OWNER TO wallet_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: wallet_user
--

CREATE SEQUENCE public.migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO wallet_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wallet_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: token; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.token (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    capture_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    transfer_pending boolean DEFAULT false NOT NULL,
    transfer_pending_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    claim boolean DEFAULT false NOT NULL
);


ALTER TABLE public.token OWNER TO wallet_user;

--
-- Name: transaction; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.transaction (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token_id uuid NOT NULL,
    transfer_id uuid NOT NULL,
    source_wallet_id uuid NOT NULL,
    destination_wallet_id uuid NOT NULL,
    processed_at timestamp without time zone DEFAULT now() NOT NULL,
    claim boolean DEFAULT false NOT NULL
);


ALTER TABLE public.transaction OWNER TO wallet_user;

--
-- Name: transfer; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.transfer (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    originator_wallet_id uuid NOT NULL,
    source_wallet_id uuid NOT NULL,
    destination_wallet_id uuid NOT NULL,
    type public.transfer_type NOT NULL,
    parameters json,
    state public.transfer_state NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    closed_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL,
    claim boolean DEFAULT false NOT NULL
);


ALTER TABLE public.transfer OWNER TO wallet_user;

--
-- Name: transfer_audit; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.transfer_audit (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    transfer_id integer NOT NULL,
    new_state public.transfer_state NOT NULL,
    processed_at timestamp without time zone DEFAULT now() NOT NULL,
    approval_type public.transfer_state_change_approval_type NOT NULL,
    entity_trust_id integer NOT NULL
);


ALTER TABLE public.transfer_audit OWNER TO wallet_user;

--
-- Name: wallet; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.wallet (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    password character varying,
    salt character varying,
    logo_url character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet OWNER TO wallet_user;

--
-- Name: wallet_event; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.wallet_event (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    wallet_id uuid NOT NULL,
    type public.wallet_event_type NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet_event OWNER TO wallet_user;

--
-- Name: wallet_trust; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.wallet_trust (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    actor_wallet_id uuid,
    target_wallet_id uuid NOT NULL,
    type public.entity_trust_type,
    originator_wallet_id uuid,
    request_type public.entity_trust_request_type NOT NULL,
    state public.entity_trust_state_type,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.wallet_trust OWNER TO wallet_user;

--
-- Name: wallet_trust_log; Type: TABLE; Schema: public; Owner: wallet_user
--

CREATE TABLE public.wallet_trust_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    wallet_trust_id uuid NOT NULL,
    actor_wallet_id uuid NOT NULL,
    target_wallet_id uuid NOT NULL,
    type public.entity_trust_type NOT NULL,
    originator_wallet_id uuid NOT NULL,
    request_type public.entity_trust_request_type NOT NULL,
    state public.entity_trust_state_type NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    logged_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean NOT NULL
);


ALTER TABLE public.wallet_trust_log OWNER TO wallet_user;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: api_key; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.api_key (id, key, tree_token_api_access, hash, salt, name) FROM stdin;
b4741638-234b-41c4-b2de-4f847ec66e1d	E0Nluj01aJKiwgQU3V7WV6n2FUeACgyI	t	\N	\N	es
6f863280-2a8d-4599-a42e-4cb1e103b120	HuGuzq2QdUULY0ija5ZGRKdrTs9jUdZ6	t	\N	\N	treebytree
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.migrations (id, name, run_on) FROM stdin;
1	/20200826045032-CreateSchemaWallets	2022-08-22 08:32:20.931
2	/20200826045033-AddUUIDExtension	2022-08-22 08:32:20.957
3	/20200826045033-CreateTableTransaction	2022-08-22 08:32:20.971
4	/20200830050917-CreateEnumTransferState	2022-08-22 08:32:20.977
5	/20200830050921-CreateEnumTransferType	2022-08-22 08:32:20.985
6	/20200901213040-CreateEnumEntityTrustReqType	2022-08-22 08:32:20.993
7	/20200901213111-CreateEnumEntityTrustType	2022-08-22 08:32:21.001
8	/20200901213222-CreateEnumEntityTrustStateType	2022-08-22 08:32:21.009
9	/20200901213241-CreateEnumTransferStateChangeApprovalType	2022-08-22 08:32:21.016
10	/20200901213252-CreateEnumWalletEventType	2022-08-22 08:32:21.023
11	/20200901213253-CreateTableToken	2022-08-22 08:32:21.038
12	/20200901213254-CreateTableTransfer	2022-08-22 08:32:21.053
13	/20200901222910-CreateTableWallet-Event	2022-08-22 08:32:21.067
14	/20200902014751-CreateTableEntity-Trust	2022-08-22 08:32:21.083
15	/20200902014758-CreateTableEntity-Trust-Log	2022-08-22 08:32:21.108
16	/20200902014805-CreateTableTransfer-Audit	2022-08-22 08:32:21.127
17	/20200912104451-FixAutoIncrementBug	2022-08-22 08:32:21.134
18	/20200916235257-CreateTableApi-Key	2022-08-22 08:32:21.161
19	/20200917183542-CreateTableWallet	2022-08-22 08:32:21.186
20	/20201127234338-AllowNullPasswordWallet	2022-08-22 08:32:21.199
21	/20201209064928-RenameTableEntityTrust	2022-08-22 08:32:21.211
22	/20201209065300-RenameTableEntityTrustLog	2022-08-22 08:32:21.217
23	/20210211020241-AddDefaultIdTransactionTable	2022-08-22 08:32:21.225
24	/20210211020257-AddDefaultIdTransferTable	2022-08-22 08:32:21.234
25	/20210211020301-AddDefaultIdTokenTable	2022-08-22 08:32:21.242
26	/20210211020304-AddDefaultIdWalletTable	2022-08-22 08:32:21.249
27	/20210211020331-AddDefaultIdApiKeyTable	2022-08-22 08:32:21.257
28	/20210211020340-AddDefaultIdTransferAuditTable	2022-08-22 08:32:21.263
29	/20210211020347-AddDefaultIdWalletEventTable	2022-08-22 08:32:21.269
30	/20210211020352-AddDefaultIdWalletTrustTable	2022-08-22 08:32:21.277
31	/20210211020356-AddDefaultIdWalletTrustLogTable	2022-08-22 08:32:21.285
32	/20210226210059-AddTransferPendingIdIndex	2022-08-22 08:32:21.294
33	/20210226234313-AddUniqueConstraintWalletName	2022-08-22 08:32:21.302
34	/20210304014730-AddUniqueConstraintCaptureId	2022-08-22 08:32:21.311
35	/20210401005831-AddClaimBoolean	2022-08-22 08:32:21.334
36	/20210401015411-AddColClaimBooleanTransferTable	2022-08-22 08:32:21.34
37	/20210419015057-AddColClaimBooleanTransactionTable	2022-08-22 08:32:21.345
38	/20210818020849-CreateIndexTokenWalletId	2022-08-22 08:32:21.354
39	/20210818210436-TransferActiveDefault	2022-08-22 08:32:21.361
40	/20210818211159-WalletTrustActiveDefault	2022-08-22 08:32:21.367
41	/20210818213054-TransferClaimNotNull	2022-08-22 08:32:21.374
42	/20210819001907-TransactionClaimDefault	2022-08-22 08:32:21.384
43	/20211007223144-AddCreatedAtWallet	2022-08-22 08:32:21.41
\.


--
-- Data for Name: token; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.token (id, capture_id, wallet_id, transfer_pending, transfer_pending_id, created_at, updated_at, claim) FROM stdin;
\.


--
-- Data for Name: transaction; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.transaction (id, token_id, transfer_id, source_wallet_id, destination_wallet_id, processed_at, claim) FROM stdin;
\.


--
-- Data for Name: transfer; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.transfer (id, originator_wallet_id, source_wallet_id, destination_wallet_id, type, parameters, state, created_at, closed_at, active, claim) FROM stdin;
\.


--
-- Data for Name: transfer_audit; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.transfer_audit (id, transfer_id, new_state, processed_at, approval_type, entity_trust_id) FROM stdin;
\.


--
-- Data for Name: wallet; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.wallet (id, name, password, salt, logo_url, created_at) FROM stdin;
bd1f1d1c-84c3-4775-85e8-c146b7ad2549	treebytree	7fc5b97521d1c857262c68cdc3bd6b5169ea2f39f2b994cbab12b353d6235d06dbbe59ff4a12f51b32a506c18c4a08db89209c8cdcc862481c52d88a484f29f1	yNaafoUXbjADJ1Zf55n5DCLDhE6od4XVFvIdVpiipro=	\N	2022-08-22 09:33:43.698305
548bfb66-160b-489e-967b-553c602d644f	claimed	\N	\N	\N	2022-08-22 09:37:33.733291
6fb21e74-eb2c-4985-9ebf-28fd7bb03708	free	\N	\N	\N	2022-08-22 09:38:09.187817
\.


--
-- Data for Name: wallet_event; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.wallet_event (id, wallet_id, type, created_at) FROM stdin;
\.


--
-- Data for Name: wallet_trust; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.wallet_trust (id, actor_wallet_id, target_wallet_id, type, originator_wallet_id, request_type, state, created_at, updated_at, active) FROM stdin;
b3464489-cea2-4bed-b447-328f2590306e	bd1f1d1c-84c3-4775-85e8-c146b7ad2549	548bfb66-160b-489e-967b-553c602d644f	manage	bd1f1d1c-84c3-4775-85e8-c146b7ad2549	manage	trusted	2022-08-22 09:37:33.736703	2022-08-22 09:37:33.736703	t
558d6d70-64c1-4564-9058-30324f743f2b	bd1f1d1c-84c3-4775-85e8-c146b7ad2549	6fb21e74-eb2c-4985-9ebf-28fd7bb03708	manage	bd1f1d1c-84c3-4775-85e8-c146b7ad2549	manage	trusted	2022-08-22 09:38:09.191035	2022-08-22 09:38:09.191035	t
\.


--
-- Data for Name: wallet_trust_log; Type: TABLE DATA; Schema: public; Owner: wallet_user
--

COPY public.wallet_trust_log (id, wallet_trust_id, actor_wallet_id, target_wallet_id, type, originator_wallet_id, request_type, state, created_at, updated_at, logged_at, active) FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wallet_user
--

SELECT pg_catalog.setval('public.migrations_id_seq', 66, true);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);


--
-- Name: wallet_trust_log entity_trust_log_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.wallet_trust_log
    ADD CONSTRAINT entity_trust_log_pkey PRIMARY KEY (id);


--
-- Name: wallet_trust entity_trust_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.wallet_trust
    ADD CONSTRAINT entity_trust_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: token token_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_pkey PRIMARY KEY (id);


--
-- Name: transaction transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.transaction
    ADD CONSTRAINT transaction_pkey PRIMARY KEY (id);


--
-- Name: transfer_audit transfer_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.transfer_audit
    ADD CONSTRAINT transfer_audit_pkey PRIMARY KEY (id);


--
-- Name: transfer transfer_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.transfer
    ADD CONSTRAINT transfer_pkey PRIMARY KEY (id);


--
-- Name: wallet_event wallet_event_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.wallet_event
    ADD CONSTRAINT wallet_event_pkey PRIMARY KEY (id);


--
-- Name: wallet wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: wallet_user
--

ALTER TABLE ONLY public.wallet
    ADD CONSTRAINT wallet_pkey PRIMARY KEY (id);


--
-- Name: capture_id_idx; Type: INDEX; Schema: public; Owner: wallet_user
--

CREATE UNIQUE INDEX capture_id_idx ON public.token USING btree (capture_id);


--
-- Name: token_transfer_pending_id_idx; Type: INDEX; Schema: public; Owner: wallet_user
--

CREATE INDEX token_transfer_pending_id_idx ON public.token USING btree (transfer_pending_id);


--
-- Name: token_wallet_id_idx; Type: INDEX; Schema: public; Owner: wallet_user
--

CREATE INDEX token_wallet_id_idx ON public.token USING btree (wallet_id);


--
-- Name: wallet_name_idx; Type: INDEX; Schema: public; Owner: wallet_user
--

CREATE UNIQUE INDEX wallet_name_idx ON public.wallet USING btree (name);


--
-- PostgreSQL database dump complete
--


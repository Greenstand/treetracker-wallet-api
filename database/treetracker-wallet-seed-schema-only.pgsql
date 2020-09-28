--
-- PostgreSQL database dump
--

-- Dumped from database version 11.9
-- Dumped by pg_dump version 11.8 (Ubuntu 11.8-1.pgdg18.04+1)

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

SET default_tablespace = '';

SET default_with_oids = false;



--
-- Name: region; Type: TABLE; Schema: public; Owner: treetracker
--

CREATE TABLE public.region (
    id integer NOT NULL,
    type_id integer,
    name character varying,
    metadata jsonb
);



--
-- Name: tree_region; Type: TABLE; Schema: public; Owner: treetracker
--

CREATE TABLE public.tree_region (
    id integer NOT NULL,
    tree_id integer,
    zoom_level integer,
    region_id integer
);

--
-- Name: trees; Type: TABLE; Schema: public; Owner: treetracker
--

CREATE TABLE public.trees (
    id integer NOT NULL,
    time_created timestamp without time zone NOT NULL,
    time_updated timestamp without time zone NOT NULL,
    missing boolean DEFAULT false,
    priority boolean DEFAULT false,
    cause_of_death_id integer,
    planter_id integer,
    primary_location_id integer,
    settings_id integer,
    override_settings_id integer,
    dead integer DEFAULT 0 NOT NULL,
    photo_id integer,
    image_url character varying,
    certificate_id integer,
    lat numeric,
    lon numeric,
    gps_accuracy integer,
    active boolean DEFAULT true,
    planter_photo_url character varying,
    planter_identifier character varying,
    device_id integer,
    sequence integer,
    note character varying,
    verified boolean DEFAULT false NOT NULL,
    uuid character varying,
    approved boolean DEFAULT false NOT NULL,
    status character varying DEFAULT 'planted'::character varying NOT NULL,
    cluster_regions_assigned boolean DEFAULT false NOT NULL,
    species_id integer,
    planting_organization_id integer,
    payment_id integer,
    contract_id integer,
    token_issued boolean DEFAULT false NOT NULL,
    species character varying,
    matching_hash character varying,
    device_identifier character varying,
    images jsonb,
    domain_specific_data jsonb,
    image_url_backup character varying
);



--
-- Name: entity; Type: TABLE; Schema: public; Owner: treetracker
--

CREATE TABLE public.entity (
    id integer NOT NULL,
    type character varying,
    name character varying,
    first_name character varying,
    last_name character varying,
    email character varying,
    phone character varying,
    pwd_reset_required boolean DEFAULT false,
    website character varying,
    wallet character varying,
    password character varying,
    salt character varying,
    active_contract_id integer,
    offering_pay_to_plant boolean DEFAULT false NOT NULL,
    tree_validation_contract_id integer,
    logo_url character varying
);






--
-- Name: entity_id_seq; Type: SEQUENCE; Schema: public; Owner: treetracker
--

CREATE SEQUENCE public.entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: entity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: treetracker
--

ALTER SEQUENCE public.entity_id_seq OWNED BY public.entity.id;


--
-- Name: entity_role; Type: TABLE; Schema: public; Owner: treetracker
--

CREATE TABLE public.entity_role (
    id integer NOT NULL,
    entity_id integer,
    role_name character varying,
    enabled boolean
);



--
-- Name: entity_role_id_seq; Type: SEQUENCE; Schema: public; Owner: treetracker
--

CREATE SEQUENCE public.entity_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: entity_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: treetracker
--

ALTER SEQUENCE public.entity_role_id_seq OWNED BY public.entity_role.id;


--
-- Name: region_id_seq; Type: SEQUENCE; Schema: public; Owner: treetracker
--

CREATE SEQUENCE public.region_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: treetracker
--

ALTER SEQUENCE public.region_id_seq OWNED BY public.region.id;


--
-- Name: tree_region_id_seq; Type: SEQUENCE; Schema: public; Owner: treetracker
--

CREATE SEQUENCE public.tree_region_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: tree_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: treetracker
--

ALTER SEQUENCE public.tree_region_id_seq OWNED BY public.tree_region.id;


--
-- Name: entity id; Type: DEFAULT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.entity ALTER COLUMN id SET DEFAULT nextval('public.entity_id_seq'::regclass);


--
-- Name: entity_role id; Type: DEFAULT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.entity_role ALTER COLUMN id SET DEFAULT nextval('public.entity_role_id_seq'::regclass);


--
-- Name: region id; Type: DEFAULT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.region ALTER COLUMN id SET DEFAULT nextval('public.region_id_seq'::regclass);


--
-- Name: tree_region id; Type: DEFAULT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.tree_region ALTER COLUMN id SET DEFAULT nextval('public.tree_region_id_seq'::regclass);


--
-- Name: entity entity_pkey; Type: CONSTRAINT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.entity
    ADD CONSTRAINT entity_pkey PRIMARY KEY (id);


--
-- Name: entity_role entity_role_pkey; Type: CONSTRAINT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.entity_role
    ADD CONSTRAINT entity_role_pkey PRIMARY KEY (id);


--
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (id);


--
-- Name: tree_region tree_region_pkey; Type: CONSTRAINT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.tree_region
    ADD CONSTRAINT tree_region_pkey PRIMARY KEY (id);


--
-- Name: trees trees_id_pkey; Type: CONSTRAINT; Schema: public; Owner: treetracker
--

ALTER TABLE ONLY public.trees
    ADD CONSTRAINT trees_id_pkey PRIMARY KEY (id);


--
-- Name: certificate_id_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX certificate_id_idx ON public.trees USING btree (certificate_id);


--
-- Name: entity_wallet_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE UNIQUE INDEX entity_wallet_idx ON public.entity USING btree (wallet);


--
-- Name: tree_region_tree_id_zoom_level_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE UNIQUE INDEX tree_region_tree_id_zoom_level_idx ON public.tree_region USING btree (tree_id, zoom_level);


--
-- Name: tree_region_zoom_level_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX tree_region_zoom_level_idx ON public.tree_region USING btree (zoom_level);


--
-- Name: trees_active_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_active_idx ON public.trees USING btree (active);


--
-- Name: trees_cause_of_death_id; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_cause_of_death_id ON public.trees USING btree (cause_of_death_id);


--
-- Name: trees_estimated_geometric_location_index_gist; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_estimated_geometric_location_index_gist ON public.trees USING gist (estimated_geometric_location);


--
-- Name: trees_expr_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_expr_idx ON public.trees USING btree ((1)) WHERE active;


--
-- Name: trees_override_settings_id; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_override_settings_id ON public.trees USING btree (override_settings_id);


--
-- Name: trees_payment_id_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_payment_id_idx ON public.trees USING btree (payment_id);


--
-- Name: trees_planter_id_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_planter_id_idx ON public.trees USING btree (planter_id);


--
-- Name: trees_planting_organization_id_idx; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_planting_organization_id_idx ON public.trees USING btree (planting_organization_id);


--
-- Name: trees_primary_location_id; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_primary_location_id ON public.trees USING btree (primary_location_id);


--
-- Name: trees_settings_id; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_settings_id ON public.trees USING btree (settings_id);


--
-- Name: trees_user_id; Type: INDEX; Schema: public; Owner: treetracker
--

CREATE INDEX trees_user_id ON public.trees USING btree (planter_id);

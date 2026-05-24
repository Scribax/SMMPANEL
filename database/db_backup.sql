--
-- PostgreSQL database dump
--

\restrict xum5xtRToZfzCoLxIHp1bCIkZHBKcv6NNZF9F67YGCD0u7tTjeQoebyePdstpDs

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: boostins
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO boostins;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: coupons; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    discount_type character varying(50) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_value numeric(10,2) DEFAULT 0.00 NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.coupons OWNER TO boostins;

--
-- Name: deposits; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.deposits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    preference_id character varying(255),
    external_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.deposits OWNER TO boostins;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    service_id uuid,
    link character varying(500) NOT NULL,
    quantity integer NOT NULL,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    coupon_id uuid,
    provider_order_id character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    start_count integer,
    remains integer,
    email character varying(255),
    notes text,
    refill_requested_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO boostins;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    user_id uuid,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'BRL'::character varying NOT NULL,
    payment_method character varying(100),
    payment_provider character varying(100) DEFAULT 'mercadopago'::character varying NOT NULL,
    external_id character varying(255),
    preference_id character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO boostins;

--
-- Name: providers; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    api_url character varying(500) NOT NULL,
    api_key_enc text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.providers OWNER TO boostins;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    reward_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referrals OWNER TO boostins;

--
-- Name: services; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid,
    provider_service_id integer NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    platform character varying(100) NOT NULL,
    description text,
    price_per_unit numeric(10,6) NOT NULL,
    min_quantity integer DEFAULT 100 NOT NULL,
    max_quantity integer DEFAULT 10000 NOT NULL,
    delivery_speed character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.services OWNER TO boostins;

--
-- Name: users; Type: TABLE; Schema: public; Owner: boostins
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    referral_code character varying(50),
    referred_by uuid,
    balance numeric(10,2) DEFAULT 0.00 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO boostins;

--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.coupons (id, code, discount_type, discount_value, min_order_value, max_uses, used_count, expires_at, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: deposits; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.deposits (id, user_id, amount, status, preference_id, external_id, created_at, updated_at) FROM stdin;
4870369b-5ad9-4674-904b-62cddb2638f9	28517ffc-43bb-4674-a10d-8c86bd8feab3	100.00	pending	305616995-b4fe36ba-b68d-469e-8fd7-b9af217e5b99	\N	2026-05-20 12:53:05.947645+00	2026-05-20 12:53:05.947645+00
783d84c7-c009-4386-859f-a22a4e382ed4	28517ffc-43bb-4674-a10d-8c86bd8feab3	100.00	pending	305616995-1632ad80-944c-406c-bf00-28f81acef797	\N	2026-05-20 12:53:41.473602+00	2026-05-20 12:53:41.473602+00
36e4377a-09e3-45c5-8938-52a2c2ea80e5	28517ffc-43bb-4674-a10d-8c86bd8feab3	1000.00	pending	305616995-3cd7ec21-47b1-4e31-915c-52bd9c5112e0	\N	2026-05-20 12:54:29.276565+00	2026-05-20 12:54:29.276565+00
35e88446-61a9-45f0-ad46-a1a3384b151c	28517ffc-43bb-4674-a10d-8c86bd8feab3	100.00	pending	305616995-05b462ef-b63d-4e50-b0d4-cb5ca40f5066	\N	2026-05-20 12:57:45.193147+00	2026-05-20 12:57:45.193147+00
e30d1798-c2a8-442f-a846-abfbfd40b585	28517ffc-43bb-4674-a10d-8c86bd8feab3	100.00	approved	305616995-744f438b-b085-4381-89b2-01ca6c2d43c9	160137165636	2026-05-20 13:08:26.264914+00	2026-05-20 13:09:24.231315+00
70513251-a608-4fda-b98f-7d7e5853602d	28517ffc-43bb-4674-a10d-8c86bd8feab3	100.00	approved	305616995-00b534e1-a962-4937-9645-096a54e828fe	160138673772	2026-05-20 13:20:02.416803+00	2026-05-20 13:21:17.388743+00
9f642e7f-5b1a-4609-9c0a-75523d74b9aa	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	5000.00	pending	305616995-959075e2-626f-4c3a-8999-ce352b8aa08f	\N	2026-05-20 20:09:04.174596+00	2026-05-20 20:09:04.174596+00
dd4b450f-61a0-42f3-ab45-fd7e21662a4d	a0d375d0-13a7-4ba9-9a64-b196a39afc8b	500.00	pending	305616995-a64f0de6-2421-4168-a664-4900488a1d8f	\N	2026-05-21 07:14:05.688759+00	2026-05-21 07:14:05.688759+00
b291d290-5874-4c27-b9a2-56824a8d1e05	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	500.00	pending	305616995-a71f5b83-3fc1-4c6b-bb6e-2c0e389d8ad2	\N	2026-05-21 11:02:23.810538+00	2026-05-21 11:02:23.810538+00
a1d88876-68cf-4c62-8219-1f67cd96a9c4	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	500.00	pending	305616995-3da37540-0611-4c5e-ae0d-6fb64e6f53b0	\N	2026-05-22 00:13:20.451637+00	2026-05-22 00:13:20.451637+00
980b3e8b-5f18-483e-b3d3-93250e4fda33	90022340-a3cb-4e3c-bdce-60b84aedf17f	10000.00	pending	305616995-125617c8-b30e-4a77-a927-0a0e18c85bd2	\N	2026-05-22 02:01:26.934814+00	2026-05-22 02:01:26.934814+00
64f761e4-8c98-4e15-9464-168949bb15a6	90022340-a3cb-4e3c-bdce-60b84aedf17f	8000.00	approved	305616995-1e62b4fd-5d75-4258-a202-32d704dfc35e	159685411459	2026-05-22 02:08:03.633593+00	2026-05-22 02:08:16.063147+00
6fd1a5e6-1cd2-4839-85bb-5c1260812b7a	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	500.00	pending	305616995-03a5664a-d57d-4543-8ae8-17831184b6a5	\N	2026-05-22 02:56:46.837479+00	2026-05-22 02:56:46.837479+00
cf216bcf-2f2c-4037-9130-77427f35a7d9	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	500.00	pending	305616995-aca65b4a-e83e-4ad2-a7ec-5a20472c28a0	\N	2026-05-22 02:57:07.998389+00	2026-05-22 02:57:07.998389+00
ab77cea6-86fa-4c53-8e24-fc41c0765de2	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	500.00	pending	305616995-1eb08cae-0686-4609-a887-9e4e00b34940	\N	2026-05-22 04:06:32.017541+00	2026-05-22 04:06:32.017541+00
b8bbe903-1d24-4849-abc6-48dd1fbe5d8a	90022340-a3cb-4e3c-bdce-60b84aedf17f	2000.00	approved	305616995-96838f8c-af1a-483f-a698-bfd9f407da5a	159707502355	2026-05-22 10:21:11.785661+00	2026-05-22 10:21:23.83773+00
a7ea2165-e4e7-4af0-8f3c-2cc1be186adc	90022340-a3cb-4e3c-bdce-60b84aedf17f	6000.00	approved	305616995-54dee17a-336f-40ed-907f-a1444499c468	160019222689	2026-05-24 14:29:53.825982+00	2026-05-24 14:30:07.23483+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.orders (id, user_id, service_id, link, quantity, price, original_price, coupon_id, provider_order_id, status, start_count, remains, email, notes, refill_requested_at, created_at, updated_at) FROM stdin;
ae238a4d-b894-4eb2-9919-af85ba1a543c	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	@patito	100	0.25	0.25	\N	\N	failed	\N	\N	francodemartosutn@gmail.com	Error: getaddrinfo ENOTFOUND provider.example.com	\N	2026-05-20 13:22:34.270022+00	2026-05-20 13:22:34.332654+00
f09eb576-4bfa-4230-a5ec-d8ee8071307a	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/magic_nameless/	100	0.25	0.25	\N	\N	failed	\N	\N	francodemartosutn@gmail.com	Error: getaddrinfo ENOTFOUND provider.example.com	\N	2026-05-20 13:39:50.426459+00	2026-05-20 13:39:50.568379+00
923dacde-9703-46b9-bc2e-cb304db8ec34	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/p/DYmiQaPg-im/?igsh=NXJ3aDllM2ZjaWY2	250	125.00	125.00	\N	21497464	failed	0	250	pablomasilla855@gmail.com	\N	\N	2026-05-22 14:28:29.585146+00	2026-05-22 14:30:01.004195+00
6279bf3f-bb27-419b-a67a-64dad62b9b7f	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/lanzawebar/	100	0.25	0.25	\N	\N	failed	\N	\N	francodemartosutn@gmail.com	Error: Provider error: Not enough funds on balance	\N	2026-05-20 19:34:25.47044+00	2026-05-20 19:34:26.159857+00
b3e61b00-21c4-4a94-8869-3b2ec5520406	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/lanzawebar/	100	0.25	0.25	\N	\N	failed	\N	\N	francodemartosutn@gmail.com	Error: Provider error: Not enough funds on balance	\N	2026-05-20 19:40:50.497365+00	2026-05-20 19:40:51.189396+00
7a9a221d-efa4-40c0-bc6e-3900b6bb68b5	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/lanzawebar/	100	0.25	0.25	\N	\N	failed	\N	\N	francodemartosutn@gmail.com	Error: Provider error: Not enough funds on balance	\N	2026-05-20 19:44:10.906444+00	2026-05-20 19:44:11.585388+00
c604087f-cd4f-403e-b43a-c006c49d8db8	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/lanzawebar/	100	0.25	0.25	\N	\N	processing	\N	\N	francodemartosutn@gmail.com	Error: Provider error: Not enough funds on balance	\N	2026-05-20 20:01:03.992152+00	2026-05-20 20:18:04.749723+00
290e24f0-819b-4959-99e1-7de40295cee3	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/lanzawebar/	100	0.25	0.25	\N	2723607	failed	0	100	francodemartosutn@gmail.com	\N	\N	2026-05-20 13:46:02.27899+00	2026-05-20 23:00:00.818517+00
b5e35488-2e4d-4264-89c4-7a931d71a159	a0d375d0-13a7-4ba9-9a64-b196a39afc8b	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/dfdfs/	100	0.25	0.25	\N	\N	awaiting_payment	\N	\N	dfsfds@gmail.com	\N	\N	2026-05-21 06:58:13.569642+00	2026-05-21 06:58:13.569642+00
d0e6d041-efd7-4965-b2ec-e396cd25b5d1	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/reel/DYn7nsyg1iK/?igsh=MWwzNm1iOXZqYnNmZQ==	1000	500.00	500.00	\N	21496793	completed	56	0	pablomasilla855@gmail.com	\N	\N	2026-05-22 12:14:58.987193+00	2026-05-22 12:17:01.676432+00
dbffc38f-f311-436a-8fe6-28ba4134772f	28517ffc-43bb-4674-a10d-8c86bd8feab3	c6f44651-3167-4b07-8297-d980477c1b78	https://dash.cloudflare.com/8b6ba5b3b23a00560797a7198bd703fb/followarg.com/caching/configuration	100	50.00	50.00	\N	21488844	failed	0	100	admin@boostins.com	\N	\N	2026-05-21 10:05:29.43922+00	2026-05-21 10:07:00.765+00
6e3a91ba-0b02-4d71-9b3f-92e20ec9c1f9	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/Lanzawebar/	100	0.25	0.25	\N	\N	cancelled	\N	\N	francodemartosutn@gmail.com	\N	\N	2026-05-20 20:19:28.037437+00	2026-05-21 11:02:16.218789+00
282c725f-2cc2-41e7-a3f6-a8e16d5dd209	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/reel/DYov972u69j/?igsh=eXBicnJqcjJ5NW5r	1000	500.00	500.00	\N	21496791	completed	9	0	pablomasilla855@gmail.com	\N	\N	2026-05-22 12:14:28.67614+00	2026-05-22 12:17:01.687019+00
44dc52dc-a035-4de5-a4ac-5a752b36de4e	28517ffc-43bb-4674-a10d-8c86bd8feab3	07601ca6-c64c-48b5-8b29-209f03fb56b6	https://www.instagram.com/ulimv2/	5000	20250.00	20250.00	\N	21504194	completed	1463	0	admin@boostins.com	\N	\N	2026-05-23 21:21:43.644248+00	2026-05-23 22:02:01.370669+00
0f17e13d-2f14-4ce6-a73d-9d8922219784	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/p/DYmiQaPg-im/?igsh=NXJ3aDllM2ZjaWY2	250	125.00	125.00	\N	21496960	failed	0	250	pablomasilla855@gmail.com	\N	\N	2026-05-22 12:50:09.034418+00	2026-05-22 12:51:00.950545+00
af0aeb34-7a62-4055-ae0e-73d1d46e5046	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/p/DYqTreygDe2/?igsh=MTExamZpbzdzajVmYQ==	100	50.00	50.00	\N	21500134	failed	0	100	pablomasilla855@gmail.com	\N	\N	2026-05-23 02:52:37.029347+00	2026-05-23 02:54:00.747386+00
eec60718-77d0-4161-9480-6245e62cf6a9	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/reel/DYprhqzR711/?igsh=MXFoM3Vjczl3eHNkMA==	250	125.00	125.00	\N	21498638	completed	10	0	pablomasilla855@gmail.com	\N	\N	2026-05-22 18:59:43.286085+00	2026-05-22 19:03:01.941863+00
9fe2a1c9-37c2-4bdc-bd02-7c4edaa9a1f9	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/p/DYqTreygDe2/?igsh=MTExamZpbzdzajVmYQ==	100	50.00	50.00	\N	21502820	failed	0	100	pablomasilla855@gmail.com	\N	\N	2026-05-23 15:05:51.514032+00	2026-05-23 15:07:00.836267+00
030a163c-77af-4f6c-9480-700114d3c7d6	90022340-a3cb-4e3c-bdce-60b84aedf17f	0f94921e-9d0c-4eed-8f4e-2326bb7e7ae9	https://www.instagram.com/mentorenventas/	10000	7875.00	7875.00	\N	21493552	completed	18445	0	pablomasilla855@gmail.com	\N	2026-05-24 00:42:46.582369+00	2026-05-22 02:09:27.80426+00	2026-05-24 00:43:00.925112+00
ca11bb07-a817-49c0-8943-7c3e9867c087	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/p/DYqTreygDe2/?igsh=MTExamZpbzdzajVmYQ==	100	50.00	50.00	\N	21501601	failed	0	100	pablomasilla855@gmail.com	\N	\N	2026-05-23 10:11:23.782834+00	2026-05-23 10:20:01.311893+00
316e2606-2a98-4fb5-92e4-b62361eef1d3	90022340-a3cb-4e3c-bdce-60b84aedf17f	c6f44651-3167-4b07-8297-d980477c1b78	https://www.instagram.com/reel/DYs5pvSg8tu/?igsh=MXF1MzEyeGN1ejFxOQ==	100	50.00	50.00	\N	21507262	completed	26	0	pablomasilla855@gmail.com	\N	\N	2026-05-24 14:25:32.910287+00	2026-05-24 14:28:01.901021+00
4ccc39d1-3d22-482f-9d67-6a64c3b5f8db	28517ffc-43bb-4674-a10d-8c86bd8feab3	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/lanzawebar/	100	0.25	0.25	\N	2723609	processing	0	0	francodemartosutn@gmail.com	\N	2026-05-24 18:55:30.211246+00	2026-05-20 13:49:16.487973+00	2026-05-24 18:55:30.211246+00
a1925bd7-a802-4813-8013-945a24acf532	90022340-a3cb-4e3c-bdce-60b84aedf17f	eccecf12-3d6c-4952-9926-ebb9e4096087	https://www.instagram.com/mentorenventas/	1000	900.00	900.00	\N	21496783	partial	28917	436	pablomasilla855@gmail.com	\N	\N	2026-05-22 12:13:24.034356+00	2026-05-24 19:01:01.267458+00
ab6e5c2e-bd12-4526-a684-0631d9f5de5c	28517ffc-43bb-4674-a10d-8c86bd8feab3	0f94921e-9d0c-4eed-8f4e-2326bb7e7ae9	https://www.instagram.com/ulimv2/	5000	3937.50	3937.50	\N	21504176	completed	1463	0	admin@boostins.com	\N	\N	2026-05-23 21:15:53.027325+00	2026-05-24 07:55:01.11435+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.payments (id, order_id, user_id, amount, currency, payment_method, payment_provider, external_id, preference_id, status, metadata, created_at, updated_at) FROM stdin;
9a6f8a04-64cf-4e9e-b121-a4a60ac86f7d	6e3a91ba-0b02-4d71-9b3f-92e20ec9c1f9	4b21eac5-0f14-4cc6-b4b9-280c860c2c74	0.25	BRL	\N	mercadopago	\N	305616995-ad69e3e3-3d90-4034-aea3-d9eb4f3e9fea	pending	\N	2026-05-20 20:19:28.83685+00	2026-05-20 20:19:28.83685+00
91187882-4138-4e6d-9635-b7b6ddbf6c95	b5e35488-2e4d-4264-89c4-7a931d71a159	a0d375d0-13a7-4ba9-9a64-b196a39afc8b	0.25	BRL	\N	mercadopago	\N	305616995-662bd025-8d1f-4527-a616-caa896069364	pending	\N	2026-05-21 06:58:14.26528+00	2026-05-21 06:58:14.26528+00
\.


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.providers (id, name, api_url, api_key_enc, is_active, created_at, updated_at) FROM stdin;
bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	SMMKings	https://smmkings.com/api/v2	U2FsdGVkX1/Cy8OkEyry3bRZgv3ZOThjsU9HQpvUMGF0I4OGRvk4N/pLLjcFMZo1ghitQsagKmbUcfJC9r95Rg==	t	2026-05-21 08:58:14.138697+00	2026-05-21 08:58:14.138697+00
00000000-0000-0000-0000-000000000001	Default Provider	https://smmengineer.com/api/v2	U2FsdGVkX1+cFLwW7B6bo1rEo81hWSMbgPY6XXf3eceGKjHtYAT3xBKQB1UkIQWETDKhxRtGGL0HFFstFa5Ukg==	f	2026-05-20 11:44:05.197114+00	2026-05-21 09:01:26.681392+00
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.referrals (id, referrer_id, referred_id, reward_amount, status, created_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.services (id, provider_id, provider_service_id, name, category, platform, description, price_per_unit, min_quantity, max_quantity, delivery_speed, is_active, sort_order, created_at, updated_at) FROM stdin;
eccecf12-3d6c-4952-9926-ebb9e4096087	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	4973	Instagram Followers – Real	followers	instagram	Seguidores reales y mixtos. Max 250K. Sin reposición.	0.900000	100	250000	Instantáneo	t	2	2026-05-20 11:44:05.198465+00	2026-05-21 09:15:59.610903+00
49526775-a48a-4148-b175-cd1c290d265f	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	6504	Instagram Likes – Premium	likes	instagram	Likes premium con reposición automática.	3.000000	100	50000000	0-2 hours	t	0	2026-05-21 07:34:48.576888+00	2026-05-21 09:21:57.170053+00
b83bedd4-940e-4321-a8f8-fbcd54d292b4	00000000-0000-0000-0000-000000000001	23958	Instagram Followers – Premium	followers	instagram	Seguidores reales con reposición automática 30 días. Si caen, se reponen gratis.	1.575000	10	100000	Instantáneo	f	2	2026-05-20 11:44:05.198465+00	2026-05-21 09:14:21.833489+00
0fe15371-00f6-4431-b20a-7a2af7f3a7bd	00000000-0000-0000-0000-000000000001	6	TikTok Views – Viral Boost	views	tiktok	Skyrocket your TikTok view count to hit the For You page.	0.000150	1000	500000	Instant	f	6	2026-05-20 11:44:05.198465+00	2026-05-21 07:57:11.262222+00
5a1b98d5-d788-47ed-ab06-1bc1b3a51510	00000000-0000-0000-0000-000000000001	7	YouTube Views – High Retention	views	youtube	High-retention YouTube views (60%+ watch time).	0.004000	500	50000	1-3 days	f	7	2026-05-20 11:44:05.198465+00	2026-05-21 07:57:11.262222+00
57a77135-7e8b-4f26-b165-dfb13eed45ff	00000000-0000-0000-0000-000000000001	23193	Instagram Followers – Argentina	followers	instagram	Seguidores argentinos reales. Ideal para cuentas locales.	1.425000	100	100000	0-3 hours	f	0	2026-05-21 07:34:48.513031+00	2026-05-21 07:57:11.262222+00
b65a712d-c0a5-479d-894a-a50f20acf712	00000000-0000-0000-0000-000000000001	23962	Instagram Followers – Lifetime	followers	instagram	Seguidores reales con garantía de reposición de por vida. La mejor calidad disponible.	1.987500	10	100000	Instantáneo	f	0	2026-05-21 07:43:38.94933+00	2026-05-21 09:14:21.833489+00
4fb7cc56-9621-4fd0-8e95-635ea5dae0b7	00000000-0000-0000-0000-000000000001	20159	TikTok Comments – Random	comments	tiktok	Comentarios aleatorios en videos de TikTok.	3.712500	1	50000	0-2 hours	f	0	2026-05-21 07:34:48.750061+00	2026-05-21 07:57:11.262222+00
dce9b966-067b-4e2c-b2eb-aa7e50649a28	00000000-0000-0000-0000-000000000001	22884	Instagram Comments – Random	comments	instagram	Comentarios aleatorios positivos en español.	0.937500	10	100000	0-2 hours	f	0	2026-05-21 07:34:48.637118+00	2026-05-21 07:57:11.262222+00
dc892272-8829-43c4-870b-9105a89f0ffa	00000000-0000-0000-0000-000000000001	20877	TikTok Followers – Real	followers	tiktok	Grow your TikTok with real, engaged followers.	4.950000	50	100000	1-2 days	f	5	2026-05-20 11:44:05.198465+00	2026-05-21 07:57:11.262222+00
6b0e2724-9f49-4289-bb4f-bbb3078b4b4d	00000000-0000-0000-0000-000000000001	12203	YouTube Comments – Random	comments	youtube	Comentarios aleatorios en videos de YouTube.	239.512500	5	1000	0-3 hours	f	0	2026-05-21 07:34:48.819304+00	2026-05-21 07:57:11.262222+00
f06ea7da-9167-4726-8684-d1c188856855	00000000-0000-0000-0000-000000000001	23913	YouTube Views – Fast	views	youtube	Vistas YouTube de alta velocidad vía ads externos. Hasta 175K/día.	8.062500	100	10000000	0-3 hours	f	0	2026-05-21 07:34:48.77468+00	2026-05-21 07:57:11.262222+00
d25726c1-e500-4603-8808-587a4aee66d8	00000000-0000-0000-0000-000000000001	23944	YouTube Likes – Fast	likes	youtube	Likes para videos de YouTube con reposición 365 días.	4.687500	5	50000	0-15 min	f	0	2026-05-21 07:34:48.78515+00	2026-05-21 07:57:11.262222+00
6683bc08-f115-4b23-bff2-75cea13fc540	00000000-0000-0000-0000-000000000001	23972	YouTube Likes – Premium	likes	youtube	Likes YouTube de alta calidad con reposición 30 días.	12.000000	10	5000	0-15 min	f	0	2026-05-21 07:34:48.79708+00	2026-05-21 07:57:11.262222+00
0f94921e-9d0c-4eed-8f4e-2326bb7e7ae9	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	5063	Instagram Followers – Básico	followers	instagram	Seguidores mixtos de entrega instantánea. Sin reposición.	0.787500	100	50000	Instantáneo	t	1	2026-05-21 09:06:21.826084+00	2026-05-21 09:07:49.961984+00
271e4f89-5e1b-4bcb-9ebc-7fb1e9b1f40e	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	3759	Instagram Followers – Premium 30d	followers	instagram	Seguidores HQ con reposición automática 30 días.	3.375000	100	50000	Instantáneo	t	3	2026-05-21 09:06:21.840979+00	2026-05-21 09:07:49.97534+00
98b0e89d-5501-4822-89c8-0a32f8451441	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	7178	Instagram Followers – Max 1M	followers	instagram	Seguidores HQ hasta 1 millón con reposición 30 días.	3.937500	100	1000000	Instantáneo	t	5	2026-05-21 09:06:21.846835+00	2026-05-21 09:07:49.981172+00
234b18bc-b4c3-4749-a747-97566dd634d1	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	7176	YouTube Subscribers	followers	youtube	Suscriptores reales para tu canal. Reposición 30 días.	326.250000	10	2000	0-6 horas	t	80	2026-05-21 07:34:48.8081+00	2026-05-21 09:07:50.004889+00
3a16d22e-65f2-4967-8a01-782748d81206	00000000-0000-0000-0000-000000000001	23935	Instagram Views – Reels & Posts	views	instagram	Vistas para reels y posts. Ultra rápido, hasta 1 millón por día.	0.002600	100	2147483647	Instantáneo	f	4	2026-05-20 11:44:05.198465+00	2026-05-21 09:14:21.833489+00
4b20148d-c424-4848-a4a2-c80853deea74	00000000-0000-0000-0000-000000000001	12917	Instagram Story Views	views	instagram	Vistas para tus historias de Instagram. Hasta 1M/día.	0.018800	10	1000000	Instantáneo	f	0	2026-05-21 07:34:48.62289+00	2026-05-21 09:14:21.833489+00
be630e9f-7a77-4f58-a313-f78afeeecfe2	00000000-0000-0000-0000-000000000001	22677	YouTube Views – Premium	views	youtube	Vistas reales con reposición automática 365 días. La mejor garantía.	1.950000	100	2147483647	0-1 hora	f	0	2026-05-21 07:53:59.114962+00	2026-05-21 09:14:21.833489+00
f080f8fb-d41c-409d-9e74-877d68c7a6f5	00000000-0000-0000-0000-000000000001	8560	YouTube Subscribers – Real	followers	youtube	Suscriptores HQ para tu canal de YouTube. Reposición de por vida.	21.337500	50	50000	0-6 horas	f	0	2026-05-21 07:53:59.122195+00	2026-05-21 09:14:21.833489+00
a04312ae-81a8-40e3-b988-8e52967df31b	00000000-0000-0000-0000-000000000001	20738	YouTube Subscribers – Premium	followers	youtube	Suscriptores de alta calidad con reposición 7 días. Hasta 100K.	24.000000	10	100000	0-6 horas	f	0	2026-05-21 07:53:59.12466+00	2026-05-21 09:14:21.833489+00
07601ca6-c64c-48b5-8b29-209f03fb56b6	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	4427	Instagram Followers – Elite 365d	followers	instagram	Seguidores HQ con reposición 365 días. Máxima garantía anual.	4.050000	100	800000	Instantáneo	t	4	2026-05-21 09:06:21.843651+00	2026-05-21 09:17:35.605769+00
37f91a63-5308-482f-92f4-da5fc991a9b1	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	2985	Instagram Likes – Fast	likes	instagram	Likes de cuentas reales HQ. Entrega instantánea con reposición de por vida.	1.500000	100	250000	Instantáneo	t	3	2026-05-20 11:44:05.198465+00	2026-05-21 09:21:53.1012+00
78440314-757c-4e0b-87fb-57bb7d5f1a7f	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	2821	TikTok Views – Fast	views	tiktok	Vistas para videos TikTok. 30 días de garantía.	0.800000	50	10000000	Instantáneo	t	50	2026-05-21 07:34:48.724364+00	2026-05-21 09:31:54.735663+00
1f35383b-c0c0-4a40-ab26-8d8accd7dffa	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	6816	TikTok Followers – Fast	followers	tiktok	Seguidores TikTok HQ hasta 500K con reposición 30 días.	8.625000	10	500000	Instantáneo	t	30	2026-05-21 07:34:48.685252+00	2026-05-21 09:18:41.187077+00
3a39099e-ad09-4227-8ba8-958941ef76d3	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	6821	TikTok Followers – Premium	followers	tiktok	Seguidores TikTok HQ hasta 1M con reposición 30 días.	12.675000	50	10000000	Instantáneo	t	31	2026-05-21 07:43:38.966397+00	2026-05-21 09:18:41.187077+00
1d02eba2-6f6a-4304-97b3-420b10b97fe8	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	3826	TikTok Views – Premium	views	tiktok	Vistas TikTok con reposición 365 días.	1.200000	100	50000000	Instantáneo	t	51	2026-05-21 07:34:48.73744+00	2026-05-21 09:31:54.750629+00
44862d86-bb99-48f5-b510-35cceba3852a	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	5807	YouTube Views – Real	views	youtube	Vistas reales y activas desde fuentes mixtas.	10.687500	1000	10000000	0-1 hora	t	60	2026-05-21 07:34:48.763271+00	2026-05-21 09:18:41.187077+00
cc1f7d2e-d63e-462e-8855-cc15fb7210e3	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	1287	YouTube Likes	likes	youtube	Likes reales para videos y Shorts de YouTube.	5.437500	10	10000	0-15 min	t	70	2026-05-21 07:53:59.119415+00	2026-05-21 09:18:41.187077+00
c6f44651-3167-4b07-8297-d980477c1b78	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	5266	Instagram Views – Reels	views	instagram	Vistas para reels y videos. Entrega instantánea.	0.500000	100	50000000	Instantáneo	t	20	2026-05-21 09:20:48.690288+00	2026-05-21 09:23:08.579697+00
1e4d7924-b16d-47b1-8cdb-c4f02f131371	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	6804	TikTok Likes – Fast	likes	tiktok	Likes HQ para videos TikTok. Max 1M.	1.500000	100	1000000	Instantáneo	t	40	2026-05-21 07:34:48.698481+00	2026-05-21 09:30:59.548737+00
bebf2dd1-292d-4502-bd79-e834d681bf1a	bc54c9aa-4f6f-49d1-a32d-d859cd3cc3ca	6806	TikTok Likes – Premium	likes	tiktok	Likes HQ con reposición 365 días. Max 1M.	3.000000	100	1000000	Instantáneo	t	41	2026-05-21 07:34:48.710811+00	2026-05-21 09:31:03.462904+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: boostins
--

COPY public.users (id, email, password_hash, name, role, referral_code, referred_by, balance, is_active, email_verified, created_at, updated_at) FROM stdin;
4b21eac5-0f14-4cc6-b4b9-280c860c2c74	francodemartosworks@gmail.com	$2a$12$JxcBnTRMvJkVHxMvBdRgIuDRzNCSVKhdLke6Tq6cufYi7h5crFe5S	Franco Demartos	user	GJPGS9	\N	0.00	t	f	2026-05-20 20:08:36.656752+00	2026-05-20 20:08:36.656752+00
a0d375d0-13a7-4ba9-9a64-b196a39afc8b	francodemartosutn@gmail.com	$2a$12$1snfiR4.o1JA1kZLl0OAO.cEqetkicC48opzyj98wUyokNRjNWNjm	Franco22	user	LNSQGW	\N	0.00	t	f	2026-05-21 06:57:56.318253+00	2026-05-21 06:57:56.318253+00
996d6bb3-12a9-4468-ae2a-b32c4afa68ca	francodemartosx@gmail.com	$2a$12$C4Xj4AJpKBGhvvav4kJug.nqQkm0PNPSyQmR/eSMtUfwTwpbj3Nti	Franco Demartos	user	A6W9BR	\N	0.00	t	f	2026-05-21 09:56:11.921913+00	2026-05-21 09:56:11.921913+00
28517ffc-43bb-4674-a10d-8c86bd8feab3	admin@boostins.com	$2a$12$xZeRq9RswMsMUdnAiB01m.8DMOaN/HuGo6OkCW6bmRcfrFBLkaPNy	Admin	admin	\N	\N	812.50	t	t	2026-05-20 11:44:05.193785+00	2026-05-23 21:21:43.653888+00
90022340-a3cb-4e3c-bdce-60b84aedf17f	pablomasilla855@gmail.com	$2a$12$QqqrytJoyNrcpsarDQDwIOPiOaZmIW8Y0VaArorLEo6PhMY5ie2..	Pablo Tapia	user	U01FKM	\N	6100.00	t	f	2026-05-22 02:01:03.456163+00	2026-05-24 14:30:07.237756+00
\.


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: deposits deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_deposits_status; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_deposits_status ON public.deposits USING btree (status);


--
-- Name: idx_deposits_user_id; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_deposits_user_id ON public.deposits USING btree (user_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_payments_external_id; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_payments_external_id ON public.payments USING btree (external_id);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_services_category; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_services_category ON public.services USING btree (category);


--
-- Name: idx_services_is_active; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_services_is_active ON public.services USING btree (is_active);


--
-- Name: idx_services_platform; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_services_platform ON public.services USING btree (platform);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_referral_code; Type: INDEX; Schema: public; Owner: boostins
--

CREATE INDEX idx_users_referral_code ON public.users USING btree (referral_code);


--
-- Name: orders set_updated_at; Type: TRIGGER; Schema: public; Owner: boostins
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments set_updated_at; Type: TRIGGER; Schema: public; Owner: boostins
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: providers set_updated_at; Type: TRIGGER; Schema: public; Owner: boostins
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: services set_updated_at; Type: TRIGGER; Schema: public; Owner: boostins
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users set_updated_at; Type: TRIGGER; Schema: public; Owner: boostins
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deposits deposits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;


--
-- Name: orders orders_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: services services_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- Name: users users_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: boostins
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict xum5xtRToZfzCoLxIHp1bCIkZHBKcv6NNZF9F67YGCD0u7tTjeQoebyePdstpDs


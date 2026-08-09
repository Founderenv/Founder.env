-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin','editor','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin');
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ enums ============
CREATE TYPE public.concept_type AS ENUM ('CONCEPT_PROJECT','REAL_CLIENT');
CREATE TYPE public.design_status AS ENUM ('DRAFT','AVAILABLE','SOLD','COMING_SOON','HIDDEN');
CREATE TYPE public.project_status AS ENUM ('BUILDING','COMPLETED','EXPERIMENTAL','PAUSED');
CREATE TYPE public.device_type AS ENUM ('DESKTOP','MOBILE','TABLET');
CREATE TYPE public.social_platform AS ENUM ('INSTAGRAM','GITHUB','EMAIL');

-- ============ media ============
CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_bucket text NOT NULL DEFAULT 'media',
  storage_path text NOT NULL,
  public_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'IMAGE',
  original_filename text,
  alt_text text,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ singletons ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL DEFAULT 'Founder.env',
  display_name text,
  bio text DEFAULT 'Building things I wish existed.',
  hero_heading_line_1 text DEFAULT 'Building things',
  hero_heading_line_2 text DEFAULT 'I wish existed.',
  hero_highlight_text text DEFAULT 'existed.',
  hero_description text,
  secondary_hero_text text,
  about_content text,
  founder_status text DEFAULT 'BUILDING',
  focus text DEFAULT 'WEB / AI / STARTUPS',
  current_build text DEFAULT 'NorthWeb',
  profile_picture_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  header_logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  hero_logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  favicon_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  brand_text text NOT NULL DEFAULT 'founder.env',
  show_brand_text boolean NOT NULL DEFAULT true,
  header_logo_height integer NOT NULL DEFAULT 22,
  header_logo_scale numeric NOT NULL DEFAULT 1,
  hero_logo_scale numeric NOT NULL DEFAULT 1,
  logo_animation_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.appearance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heading_font text NOT NULL DEFAULT 'Geist',
  body_font text NOT NULL DEFAULT 'Inter',
  mono_font text NOT NULL DEFAULT 'Geist Mono',
  background_color text NOT NULL DEFAULT '#050507',
  secondary_background_color text NOT NULL DEFAULT '#08090C',
  surface_color text NOT NULL DEFAULT '#0B0C10',
  elevated_surface_color text NOT NULL DEFAULT '#0E0F14',
  primary_text_color text NOT NULL DEFAULT '#F4F4F5',
  secondary_text_color text NOT NULL DEFAULT '#A1A1AA',
  muted_text_color text NOT NULL DEFAULT '#71717A',
  accent_color text NOT NULL DEFAULT '#7C5CFF',
  secondary_accent_color text NOT NULL DEFAULT '#9B7BFF',
  border_color text NOT NULL DEFAULT 'rgba(255,255,255,0.08)',
  animation_intensity text NOT NULL DEFAULT 'MEDIUM',
  logo_animation_enabled boolean NOT NULL DEFAULT true,
  orbital_animation_enabled boolean NOT NULL DEFAULT true,
  pointer_effect_enabled boolean NOT NULL DEFAULT false,
  smooth_scroll_enabled boolean NOT NULL DEFAULT true,
  parallax_enabled boolean NOT NULL DEFAULT false,
  page_transition_enabled boolean NOT NULL DEFAULT true,
  glow_intensity numeric NOT NULL DEFAULT 0.18,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title text NOT NULL DEFAULT 'Founder.env — Building things I wish existed',
  site_description text NOT NULL DEFAULT 'Founder.env is a build-in-public environment for digital products, websites and experiments.',
  og_image_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  twitter_handle text,
  canonical_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.navigation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  href text NOT NULL,
  external boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ content ============
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  theme_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  tagline text,
  short_description text,
  long_description text,
  status text NOT NULL DEFAULT 'ACTIVE',
  website_url text,
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'COMING_SOON',
  cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE TABLE public.concept_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.business_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  short_description text,
  long_description text,
  live_url text,
  technology text,
  concept_type public.concept_type NOT NULL DEFAULT 'CONCEPT_PROJECT',
  status text NOT NULL DEFAULT 'ACTIVE',
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.website_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.business_categories(id) ON DELETE CASCADE,
  design_name text NOT NULL,
  design_code text,
  slug text NOT NULL UNIQUE,
  thumbnail_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  short_description text,
  long_description text,
  features text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  tech_stack text[] NOT NULL DEFAULT '{}',
  live_preview_url text,
  vercel_deployment_url text,
  contact_url text,
  price numeric,
  status public.design_status NOT NULL DEFAULT 'DRAFT',
  availability text NOT NULL DEFAULT 'AVAILABLE',
  pages_count integer,
  technology text,
  style text,
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.design_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid NOT NULL REFERENCES public.website_designs(id) ON DELETE CASCADE,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  device_type public.device_type NOT NULL DEFAULT 'DESKTOP',
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  project_type text,
  short_description text,
  long_description text,
  cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  tech_stack text[] NOT NULL DEFAULT '{}',
  github_url text,
  live_demo_url text,
  status public.project_status NOT NULL DEFAULT 'BUILDING',
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.build_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL DEFAULT current_date,
  log_number integer,
  title text NOT NULL,
  description text,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  related_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  related_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PUBLISHED',
  published boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.social_platform NOT NULL,
  display_name text,
  username text,
  url text,
  email text,
  cta_label text,
  icon text,
  visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ grants / rls ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['media','profiles','brand_settings','appearance_settings','seo_settings','navigation_settings','businesses','business_categories','concept_builds','website_designs','design_screenshots','projects','build_logs','social_links']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "public read %1$s" ON public.%1$I FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "admin write %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());', t);
    EXECUTE format('CREATE TRIGGER touch_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t);
  END LOOP;
END $$;

-- ============ seed ============
INSERT INTO public.profiles (brand_name, display_name, bio, hero_heading_line_1, hero_heading_line_2, hero_highlight_text, hero_description, secondary_hero_text, founder_status, focus, current_build)
VALUES ('Founder.env','Founder.env','Building things I wish existed.','Building things','I wish existed.','existed.','I build digital products, websites and experiments around ideas that feel worth making.','Currently building for local businesses, experimenting with real projects, and documenting the process along the way.','BUILDING','WEB / AI / STARTUPS','NorthWeb');

INSERT INTO public.brand_settings (brand_text) VALUES ('founder.env');
INSERT INTO public.appearance_settings DEFAULT VALUES;
INSERT INTO public.seo_settings DEFAULT VALUES;

INSERT INTO public.navigation_settings (label, href, external, display_order) VALUES
  ('Businesses','/businesses',false,1),
  ('Projects','/projects',false,2),
  ('Build Log','/build-log',false,3);

INSERT INTO public.social_links (platform, display_name, username, url, cta_label, icon, display_order) VALUES
  ('INSTAGRAM','Instagram','founder.env','https://www.instagram.com/founder.env?igsh=ZHV2ZnZidzh4NmZk','Instagram','instagram',1),
  ('GITHUB','GitHub',NULL,'https://github.com','GitHub','github',2);
INSERT INTO public.social_links (platform, display_name, email, cta_label, icon, display_order) VALUES
  ('EMAIL','Email','hello@founder.env','Email','mail',3);

INSERT INTO public.businesses (id, name, slug, tagline, short_description, long_description, status, featured, display_order)
VALUES ('11111111-1111-4111-8111-111111111111','NorthWeb','northweb','Websites that represent your business.','Websites built to make local businesses look as good online as they do in real life.','NorthWeb builds premium websites for local businesses that want to look as good online as they do in real life.','ACTIVE',true,1);

INSERT INTO public.business_categories (id, business_id, name, slug, description, status, display_order) VALUES
  ('22222222-2222-4222-8222-222222222221','11111111-1111-4111-8111-111111111111','Clothing','clothing','Website concepts and design directions for clothing brands and stores.','ACTIVE',1),
  ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Salon','salon','Website concepts for salons and studios.','COMING_SOON',2),
  ('22222222-2222-4222-8222-222222222223','11111111-1111-4111-8111-111111111111','Restaurant','restaurant','Website concepts for restaurants.','COMING_SOON',3),
  ('22222222-2222-4222-8222-222222222224','11111111-1111-4111-8111-111111111111','Cafe','cafe','Website concepts for cafes.','COMING_SOON',4),
  ('22222222-2222-4222-8222-222222222225','11111111-1111-4111-8111-111111111111','Gym','gym','Website concepts for gyms and fitness studios.','COMING_SOON',5),
  ('22222222-2222-4222-8222-222222222226','11111111-1111-4111-8111-111111111111','Real Estate','real-estate','Website concepts for real estate businesses.','COMING_SOON',6);

INSERT INTO public.concept_builds (business_id, category_id, name, slug, short_description, concept_type, display_order) VALUES
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','URBN THREADS','urbn-threads','Premium streetwear concept for modern fashion brands.','CONCEPT_PROJECT',1),
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','VELORA','velora','Modern women''s fashion boutique concept.','CONCEPT_PROJECT',2),
  ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','NORTH & CO.','north-and-co','Minimal premium menswear concept.','CONCEPT_PROJECT',3);

INSERT INTO public.website_designs (business_id, category_id, design_name, design_code, slug, short_description, long_description, status, availability, pages_count, technology, style, featured, display_order, published_at)
VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222221','Modern Clothing Store Website','NW CLOTHING / 001','nw-clothing-001','A ready-to-adapt website design for clothing brands and stores.','A clean, modern and conversion-focused design for clothing stores and fashion brands.','AVAILABLE','AVAILABLE',15,'Next.js','Modern',true,1,now());

INSERT INTO public.build_logs (log_date, log_number, title, display_order) VALUES
  ('2026-08-09',3,'Founder.env started.',1),
  ('2026-08-09',2,'NorthWeb entered active development.',2),
  ('2026-08-08',1,'Planning early concepts for clothing websites.',3);
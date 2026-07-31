
CREATE TYPE public.app_role AS ENUM ('consultant','organization');
CREATE TYPE public.cycle_status AS ENUM ('draft','submitted','under_review','approved','returned');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  process_clause text NOT NULL,
  process_focus text,
  requirement_ref text NOT NULL UNIQUE,
  principle text NOT NULL,
  paris_source text,
  requirement_text text NOT NULL,
  weight numeric,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.assessment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status public.cycle_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.assessment_cycles(id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
  applicable text NOT NULL DEFAULT 'yes',
  score integer,
  evidence_reviewed text,
  evaluator_comment text,
  improvement_action text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, requirement_id)
);

CREATE TABLE public.evidence_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.review_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.assessment_cycles(id) ON DELETE CASCADE,
  requirement_id uuid REFERENCES public.requirements(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.requirements TO authenticated;
GRANT ALL ON public.requirements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_cycles TO authenticated;
GRANT ALL ON public.assessment_cycles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_files TO authenticated;
GRANT ALL ON public.evidence_files TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_notes TO authenticated;
GRANT ALL ON public.review_notes TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.cycle_is_editable(_cycle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_cycles c
    WHERE c.id = _cycle_id
      AND c.organization_id = public.current_org_id()
      AND c.status IN ('draft','returned')
  );
$$;

CREATE OR REPLACE FUNCTION public.cycle_visible(_cycle_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'consultant')
      OR EXISTS (SELECT 1 FROM public.assessment_cycles c WHERE c.id = _cycle_id AND c.organization_id = public.current_org_id());
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs consultant all" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'consultant')) WITH CHECK (public.has_role(auth.uid(),'consultant'));
CREATE POLICY "orgs own read" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.current_org_id());

CREATE POLICY "profiles own read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'consultant'));
CREATE POLICY "profiles own update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "roles own read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'consultant'));

CREATE POLICY "requirements read" ON public.requirements FOR SELECT TO authenticated USING (true);

CREATE POLICY "cycles consultant all" ON public.assessment_cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'consultant')) WITH CHECK (public.has_role(auth.uid(),'consultant'));
CREATE POLICY "cycles org read" ON public.assessment_cycles FOR SELECT TO authenticated
  USING (organization_id = public.current_org_id());
CREATE POLICY "cycles org update" ON public.assessment_cycles FOR UPDATE TO authenticated
  USING (organization_id = public.current_org_id() AND status IN ('draft','returned'))
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "responses read" ON public.responses FOR SELECT TO authenticated
  USING (public.cycle_visible(cycle_id));
CREATE POLICY "responses org update" ON public.responses FOR UPDATE TO authenticated
  USING (public.cycle_is_editable(cycle_id)) WITH CHECK (public.cycle_is_editable(cycle_id));
CREATE POLICY "responses consultant write" ON public.responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'consultant')) WITH CHECK (public.has_role(auth.uid(),'consultant'));

CREATE POLICY "evidence read" ON public.evidence_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND public.cycle_visible(r.cycle_id)));
CREATE POLICY "evidence org write" ON public.evidence_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND public.cycle_is_editable(r.cycle_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.responses r WHERE r.id = response_id AND public.cycle_is_editable(r.cycle_id)));

CREATE POLICY "notes read" ON public.review_notes FOR SELECT TO authenticated
  USING (public.cycle_visible(cycle_id));
CREATE POLICY "notes consultant write" ON public.review_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'consultant')) WITH CHECK (public.has_role(auth.uid(),'consultant'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER responses_touch BEFORE UPDATE ON public.responses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER cycles_touch BEFORE UPDATE ON public.assessment_cycles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "evidence storage read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (public.has_role(auth.uid(),'consultant') OR (storage.foldername(name))[1] = public.current_org_id()::text));
CREATE POLICY "evidence storage write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = public.current_org_id()::text);
CREATE POLICY "evidence storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = public.current_org_id()::text);

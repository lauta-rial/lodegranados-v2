ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS "authUserId" uuid UNIQUE;
CREATE INDEX IF NOT EXISTS idx_user_auth_user_id ON public."user" ("authUserId");

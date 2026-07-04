DO $$
DECLARE
  r RECORD;
  new_id uuid;
  now_ts timestamptz := now();
  providers jsonb;
BEGIN
  FOR r IN
    SELECT id, email, name, password, "googleId"
    FROM public."user"
    WHERE "authUserId" IS NULL
  LOOP
    new_id := gen_random_uuid();

    providers := jsonb_build_array('email');
    IF r."googleId" IS NOT NULL THEN
      providers := providers || jsonb_build_array('google');
    END IF;

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_id,
      'authenticated',
      'authenticated',
      r.email,
      CASE
        WHEN r.password IS NOT NULL THEN replace(r.password, '$2b$', '$2a$')
        ELSE NULL
      END,
      now_ts,
      jsonb_build_object('provider', 'email', 'providers', providers),
      jsonb_build_object(
        'name', r.name,
        'legacy_user_id', r.id,
        'email', r.email,
        'email_verified', true,
        'phone_verified', false
      ),
      now_ts,
      now_ts,
      false
    );

    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_id::text,
      new_id,
      jsonb_build_object(
        'sub', new_id::text,
        'name', r.name,
        'email', r.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now_ts,
      now_ts,
      now_ts
    );

    UPDATE public."user"
    SET "authUserId" = new_id
    WHERE id = r.id;
  END LOOP;
END $$;

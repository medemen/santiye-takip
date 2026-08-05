-- GoTrue v2.195 kullanicilari tararken NULL string kolonlari hata veriyor
-- (sql: Scan error ... converting NULL to string). Mevcut satirlari duzelt.
update auth.users
set email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, '')
where email_change is null
   or email_change_token_new is null
   or confirmation_token is null
   or recovery_token is null;

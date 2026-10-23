-- StayNest: lets administrators list accounts with their sign-in email, which
-- lives in auth.users and is not otherwise readable through the API.

create or replace function public.admin_list_users(
  p_search text default null,
  p_role public.app_role default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.app_role,
  is_suspended boolean,
  created_at timestamptz,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(lower(trim(coalesce(p_search, ''))), '');
begin
  if not public.is_admin() then
    raise exception 'Administrators only' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.is_suspended, p.created_at,
           count(*) over () as total
      from public.profiles p
      join auth.users u on u.id = p.id
     where (p_role is null or p.role = p_role)
       and (v_search is null
            or position(v_search in lower(u.email)) > 0
            or position(v_search in lower(p.full_name)) > 0)
     order by p.created_at desc
     limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_users(text, public.app_role, int, int) from public, anon;
grant execute on function public.admin_list_users(text, public.app_role, int, int) to authenticated;

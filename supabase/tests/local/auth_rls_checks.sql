-- Local PostgreSQL auth/RLS simulation. Does not replace Supabase Auth integration tests.
select set_config('session.admin_role', current_user, false);
do $$
declare u1 uuid:='22000000-0000-0000-0000-000000000001'; u2 uuid:='22000000-0000-0000-0000-000000000002'; s1 uuid; s2 uuid; n int;
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (u1,'auth-one@local','{"full_name":"Auth One"}'),(u2,'auth-two@local','{"full_name":"Auth Two"}') on conflict do nothing;
 perform tests.ok(exists(select 1 from public.profiles where id=u1 and full_name='Auth One'),'auth signup trigger creates profile');
 perform tests.as_user(u1); s1:=public.create_store('Auth Store One');
 perform tests.as_user(u2); s2:=public.create_store('Auth Store Two');
 perform tests.ok(s1<>s2,'distinct authenticated users create isolated stores');
 perform tests.as_user(u1);
 select count(*) into n from public.stores;
 perform tests.ok(n=1,'authenticated session sees only member store');
 perform tests.as_user(u2);
 select count(*) into n from public.stores;
 perform tests.ok(n=1,'switching auth identity changes RLS result');
 perform tests.as_anon();
 perform tests.ok(tests.try('select * from public.stores')='42501','signed-out/anon identity cannot read stores');
 perform tests.as_admin();
  perform tests.ok((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity)=23,'all 23 public base tables have RLS enabled');
 perform tests.ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity),'no public base table lacks RLS');
end $$;
select 'AUTH AND RLS CHECKS PASSED' as result;

-- Виконати в Supabase SQL Editor у НОВОМУ проєкті.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,role text not null default 'customer' check(role in ('customer','admin')));
create function public.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$begin insert into public.profiles(id,role) values(new.id,'customer');return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
create table public.toys(id uuid primary key default gen_random_uuid(),name text not null,description text,category text not null,age_min int not null default 0 check(age_min>=0),price numeric(12,2) not null check(price>0),stock int not null default 0 check(stock>=0),image_url text,created_at timestamptz not null default now());
create table public.orders(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),customer_name text not null,phone text not null,address text not null,comment text,created_at timestamptz not null default now(),status text not null default 'Нове' check(status in ('Нове','Підтверджено','Відправлено','Виконано','Скасовано')),total numeric(12,2) not null check(total>=0));
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,toy_id uuid references public.toys(id) on delete set null,toy_name text not null,quantity int not null check(quantity>0),unit_price numeric(12,2) not null);
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin')$$;
alter table public.profiles enable row level security;alter table public.toys enable row level security;alter table public.orders enable row level security;alter table public.order_items enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy "read toys" on public.toys for select to anon,authenticated using(true);
create policy "admin insert toys" on public.toys for insert to authenticated with check(public.is_admin());
create policy "admin update toys" on public.toys for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "admin delete toys" on public.toys for delete to authenticated using(public.is_admin());
create policy "read orders" on public.orders for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy "admin update orders" on public.orders for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "read order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=(select auth.uid()) or public.is_admin())));
-- Замовлення створюються виключно через RPC; ціни та наявність перевіряються в БД.
create or replace function public.place_order(p_name text,p_phone text,p_address text,p_comment text,p_items jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order uuid;v_total numeric(12,2):=0;v_item jsonb;v_toy public.toys%rowtype;v_qty int;v_count int:=0;
begin
 if auth.uid() is null then raise exception 'Увійдіть в акаунт';end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(coalesce(p_phone,'')))<7 or length(trim(coalesce(p_address,'')))<3 then raise exception 'Заповніть контактні дані';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'Некоректний кошик';end if;
 -- Блокуємо рядки товарів у стабільному порядку, щоб уникнути гонок та deadlock.
 for v_item in select value from jsonb_array_elements(p_items) order by value->>'toy_id' loop
  v_count:=v_count+1;
  if v_item->>'quantity' !~ '^[0-9]{1,4}$' then raise exception 'Некоректна кількість';end if;
  v_qty:=(v_item->>'quantity')::int;
  if v_qty<1 then raise exception 'Некоректна кількість';end if;
  select * into v_toy from public.toys where id=(v_item->>'toy_id')::uuid for update;
  if not found or v_toy.stock<v_qty then raise exception 'Товар відсутній або недостатньо залишку';end if;
  if (select count(*) from jsonb_array_elements(p_items) x where x->>'toy_id'=v_item->>'toy_id')>1 then raise exception 'Повтор товару в кошику';end if;
  v_total:=v_total+v_toy.price*v_qty;
 end loop;
 insert into public.orders(user_id,customer_name,phone,address,comment,total) values(auth.uid(),trim(p_name),trim(p_phone),trim(p_address),p_comment,v_total) returning id into v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::int;
  select * into v_toy from public.toys where id=(v_item->>'toy_id')::uuid;
  update public.toys set stock=stock-v_qty where id=v_toy.id;
  insert into public.order_items(order_id,toy_id,toy_name,quantity,unit_price) values(v_order,v_toy.id,v_toy.name,v_qty,v_toy.price);
 end loop;
 return v_order;
end$$;
revoke all on function public.place_order(text,text,text,text,jsonb) from public,anon;
grant execute on function public.place_order(text,text,text,text,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('toy-images','toy-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do nothing;
create policy "public read toy images" on storage.objects for select to public using(bucket_id='toy-images');
create policy "admin upload toy images" on storage.objects for insert to authenticated with check(bucket_id='toy-images' and public.is_admin());
create policy "admin delete toy images" on storage.objects for delete to authenticated using(bucket_id='toy-images' and public.is_admin());
-- Після реєстрації власника виконати вручну в SQL Editor, підставивши його UUID:
-- update public.profiles set role='admin' where id='UUID_ВАШОГО_КОРИСТУВАЧА';

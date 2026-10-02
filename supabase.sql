-- Pega todo esto en Supabase > SQL Editor > Run
create table productos (
  id bigint generated always as identity primary key,
  nombre text not null, categoria text not null check (categoria in ('mermelada','pie')),
  precio numeric not null, descripcion text, emoji text, activo boolean default true
);
create table cupones (
  codigo text primary key, porcentaje int not null check (porcentaje between 1 and 100),
  vigente_hasta date not null, descripcion text
);
create table sugerencias (
  id bigint generated always as identity primary key,
  nombre text not null, mensaje text not null, creado timestamptz default now()
);
create table pedidos (
  id bigint generated always as identity primary key,
  usuario_id uuid references auth.users not null default auth.uid(),
  items jsonb not null, subtotal numeric, descuento numeric, envio numeric, total numeric,
  cupon text, estado text default 'nuevo', creado timestamptz default now()
);

alter table productos enable row level security;
alter table cupones enable row level security;
alter table sugerencias enable row level security;
alter table pedidos enable row level security;

create policy "ver productos" on productos for select using (true);
create policy "ver cupones" on cupones for select using (true);
create policy "enviar sugerencias" on sugerencias for insert with check (true);
create policy "crear mi pedido" on pedidos for insert to authenticated with check (usuario_id = auth.uid());
create policy "ver mis pedidos" on pedidos for select to authenticated using (usuario_id = auth.uid());

insert into productos (nombre, categoria, precio, descripcion, emoji) values
 ('Mermelada de fresa','mermelada',3500,'Frasco de 250 g, fresa y poca azúcar.','🍓'),
 ('Mermelada de piña','mermelada',3500,'Frasco de 250 g con trocitos de piña.','🍍'),
 ('Mermelada de mora','mermelada',3800,'Frasco de 250 g, mora de altura.','🫐'),
 ('Pie de limón entero','pie',9500,'8 porciones, base de galleta y merengue.','🥧'),
 ('Pie de limón individual','pie',1800,'Una porción, ideal para el café.','🍋');
insert into cupones values ('LIMON10',10,'2026-12-31','10% en tu compra');

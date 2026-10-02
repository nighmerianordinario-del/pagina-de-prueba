const C = window.CONFIG;
const db = (C.SUPABASE_URL && C.SUPABASE_ANON_KEY) ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const money = n => "₡" + Math.round(n).toLocaleString("es-CR");

// Datos de respaldo si Supabase aún no está conectado
const demoProductos = [
  { id: 1, nombre: "Mermelada de fresa", categoria: "mermelada", precio: 3500, descripcion: "Frasco de 250 g, fresa y poca azúcar.", emoji: "🍓" },
  { id: 2, nombre: "Mermelada de piña", categoria: "mermelada", precio: 3500, descripcion: "Frasco de 250 g con trocitos de piña.", emoji: "🍍" },
  { id: 3, nombre: "Mermelada de mora", categoria: "mermelada", precio: 3800, descripcion: "Frasco de 250 g, mora de altura.", emoji: "🫐" },
  { id: 4, nombre: "Pie de limón entero", categoria: "pie", precio: 9500, descripcion: "8 porciones, base de galleta y merengue.", emoji: "🥧" },
  { id: 5, nombre: "Pie de limón individual", categoria: "pie", precio: 1800, descripcion: "Una porción, ideal para el café.", emoji: "🍋" }
];
const demoCupones = [{ codigo: "LIMON10", porcentaje: 10, vigente_hasta: "2026-12-31", descripcion: "10% en tu compra" }];

let productos = [], cupones = [], carrito = {}, cuponAplicado = null, usuario = null;

async function cargarDatos() {
  if (db) {
    const p = await db.from("productos").select("*").eq("activo", true).order("id");
    const c = await db.from("cupones").select("*").gte("vigente_hasta", new Date().toISOString().slice(0, 10));
    productos = p.data?.length ? p.data : demoProductos;
    cupones = c.data || [];
  } else { productos = demoProductos; cupones = demoCupones; }
  pintarProductos("todos"); pintarOfertas(); pintarCarrito();
}

function pintarProductos(f) {
  $("#productos").innerHTML = productos.filter(p => f === "todos" || p.categoria === f).map(p => `
    <article class="card"><div class="em">${p.emoji || "🍋"}</div><h4>${p.nombre}</h4>
    <p>${p.descripcion || ""}</p><span class="pr">${money(p.precio)}</span>
    <button data-add="${p.id}">Agregar al carrito</button></article>`).join("");
}
document.addEventListener("click", e => {
  const a = e.target.closest("[data-add]"); if (a) { carrito[a.dataset.add] = (carrito[a.dataset.add] || 0) + 1; pintarCarrito(); }
  const q = e.target.closest("[data-del]"); if (q) { delete carrito[q.dataset.del]; pintarCarrito(); }
  const f = e.target.closest(".chip"); if (f) { document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === f)); pintarProductos(f.dataset.f); }
});

function totales() {
  const sub = Object.entries(carrito).reduce((s, [id, n]) => s + productos.find(p => p.id == id).precio * n, 0);
  const desc = cuponAplicado ? sub * cuponAplicado.porcentaje / 100 : 0;
  const envio = sub === 0 || sub - desc >= C.ENVIO_GRATIS_DESDE ? 0 : C.ENVIO;
  return { sub, desc, envio, total: sub - desc + envio };
}
function pintarCarrito() {
  const ids = Object.keys(carrito);
  $("#items").innerHTML = ids.length ? ids.map(id => {
    const p = productos.find(x => x.id == id);
    return `<li><span>${carrito[id]} × ${p.nombre}</span><span>${money(p.precio * carrito[id])} <button class="ghost" data-del="${id}" aria-label="Quitar ${p.nombre}">✕</button></span></li>`;
  }).join("") : '<li class="vacio">Aún no agregas productos.</li>';
  const t = totales();
  $("#subtotal").textContent = money(t.sub); $("#desc").textContent = "-" + money(t.desc);
  $("#envio").textContent = t.envio ? money(t.envio) : "Gratis"; $("#total").textContent = money(t.total);
}

function pintarOfertas() {
  $("#ofertas").innerHTML = cupones.length ? cupones.map(c => `<div class="oferta"><b>${c.porcentaje}% menos</b>${c.descripcion || ""}<br>Código: <strong>${c.codigo}</strong><br>Vigente hasta ${new Date(c.vigente_hasta + "T00:00").toLocaleDateString("es-CR")}</div>`).join("") : "<p>No hay ofertas vigentes por ahora.</p>";
}
$("#aplicar").onclick = () => {
  const c = cupones.find(x => x.codigo.toLowerCase() === $("#cupon").value.trim().toLowerCase());
  cuponAplicado = c || null;
  $("#msgCupon").textContent = c ? `Cupón aplicado: ${c.porcentaje}% de descuento.` : "Ese cupón no existe o ya venció.";
  pintarCarrito();
};

$("#pedir").onclick = async () => {
  const m = $("#msgPedido");
  if (!Object.keys(carrito).length) return m.textContent = "Agrega al menos un producto.";
  if (!db) return m.textContent = "Conecta Supabase en config.js para guardar pedidos.";
  if (!usuario) { m.textContent = "Inicia sesión para hacer tu pedido."; return abrirAuth("login"); }
  const t = totales();
  const items = Object.entries(carrito).map(([id, n]) => ({ producto_id: +id, cantidad: n }));
  const { error } = await db.from("pedidos").insert({ usuario_id: usuario.id, items, subtotal: t.sub, descuento: t.desc, envio: t.envio, total: t.total, cupon: cuponAplicado?.codigo || null });
  if (error) return m.textContent = "No se pudo enviar el pedido: " + error.message;
  carrito = {}; cuponAplicado = null; pintarCarrito(); m.textContent = "¡Pedido enviado! Te contactaremos pronto.";
};

// Sesión
const dlg = $("#dlgAuth"); let modo = "login";
function abrirAuth(m) {
  modo = m; $("#authTitulo").textContent = m === "login" ? "Iniciar sesión" : "Crear cuenta";
  $("#authOk").textContent = m === "login" ? "Entrar" : "Registrarme"; $("#msgAuth").textContent = ""; dlg.showModal();
}
$("#btnLogin").onclick = () => abrirAuth("login");
$("#btnRegistro").onclick = () => abrirAuth("registro");
$("#authCerrar").onclick = () => dlg.close();
$("#formAuth").onsubmit = async e => {
  e.preventDefault();
  const m = $("#msgAuth");
  if (!db) return m.textContent = "Conecta Supabase en config.js primero.";
  const f = new FormData(e.target), cred = { email: f.get("email"), password: f.get("password") };
  const { error } = modo === "login" ? await db.auth.signInWithPassword(cred) : await db.auth.signUp(cred);
  if (error) return m.textContent = error.message;
  if (modo === "registro") return m.textContent = "Cuenta creada. Revisa tu correo para confirmarla.";
  dlg.close();
};
$("#btnSalir").onclick = () => db?.auth.signOut();
function estadoSesion(u) {
  usuario = u; $("#usuario").hidden = !u; $("#usuario").textContent = u?.email || "";
  $("#btnLogin").hidden = $("#btnRegistro").hidden = !!u; $("#btnSalir").hidden = !u;
}
if (db) { db.auth.getSession().then(({ data }) => estadoSesion(data.session?.user)); db.auth.onAuthStateChange((_, s) => estadoSesion(s?.user)); }

// Sugerencias
$("#formSug").onsubmit = async e => {
  e.preventDefault(); const m = $("#msgSug"), f = new FormData(e.target);
  if (!db) return m.textContent = "Conecta Supabase en config.js para recibir sugerencias.";
  const { error } = await db.from("sugerencias").insert({ nombre: f.get("nombre"), mensaje: f.get("mensaje") });
  m.textContent = error ? "No se pudo enviar: " + error.message : "¡Gracias por tu sugerencia!";
  if (!error) e.target.reset();
};

// Contacto y mapa
$("#cTel").href = "tel:" + C.TELEFONO.replace(/\s/g, ""); $("#cTel span").textContent = C.TELEFONO;
$("#cMail").href = "mailto:" + C.CORREO; $("#cMail span").textContent = C.CORREO;
$("#cWa").href = `https://wa.me/${C.WHATSAPP}?text=${encodeURIComponent("Hola, quiero hacer un pedido")}`;
const L = C.LOCAL, d = 0.01;
$("#localInfo").textContent = `${L.nombre} · ${L.direccion} · ${L.horario}`;
$("#map").src = `https://www.openstreetmap.org/export/embed.html?bbox=${L.lng - d},${L.lat - d},${L.lng + d},${L.lat + d}&layer=mapnik&marker=${L.lat},${L.lng}`;

cargarDatos();

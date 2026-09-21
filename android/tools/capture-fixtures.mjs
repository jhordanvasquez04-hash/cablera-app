import fs from "node:fs";
import path from "node:path";

// Regenera los fixtures de las pruebas de contrato (ApiContractTest) con respuestas REALES del backend.
// Requisitos: backend corriendo con datos de ejemplo (ver android/README.md, "Pruebas de contrato").
// Uso: node android/tools/capture-fixtures.mjs   (BASE_URL opcional; por defecto http://127.0.0.1:4000)
// Los nombres, DNI, teléfonos y direcciones se anonimizan antes de guardar.
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4000";
const OUT = decodeURIComponent(new URL("../app/src/test/resources/fixtures", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

// --- anonimización: los fixtures no deben contener datos personales reales ---
const mapas = { nombreCompleto: new Map(), dni: new Map(), telefono: new Map(), direccion: new Map() };
const sustituto = {
  nombreCompleto: (n) => `Cliente Demo ${n}`,
  dni: (n) => String(10000000 + n),
  telefono: (n) => String(990000000 + n),
  direccion: (n) => `Calle Demo ${n}`,
};
function anonimizar(v) {
  if (Array.isArray(v)) return v.slice(0, 4).map(anonimizar);
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, val] of Object.entries(v)) {
      if (mapas[k] && typeof val === "string" && val) {
        if (!mapas[k].has(val)) mapas[k].set(val, sustituto[k](mapas[k].size + 1));
        o[k] = mapas[k].get(val);
      } else o[k] = anonimizar(val);
    }
    return o;
  }
  return v;
}

let total = 0, fallos = 0;
async function call(nombre, metodo, ruta, { token, body, form, esperado = [200, 201] } = {}) {
  const h = {};
  if (token) h.Authorization = `Bearer ${token}`;
  let cuerpo;
  if (form) cuerpo = form;
  else if (body !== undefined) { h["Content-Type"] = "application/json"; cuerpo = JSON.stringify(body); }
  const r = await fetch(BASE + ruta, { method: metodo, headers: h, body: cuerpo });
  const texto = await r.text();
  let json; try { json = JSON.parse(texto); } catch { json = texto; }
  total++;
  const ok = esperado.includes(r.status);
  if (!ok) { fallos++; console.log(`  FAIL ${metodo} ${ruta} -> ${r.status} ${texto.slice(0, 200)}`); }
  else console.log(`  ok   ${metodo} ${ruta} -> ${r.status}`);
  if (nombre && ok) fs.writeFileSync(path.join(OUT, nombre + ".json"), JSON.stringify(anonimizar(json), null, 2));
  if (nombre && !ok && r.status >= 400) fs.writeFileSync(path.join(OUT, nombre + ".json"), JSON.stringify(json, null, 2));
  return { status: r.status, json };
}

const login = async (email) => (await call(null, "POST", "/auth/login", { body: { email, password: "Segura-2026-ok" } })).json;

const g = await login("gestor@parias.test");
const c = await login("cobrador@parias.test");
const gT = g.accessToken, cT = c.accessToken;
fs.writeFileSync(path.join(OUT, "login.json"), JSON.stringify({ ...g, accessToken: "token-de-prueba" }, null, 2));

console.log("== lecturas");
await call("configuracion_publica", "GET", "/configuracion");
await call("configuracion", "GET", "/configuracion", { token: gT });
const zonas = (await call("zonas", "GET", "/zonas", { token: gT })).json;
await call("cobranza_resumen", "GET", "/cobranza/resumen", { token: cT });
await call("cobranza_resumen_filtrado", "GET", `/cobranza/resumen?zonaId=${zonas[0].id}&busqueda=a`, { token: cT });
const clientes = (await call("clientes", "GET", "/clientes", { token: gT })).json;
const [A, B, C, D] = clientes.filter((x) => x.estadoServicio === "activo");
await call("cliente", "GET", `/clientes/${A.id}`, { token: gT });
await call("ficha", "GET", `/clientes/${A.id}/ficha`, { token: gT });
await call("cargos_pendientes", "GET", `/clientes/${A.id}/cargos-pendientes`, { token: cT });
const tipos = (await call("tipos_servicio", "GET", "/tipos-servicio", { token: gT })).json;
const cable = tipos.find((t) => t.nombre === "cable");

console.log("== clientes y servicios (mutaciones)");
const tipoInternet = (await call("tipo_servicio_creado", "POST", "/tipos-servicio", { token: gT, body: { nombre: "internet" } })).json;
await call("cliente_creado", "POST", "/clientes", { token: gT, body: { dni: "70000001", nombreCompleto: "Nuevo Cliente", telefono: "999111222", direccion: "Calle 1", zonaId: zonas[0].id, servicios: [{ tipoServicioId: cable.id, montoBase: 45 }] } });
await call("cliente_actualizado", "PATCH", `/clientes/${A.id}`, { token: gT, body: { telefono: "988877766" } });
const conServ = (await call("cliente_servicio_agregado", "POST", `/clientes/${A.id}/servicios`, { token: gT, body: { tipoServicioId: tipoInternet.id, montoBase: 80 } })).json;
const servNuevo = conServ.serviciosContratados.find((s) => s.tipoServicioId === tipoInternet.id);
await call("cliente_servicio_actualizado", "PATCH", `/clientes/${A.id}/servicios/${servNuevo.id}`, { token: gT, body: { montoBase: 90 } });
await call("cliente_servicio_suspendido", "POST", `/clientes/${A.id}/servicios/${servNuevo.id}/suspender`, { token: gT });
await call("cliente_servicio_activado", "POST", `/clientes/${A.id}/servicios/${servNuevo.id}/activar`, { token: gT });
await call("descuento", "POST", `/clientes/${A.id}/servicios/${servNuevo.id}/descuentos`, { token: gT, body: { porcentaje: 10, cantidadMeses: 2 } });
await call("descuentos", "GET", `/clientes/${A.id}/servicios/${servNuevo.id}/descuentos`, { token: gT });
await call("cliente_servicio_baja", "POST", `/clientes/${A.id}/servicios/${servNuevo.id}/baja`, { token: gT, body: { motivo: "Mudanza" } });
await call("cliente_suspendido", "POST", `/clientes/${B.id}/suspender`, { token: gT });
await call("cliente_activado", "POST", `/clientes/${B.id}/activar`, { token: gT });
await call("cliente_baja", "POST", `/clientes/${D.id}/baja`, { token: gT, body: { motivo: "No pagó" } });
await call("ficha_con_historial", "GET", `/clientes/${A.id}/ficha`, { token: gT });

console.log("== boletas");
const cargosC = (await call(null, "GET", `/clientes/${C.id}/cargos-pendientes`, { token: cT })).json;
const suma = (arr) => Number(arr.reduce((a, x) => a + x.saldo, 0).toFixed(2));
await call("boleta_creada", "POST", "/boletas", { token: cT, body: { clienteId: C.id, cargoIds: cargosC.map((x) => x.id), montoPagado: suma(cargosC), metodoPago: "yape" } });
const cargosB = (await call(null, "GET", `/clientes/${B.id}/cargos-pendientes`, { token: cT })).json;
const bol2 = (await call(null, "POST", "/boletas", { token: cT, body: { clienteId: B.id, cargoIds: cargosB.map((x) => x.id), montoPagado: suma(cargosB) - 5, metodoPago: "efectivo" } })).json;
const boletas = (await call("boletas", "GET", "/boletas", { token: cT })).json;
await call("boletas_busqueda", "GET", "/boletas?busqueda=Demo", { token: cT });
await call("boleta_detalle", "GET", `/boletas/${boletas[0].id}`, { token: cT });
await call("boleta_anulada", "POST", `/boletas/${bol2.id}/anular`, { token: gT, body: {} });
await call("cargos_pendientes_parcial", "GET", `/clientes/${B.id}/cargos-pendientes`, { token: cT });

console.log("== caja");
const cats = (await call("categorias_egreso", "GET", "/categorias-egreso", { token: gT })).json;
await call("categoria_creada", "POST", "/categorias-egreso", { token: gT, body: { nombre: "Prueba QA" } });
const ahora = new Date().toISOString();
await call("movimiento_egreso", "POST", "/caja/movimientos", { token: gT, body: { tipo: "egreso", fecha: ahora, monto: 15.5, metodoPago: "efectivo", categoriaId: cats[0].id, descripcion: "Compra" } });
await call("movimiento_ingreso", "POST", "/caja/movimientos", { token: gT, body: { tipo: "ingreso", fecha: ahora, monto: 100, metodoPago: "yape", descripcion: "Aporte" } });
const y = new Date().getUTCFullYear(), m = new Date().getUTCMonth() + 1;
const desde = `${y}-${String(m).padStart(2, "0")}-01T00:00:00-05:00`;
const hasta = `${y}-${String(m).padStart(2, "0")}-30T23:59:59.999999999-05:00`;
const q = `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
await call("movimientos", "GET", `/caja/movimientos?${q}`, { token: gT });
await call("caja_resumen", "GET", `/caja/resumen?${q}`, { token: gT });
const g1 = (await call("gasto_reportado", "POST", "/caja/gastos-reportados", { token: cT, body: { monto: 12.5, descripcion: "Pasaje" } })).json;
const g2 = (await call(null, "POST", "/caja/gastos-reportados", { token: cT, body: { monto: 7, descripcion: "Almuerzo" } })).json;
await call("gastos_pendientes", "GET", "/caja/gastos-reportados?estado=pendiente", { token: gT });
await call("gasto_aprobado", "POST", `/caja/gastos-reportados/${g1.id}/aprobar`, { token: gT, body: { metodoPago: "efectivo" } });
await call("gasto_rechazado", "POST", `/caja/gastos-reportados/${g2.id}/rechazar`, { token: gT });

console.log("== usuarios, catálogos, servicios técnicos, configuración");
await call("usuarios", "GET", "/usuarios", { token: gT });
await call("usuario_creado", "POST", "/usuarios", { token: gT, body: { nombre: "Cobrador Dos", email: "cobrador2@parias.test", password: "Segura-2026-ok", rol: "cobrador" } });
const tst = (await call("tipo_st_creado", "POST", "/tipos-servicio-tecnico", { token: gT, body: { nombre: "Instalación", camposDefinicion: ["Marca", "Serie"] } })).json;
await call("tipos_st", "GET", "/tipos-servicio-tecnico", { token: cT });
await call("tipo_st_actualizado", "PATCH", `/tipos-servicio-tecnico/${tst.id}`, { token: gT, body: { nombre: "Instalación TV" } });
const st = (await call("servicio_tecnico", "POST", "/servicios-tecnicos", { token: cT, body: { tipoServicioTecnicoId: tst.id, clienteId: C.id, tecnico: "Juan", fechaProgramada: ahora, comentario: "Revisar señal", datosPropios: { Marca: "X", Serie: "123" } } })).json;
await call("servicios_tecnicos", "GET", `/servicios-tecnicos?clienteId=${C.id}`, { token: cT });
await call("servicios_tecnicos_estado", "GET", "/servicios-tecnicos?estado=pendiente", { token: cT });
await call("servicio_tecnico_comentado", "POST", `/servicios-tecnicos/${st.id}/comentar`, { token: cT, body: { comentario: "Llamé al cliente" } });
await call("servicio_tecnico_liquidado", "POST", `/servicios-tecnicos/${st.id}/liquidar`, { token: cT, body: { comentarioFinal: "Listo" } });
await call("configuracion_actualizada", "PATCH", "/configuracion", { token: gT, body: { colorPrimario: "#123456", ruc: "20123456789", telefonoContacto: "999888777" } });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const f = new FormData(); f.append("file", new Blob([png], { type: "image/png" }), "logo.png");
await call("configuracion_con_logo", "POST", "/configuracion/logo", { token: gT, form: f });
await call("configuracion_sin_logo", "DELETE", "/configuracion/logo", { token: gT });

console.log("== respuestas de error (las que la app debe traducir a mensajes)");
await call("error_400_validacion", "POST", "/clientes", { token: gT, body: { nombreCompleto: "x" }, esperado: [400] });
await call("error_409_duplicado", "POST", "/tipos-servicio", { token: gT, body: { nombre: "cable" }, esperado: [409] });
await call("error_404", "GET", "/clientes/no-existe", { token: gT, esperado: [404] });
await call("error_401", "GET", "/clientes", { esperado: [401] });
await call("error_403", "GET", "/usuarios", { token: cT, esperado: [403] });

console.log(`\nCapturas: ${total - fallos}/${total} correctas; fixtures en ${OUT}`);
console.log("archivos:", fs.readdirSync(OUT).length);
process.exit(fallos ? 1 : 0);

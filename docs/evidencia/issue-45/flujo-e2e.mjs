// Recorrido E2E contra la API real con datos ficticios (#42, #32 y #45).
// Uso: cp .env.example .env && docker compose up -d --build postgres backend
//      node docs/evidencia/issue-45/flujo-e2e.mjs http://127.0.0.1:8080
const base = process.argv[2] ?? 'http://127.0.0.1:8091';
const resultados = [];
let fallos = 0;

const DOC = '0000000050';
const OTRO = '0000000051';
const SUP = '0000000098';
const CUENTA = '0000001234';

function cab(inst, actor, rol) {
  const h = {};
  if (inst) h['X-Institucion-Id'] = inst;
  if (actor) h['X-Actor'] = actor;
  if (rol) h['X-Rol'] = rol;
  return h;
}

async function llamar(metodo, ruta, { inst, actor, rol, json, form } = {}) {
  const headers = cab(inst, actor, rol);
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const r = await fetch(base + ruta, { method: metodo, headers, body });
  const texto = await r.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { status: r.status, datos, texto, headers: r.headers };
}

function verificar(paso, condicion, detalle = '') {
  resultados.push({ paso, ok: !!condicion, detalle });
  if (!condicion) fallos++;
  console.log(`${condicion ? 'OK  ' : 'FALLA'} ${paso}${detalle ? ' — ' + detalle : ''}`);
}

function pdf(texto) {
  const form = new FormData();
  form.append('archivo', new Blob([`%PDF-1.4\n${texto}`], { type: 'application/pdf' }), 'respaldo.pdf');
  return form;
}

for (let i = 0; i < 30; i++) {
  try {
    if ((await fetch(base + '/health')).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

// 1. Preparación del admin: institución, nómina ficticia y campaña abierta.
const inst = await llamar('POST', '/api/instituciones', { json: { nombre: 'Instituto Ficticio E2E', admins: [{ documento: '0000000099', nombre: 'Admin Ficticio' }] } });
verificar('1.1 crear institución', inst.status === 201, `HTTP ${inst.status}`);
const I = inst.datos.id;
const instB = await llamar('POST', '/api/instituciones', { json: { nombre: 'Instituto Ficticio B' } });
const IB = instB.datos.id;

const carga = await llamar('POST', '/api/personas/cargar', {
  inst: I, actor: '0000000099', rol: 'Admin',
  json: { personas: [
    { documento: DOC, nombre: 'PEREZ GOMEZ ANA MARIA', correo: 'docente50@ejemplo.test' },
    { documento: OTRO, nombre: 'RUIZ LUIS', correo: 'docente51@ejemplo.test' },
  ] },
});
verificar('1.2 cargar dos personas ficticias', carga.status === 200 && carga.datos.totalCargados === 2, JSON.stringify(carga.datos));
await llamar('POST', '/api/personas/cargar', { inst: IB, actor: '0000000097', rol: 'Admin', json: { personas: [{ documento: '0000000060', correo: 'b@ejemplo.test' }] } });

const ahora = Date.now();
const camp = await llamar('POST', '/api/campanas', {
  inst: I, actor: '0000000099', rol: 'Admin',
  json: { nombre: 'Campaña ficticia 2026', fechaInicioUtc: new Date(ahora - 86400000).toISOString(), fechaFinUtc: new Date(ahora + 10 * 86400000).toISOString() },
});
verificar('1.3 abrir campaña', camp.status === 201, `HTTP ${camp.status}`);

const U = { inst: I, actor: DOC, rol: 'Usuario' };
const S = { inst: I, actor: SUP, rol: 'Supervisor' };

// 2. Contratos de #42: rutas existentes que responden 501 hasta su tarea.
verificar('2.1 hoja de vida (T-02) responde 501', (await llamar('GET', '/api/mis-datos/hoja-de-vida', U)).status === 501);
verificar('2.2 catálogo desconocido responde 400', (await llamar('GET', '/api/catalogos/noexiste', U)).status === 400);
verificar('2.3 exportar como supervisor responde 403', (await llamar('GET', '/api/exportacion/excel', S)).status === 403);
verificar('2.4 exportar como admin responde 501 (T-08)', (await llamar('GET', '/api/exportacion/excel', { inst: I, actor: '0000000099', rol: 'Admin' })).status === 501);
verificar('2.5 ruta de metadatos retirada (#32) responde 405', (await llamar('POST', '/api/mis-datos/archivos', { ...U, json: { nombreArchivo: 'x.pdf' } })).status === 405);

// 3. Cuenta bancaria del usuario (#45).
verificar('3.1 sin cuenta responde 204', (await llamar('GET', '/api/mis-datos/cuenta-bancaria', U)).status === 204);
const invalida = await llamar('PUT', '/api/mis-datos/cuenta-bancaria', { ...U, json: { tipoCuentaId: 51, numero: '12AB', nombreBancoOtro: 'Banco Ficticio' } });
verificar('3.2 número con letras responde 400', invalida.status === 400, invalida.datos?.mensaje);
const guardada = await llamar('PUT', '/api/mis-datos/cuenta-bancaria', { ...U, json: { tipoCuentaId: 51, numero: '0000-001 234', nombreBancoOtro: 'Banco Ficticio' } });
verificar('3.3 registrar cuenta', guardada.status === 200 && guardada.datos.estado === 'sin-nomina' && guardada.datos.numeroEnmascarado === '******1234', JSON.stringify(guardada.datos));
verificar('3.4 la respuesta no trae el número completo', !guardada.texto.includes(CUENTA));
const numero = await llamar('GET', '/api/mis-datos/cuenta-bancaria/numero', U);
verificar('3.5 el dueño lee su número', numero.status === 200 && numero.datos.numero === CUENTA);
verificar('3.6 lectura sin caché', (numero.headers.get('cache-control') ?? '').includes('no-store'), numero.headers.get('cache-control'));
const ajeno = await llamar('GET', `/api/mis-datos/cuenta-bancaria/numero?documento=${DOC}`, { inst: I, actor: OTRO, rol: 'Usuario' });
verificar('3.7 otra persona no lee el número ajeno (404, no tiene cuenta propia)', ajeno.status === 404);

// 4. Archivos y envío (#32): uno sin uso y uno con clave.
const sinUso = await llamar('POST', '/api/archivos/subir', { ...U, form: pdf('respaldo sin uso') });
const conClave = await llamar('POST', '/api/archivos/subir?claveDestino=cedula', { ...U, form: pdf('cedula ficticia') });
verificar('4.1 subir archivo sin clave', sinUso.status === 200, `HTTP ${sinUso.status}`);
verificar('4.2 subir archivo con clave', conClave.status === 200, `HTTP ${conClave.status}`);
await llamar('PUT', '/api/mis-datos', { ...U, json: { datosJson: '{"telefono":"0990000000"}' } });
await llamar('POST', '/api/mis-datos/aceptar-tratamiento', U);
const envio = await llamar('POST', '/api/mis-datos/enviar', U);
verificar('4.3 enviar a revisión', envio.status === 200, envio.datos?.mensaje);
const bloqueada = await llamar('PUT', '/api/mis-datos/cuenta-bancaria', { ...U, json: { tipoCuentaId: 51, numero: '0000009999', nombreBancoOtro: 'Banco Ficticio' } });
verificar('4.4 con la actualización enviada la cuenta no se modifica', bloqueada.status === 400, bloqueada.datos?.mensaje);

// 5. Supervisor: revisión de cuentas y aprobación con limpieza.
const lista = await llamar('GET', '/api/revision/cuentas-bancarias', S);
const fila = lista.datos?.find?.((e) => e.documento === DOC);
const filaOtro = lista.datos?.find?.((e) => e.documento === OTRO);
verificar('5.1 lista de cuentas de la institución', lista.status === 200 && fila?.estado === 'sin-nomina' && filaOtro?.estado === 'sin-registrar', JSON.stringify(lista.datos));
verificar('5.2 la lista no trae números completos', !lista.texto.includes(CUENTA));
const detalle = await llamar('GET', `/api/revision/${DOC}/cuenta-bancaria`, S);
verificar('5.3 detalle enmascarado', detalle.status === 200 && detalle.datos.numeroEnmascarado === '******1234' && !detalle.texto.includes(CUENTA));
verificar('5.4 el usuario no entra a la revisión de cuentas', (await llamar('GET', '/api/revision/cuentas-bancarias', U)).status === 403);
verificar('5.5 supervisor de otra institución no la ve (404)', (await llamar('GET', `/api/revision/${DOC}/cuenta-bancaria`, { inst: IB, actor: SUP, rol: 'Supervisor' })).status === 404);
const aprobar = await llamar('POST', `/api/revision/${DOC}/aprobar`, S);
verificar('5.6 aprobar', aprobar.status === 200, aprobar.datos?.mensaje);
const archivos = await llamar('GET', '/api/archivos/mis-archivos', U);
const ids = (archivos.datos ?? []).map((a) => a.id);
verificar('5.7 al aprobar se borró el archivo sin uso y quedó el de clave', !ids.includes(sinUso.datos.id) && ids.includes(conClave.datos.id), JSON.stringify(ids));

// 6. Segunda campaña (#32).
const estado = await llamar('GET', '/api/mis-datos/estado-edicion', U);
verificar('6.1 aprobado con campaña: se ofrece reabrir', estado.datos?.puedeIniciarNuevaActualizacion === true && estado.datos?.puedeEditar === false);
const reabrir = await llamar('POST', '/api/mis-datos/iniciar-actualizacion', U);
verificar('6.2 iniciar nueva actualización', reabrir.status === 200, reabrir.datos?.mensaje);
const reabrir2 = await llamar('POST', '/api/mis-datos/iniciar-actualizacion', U);
verificar('6.3 reabrir de nuevo desde borrador responde 400', reabrir2.status === 400, reabrir2.datos?.mensaje);
const corregida = await llamar('PUT', '/api/mis-datos/cuenta-bancaria', { ...U, json: { tipoCuentaId: 52, numero: '0000005678', nombreBancoOtro: 'Banco Ficticio' } });
verificar('6.4 en la nueva actualización la cuenta se puede corregir', corregida.status === 200 && corregida.datos.ultimosDigitos === '5678' && corregida.datos.tipoCuenta === 'Corriente');

console.log(JSON.stringify({ institucion: I, institucionB: IB, total: resultados.length, fallos }));
process.exit(fallos ? 1 : 0);

import { ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION, NOMBRE_DIVISION } from "./data.js";
import { calcularOverall, EDAD_RETIRO_OBLIGATORIO } from "./engine.js";

const $pantalla = () => document.getElementById("pantalla");
const $sidebar = () => document.getElementById("sidebar");
const $cabeceraTemporada = () => document.getElementById("cabecera-temporada");

function escapar(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ================= SIDEBAR ================= */
function renderSidebar(jugador) {
  const el = $sidebar();
  if (!jugador) { el.classList.add("oculto"); el.innerHTML = ""; return; }
  el.classList.remove("oculto");

  const overall = calcularOverall(jugador);
  const posicion = POSICIONES[jugador.posicionId].nombre;

  const barras = ATRIBUTOS.map((a) => {
    const v = jugador.atributos[a.id];
    return `
      <div class="barra-atributo">
        <div class="fila"><span>${a.icono} ${a.nombre}</span><span>${v}</span></div>
        <div class="barra-fondo"><div class="barra-relleno" style="width:${v}%"></div></div>
      </div>`;
  }).join("");

  const titulosTxt = jugador.titulos.length ? `<b>${jugador.titulos.length}</b> título(s)` : "Sin títulos aún";

  el.innerHTML = `
    <h2>${escapar(jugador.nombre)}</h2>
    <div class="sub">${posicion} · ${jugador.edad} años · ${escapar(jugador.pais)}</div>
    <div class="club-actual">
      🏐 <b>${escapar(jugador.club.nombre)}</b><br>
      ${NOMBRE_DIVISION[jugador.club.division]}
    </div>
    <div class="overall">
      <span class="num">${overall}</span>
      <span class="lbl">valoración<br>global</span>
    </div>
    ${barras}
    <div class="extra">
      <span>💰 Ahorros: <b>${jugador.dinero.toLocaleString("es-ES")} €</b></span>
      <span>📣 Reputación: <b>${jugador.reputacion}</b>/100</span>
      <span>🙂 Moral: <b>${jugador.moral}</b>/100</span>
      <span>🎖️ ${titulosTxt}</span>
      <span>🇪🇸 Convocatorias selección: <b>${jugador.convocatoriasSeleccion}</b></span>
    </div>
  `;
}

function actualizarCabeceraTemporada(jugador, temporadaNum) {
  const el = $cabeceraTemporada();
  if (!jugador) { el.textContent = ""; return; }
  el.textContent = `Temporada ${temporadaNum} · ${jugador.edad} años`;
}

/* ================= PANTALLA DE INICIO ================= */
function renderInicio({ hayGuardado }, cb) {
  $sidebar().classList.add("oculto");
  $cabeceraTemporada().textContent = "";
  $pantalla().innerHTML = `
    <div class="pantalla-centrada">
      <div style="font-size:3rem;">🏐</div>
      <h1>Simulador de Carrera de Vóley</h1>
      <p>Crea tu jugador o jugadora, elige su posición y vive una carrera completa, temporada a temporada, desde los 16 hasta los 38 años.</p>
      <div class="opciones horizontal" style="justify-content:center;">
        <button class="principal" id="btn-nueva">Nueva carrera</button>
        ${hayGuardado ? `<button class="secundario" id="btn-continuar">Continuar carrera</button>` : ""}
      </div>
    </div>
  `;
  document.getElementById("btn-nueva").onclick = cb.onNueva;
  if (hayGuardado) document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= CREACIÓN DE PERSONAJE ================= */
function renderCreacion(cb) {
  const estadoLocal = {
    nombre: "",
    pais: "España",
    posicionId: null,
    reparto: Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0])),
  };

  function puntosUsados() {
    return Object.values(estadoLocal.reparto).reduce((a, b) => a + b, 0);
  }

  function pintar() {
    const restantes = PUNTOS_CREACION - puntosUsados();
    const posicionesHtml = Object.entries(POSICIONES).map(([id, p]) => `
      <div class="tarjeta-posicion ${estadoLocal.posicionId === id ? "seleccionada" : ""}" data-pos="${id}">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
      </div>
    `).join("");

    let repartoHtml = "";
    if (estadoLocal.posicionId) {
      const perfil = POSICIONES[estadoLocal.posicionId];
      repartoHtml = ATRIBUTOS.filter((a) => perfil.pesos[a.id] > 0).map((a) => {
        const base = perfil.base[a.id];
        const extra = estadoLocal.reparto[a.id];
        const valor = base + extra;
        return `
          <div class="reparto-atributo">
            <span class="nombre-attr">${a.icono} ${a.nombre}</span>
            <div class="barra-fondo"><div class="barra-relleno" style="width:${valor}%"></div></div>
            <button class="btn-punto" data-op="menos" data-attr="${a.id}" ${extra <= 0 ? "disabled" : ""}>−</button>
            <span class="valor-attr">${valor}</span>
            <button class="btn-punto" data-op="mas" data-attr="${a.id}" ${(restantes <= 0 || valor >= TOPE_CREACION) ? "disabled" : ""}>+</button>
          </div>`;
      }).join("");
    }

    $pantalla().innerHTML = `
      <div class="panel">
        <h2>Crea tu jugador/a</h2>
        <div class="form-fila">
          <label>Nombre</label>
          <input type="text" id="input-nombre" maxlength="24" placeholder="Ej. Laura Martín" value="${escapar(estadoLocal.nombre)}">
        </div>
        <div class="form-fila">
          <label>País</label>
          <input type="text" id="input-pais" maxlength="24" value="${escapar(estadoLocal.pais)}">
        </div>
        <div class="form-fila">
          <label>Posición</label>
          <div class="posiciones-grid">${posicionesHtml}</div>
        </div>
        ${estadoLocal.posicionId ? `
        <div class="form-fila">
          <label>Reparto de atributos iniciales</label>
          <div class="puntos-restantes">Puntos disponibles: ${restantes}</div>
          ${repartoHtml}
        </div>` : ""}
        <div class="opciones horizontal">
          <button class="principal" id="btn-crear" ${!estadoLocal.posicionId || !estadoLocal.nombre.trim() ? "disabled" : ""}>Comenzar carrera</button>
        </div>
      </div>
    `;

    document.getElementById("input-nombre").oninput = (e) => { estadoLocal.nombre = e.target.value; pintarSoloBoton(); };
    document.getElementById("input-pais").oninput = (e) => { estadoLocal.pais = e.target.value; };
    document.querySelectorAll(".tarjeta-posicion").forEach((el) => {
      el.onclick = () => { estadoLocal.posicionId = el.dataset.pos; pintar(); };
    });
    document.querySelectorAll(".btn-punto").forEach((el) => {
      el.onclick = () => {
        const attr = el.dataset.attr;
        if (el.dataset.op === "mas" && puntosUsados() < PUNTOS_CREACION) {
          const perfil = POSICIONES[estadoLocal.posicionId];
          if (perfil.base[attr] + estadoLocal.reparto[attr] < TOPE_CREACION) estadoLocal.reparto[attr]++;
        } else if (el.dataset.op === "menos" && estadoLocal.reparto[attr] > 0) {
          estadoLocal.reparto[attr]--;
        }
        pintar();
      };
    });
    const btnCrear = document.getElementById("btn-crear");
    if (btnCrear) btnCrear.onclick = () => cb.onCrear({ ...estadoLocal });
  }

  function pintarSoloBoton() {
    const btn = document.getElementById("btn-crear");
    if (btn) btn.disabled = !estadoLocal.posicionId || !estadoLocal.nombre.trim();
  }

  pintar();
}

/* ================= PRETEMPORADA: ENTRENAMIENTO ================= */
function renderEntrenamiento(jugador, cb) {
  const opciones = ATRIBUTOS.filter((a) => POSICIONES[jugador.posicionId].pesos[a.id] > 0).map((a) => `
    <button class="opcion" data-foco="${a.id}">
      <span class="titulo-opcion">${a.icono} Trabajar ${a.nombre}</span>
      <span class="detalle-opcion">Mejora principalmente este atributo esta temporada.</span>
    </button>
  `).join("");

  $pantalla().innerHTML = `
    <div class="panel">
      <h2>Pretemporada — ${jugador.edad} años</h2>
      <p class="narrativa">Antes de que arranque la competición, decides en qué centrar tu preparación con ${escapar(jugador.club.nombre)}.</p>
      <div class="opciones">
        ${opciones}
        <button class="opcion" data-foco="descanso">
          <span class="titulo-opcion">😴 Priorizar el descanso y la recuperación física</span>
          <span class="detalle-opcion">Reduce el riesgo de lesión y mejora tu físico ligeramente.</span>
        </button>
      </div>
    </div>
  `;
  document.querySelectorAll("[data-foco]").forEach((el) => {
    el.onclick = () => cb.onElegir(el.dataset.foco);
  });
}

/* ================= EVENTO NARRATIVO (genérico) ================= */
function renderEvento(jugador, evento, titulo, cb) {
  const opciones = evento.opciones.map((op, i) => `
    <button class="opcion" data-idx="${i}">
      <span class="titulo-opcion">${escapar(op.texto)}</span>
    </button>
  `).join("");

  $pantalla().innerHTML = `
    <div class="panel">
      <h2>${titulo}</h2>
      <p class="narrativa destacada">${evento.texto(jugador)}</p>
      <div class="opciones">${opciones}</div>
    </div>
  `;
  document.querySelectorAll("[data-idx]").forEach((el) => {
    el.onclick = () => cb.onElegir(evento.opciones[Number(el.dataset.idx)]);
  });
}

function renderResultadoEvento(mensaje, cb) {
  $pantalla().innerHTML = `
    <div class="panel">
      <p class="narrativa">${escapar(mensaje)}</p>
      <div class="opciones horizontal">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= RESUMEN DE TEMPORADA ================= */
function renderResumenTemporada(jugador, resultado, cb) {
  const div = NOMBRE_DIVISION[resultado.division];
  const chips = [];
  if (resultado.esCampeon) chips.push(`<span class="chip oro">🏆 Campeón/a de ${div}</span>`);
  if (resultado.copa) chips.push(`<span class="chip oro">🥇 Copa</span>`);
  if (resultado.ascenso) chips.push(`<span class="chip verde">⬆️ Ascenso</span>`);
  if (resultado.descenso) chips.push(`<span class="chip rojo">⬇️ Descenso</span>`);
  if (resultado.lesionado) chips.push(`<span class="chip rojo">🩹 Lesión durante la temporada</span>`);
  chips.push(`<span class="chip azul">${resultado.titular ? "Titular habitual" : "Rol suplente"}</span>`);

  const s = resultado.stats;
  const esLibero = jugador.posicionId === "libero";
  const filasStats = esLibero
    ? `<tr><td>Partidos jugados</td><td>${resultado.partidosJugados}</td></tr>
       <tr><td>% de recepción positiva</td><td>${s.recepcionPct}%</td></tr>
       <tr><td>Defensas totales</td><td>${s.defensasTotales}</td></tr>`
    : `<tr><td>Partidos jugados</td><td>${resultado.partidosJugados}</td></tr>
       <tr><td>Puntos totales</td><td>${s.puntosTotales}</td></tr>
       <tr><td>Aces (saques directos)</td><td>${s.acesTotales}</td></tr>
       <tr><td>Bloqueos directos</td><td>${s.bloqueosTotales}</td></tr>`;

  $pantalla().innerHTML = `
    <div class="panel">
      <h2>Resumen de la temporada — ${jugador.edad} años</h2>
      <p class="narrativa">${escapar(jugador.club.nombre)} finaliza la temporada de ${div} en la <b>${resultado.posicion}ª posición</b>.</p>
      ${resultado.fraseFinal ? `<p class="narrativa destacada">${resultado.fraseFinal}</p>` : ""}
      <div class="chips">${chips.join("")}</div>
      <table class="tabla-stats">
        <thead><tr><th colspan="2">Tus estadísticas esta temporada</th></tr></thead>
        <tbody>${filasStats}</tbody>
      </table>
      <div class="opciones horizontal">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= CONVOCATORIA SELECCIÓN NACIONAL ================= */
function renderConvocatoria(jugador, info, cb) {
  let extra = "";
  if (info.torneoResultado) {
    extra = `<p class="narrativa destacada">Compites en <b>${info.torneoResultado.torneo}</b> con la selección de ${escapar(jugador.pais)}.<br>Resultado: <b>${info.torneoResultado.resultado}</b></p>`;
  }
  $pantalla().innerHTML = `
    <div class="panel">
      <h2>🇪🇸 Llamada de la selección</h2>
      <p class="narrativa">¡Recibes una convocatoria de la selección nacional de ${escapar(jugador.pais)}!</p>
      ${extra}
      <div class="opciones horizontal">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= FICHAJES ================= */
function renderFichajes(jugador, ofertas, permiteRetiro, cb) {
  const tarjetas = ofertas.map((o, i) => `
    <button class="opcion" data-idx="${i}">
      <span class="titulo-opcion">${o.esActual ? "Renovar con " : "Fichar por "}${escapar(o.club)}</span>
      <span class="detalle-opcion">${NOMBRE_DIVISION[o.division]} · Salario estimado: ${o.salario.toLocaleString("es-ES")} €/temporada</span>
    </button>
  `).join("");

  $pantalla().innerHTML = `
    <div class="panel">
      <h2>Mercado de fichajes</h2>
      <p class="narrativa">Estas son las propuestas que recibes de cara a la próxima temporada.</p>
      <div class="opciones">${tarjetas}</div>
      ${permiteRetiro ? `
        <div class="opciones" style="margin-top:22px;">
          <button class="opcion" id="btn-retiro">
            <span class="titulo-opcion">🏁 Poner fin a tu carrera profesional</span>
            <span class="detalle-opcion">Te retiras del vóley profesional al final de esta temporada.</span>
          </button>
        </div>` : ""}
    </div>
  `;
  document.querySelectorAll("[data-idx]").forEach((el) => {
    el.onclick = () => cb.onElegir(ofertas[Number(el.dataset.idx)]);
  });
  if (permiteRetiro) document.getElementById("btn-retiro").onclick = cb.onRetiro;
}

/* ================= RETIRO / FIN DE CARRERA ================= */
function renderRetiro(jugador, legado, cb) {
  const e = jugador.estadisticasCarrera;
  const historialClubes = jugador.historialClubes.map((c) =>
    `<tr><td>${escapar(c.club)}</td><td>${NOMBRE_DIVISION[c.division]}</td><td>Desde los ${c.desdeEdad} años</td></tr>`
  ).join("");

  const titulos = jugador.titulos.length
    ? `<div class="chips">${jugador.titulos.map((t) => `<span class="chip oro">🏆 ${t.tipo} de ${t.division} (${t.edad} años, ${escapar(t.club)})</span>`).join("")}</div>`
    : `<p class="narrativa">No conseguiste títulos, pero cada temporada dejó su huella.</p>`;

  const medallas = jugador.torneosInternacionales.length
    ? `<div class="chips">${jugador.torneosInternacionales.map((t) => `<span class="chip azul">${escapar(t.torneo)}: ${t.resultado} (${t.edad} años)</span>`).join("")}</div>`
    : "";

  $pantalla().innerHTML = `
    <div class="pantalla-centrada">
      <div style="font-size:2.4rem;">🏐👋</div>
      <h1>Fin de tu carrera profesional</h1>
      <div class="legado-titulo">${legado.titulo}</div>
      <p>${legado.descripcion}</p>
    </div>
    <div class="panel">
      <h2>Estadísticas de carrera</h2>
      <table class="tabla-stats">
        <tbody>
          <tr><td>Temporadas jugadas</td><td>${jugador.historialTemporadas.length}</td></tr>
          <tr><td>Partidos totales</td><td>${e.partidosTotales}</td></tr>
          <tr><td>Puntos totales anotados</td><td>${e.puntosTotales}</td></tr>
          <tr><td>Aces totales</td><td>${e.acesTotales}</td></tr>
          <tr><td>Bloqueos directos totales</td><td>${e.bloqueosTotales}</td></tr>
          <tr><td>Temporadas como titular</td><td>${e.temporadasComoTitular}</td></tr>
          <tr><td>Convocatorias con la selección</td><td>${jugador.convocatoriasSeleccion}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="panel">
      <h2>Palmarés</h2>
      ${titulos}
      ${medallas}
    </div>
    <div class="panel">
      <h2>Clubes defendidos</h2>
      <table class="tabla-stats">
        <thead><tr><th>Club</th><th>División</th><th>Etapa</th></tr></thead>
        <tbody>${historialClubes}</tbody>
      </table>
    </div>
    <div class="opciones horizontal" style="justify-content:center; margin-top:20px;">
      <button class="principal" id="btn-nueva-carrera">Empezar una nueva carrera</button>
    </div>
  `;
  document.getElementById("btn-nueva-carrera").onclick = cb.onNuevaCarrera;
}

export {
  renderSidebar, actualizarCabeceraTemporada, renderInicio, renderCreacion,
  renderEntrenamiento, renderEvento, renderResultadoEvento, renderResumenTemporada,
  renderConvocatoria, renderFichajes, renderRetiro,
};

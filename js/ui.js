import { ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION, PAISES } from "./data.js";
import { calcularOverall } from "./engine.js";

const $pantalla = () => document.getElementById("pantalla");
const $sidebar = () => document.getElementById("sidebar");
const $cabeceraTemporada = () => document.getElementById("cabecera-temporada");

function escapar(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* Al cambiar de pantalla volvemos arriba: si no, el usuario aparece a media
   página y la cabecera fija le tapa el título. */
function irArriba() {
  window.scrollTo({ top: 0, behavior: "auto" });
}

function etiquetaDivision(division) {
  return division === "primera" ? "1ª división" : "2ª división";
}

/* ================= SIDEBAR / FICHA DEL JUGADOR ================= */
function renderSidebar(jugador) {
  const el = $sidebar();
  if (!jugador) { el.classList.add("oculto"); el.innerHTML = ""; return; }
  el.classList.remove("oculto");

  const overall = calcularOverall(jugador);
  const posicion = POSICIONES[jugador.posicionId].nombre;
  const paisJugador = PAISES[jugador.paisId];
  const ligaClub = PAISES[jugador.club.paisId].ligas[jugador.club.division];

  const barras = ATRIBUTOS.map((a) => {
    const v = jugador.atributos[a.id];
    return `
      <div class="barra-atributo">
        <div class="fila"><span>${a.icono} ${a.nombre}</span><span class="valor">${v}</span></div>
        <div class="barra-fondo"><div class="barra-relleno" style="width:${v}%"></div></div>
      </div>`;
  }).join("");

  const titulosTxt = jugador.titulos.length ? `${jugador.titulos.length}` : "0";

  el.innerHTML = `
    <div class="jugador-cabecera">
      <div class="overall-ring" style="--pct:${overall}">
        <div class="overall-ring-inner">
          <span class="num">${overall}</span>
          <span class="lbl">GLOBAL</span>
        </div>
      </div>
      <div class="jugador-info">
        <h2>${escapar(jugador.nombre)}</h2>
        <div class="sub">${posicion}<br>${jugador.edad} años · ${escapar(paisJugador.nombre)}</div>
      </div>
    </div>

    <div class="club-actual">
      🏐 <b>${escapar(jugador.club.nombre)}</b><br>
      <span class="liga-linea">${escapar(ligaClub.nombre)} · ${etiquetaDivision(jugador.club.division)}</span>
    </div>

    <div class="bloque-titulo">Atributos</div>
    <div class="atributos">${barras}</div>

    <div class="extra">
      <span>💰 Ahorros <b>${jugador.dinero.toLocaleString("es-ES")} €</b></span>
      <span>📣 Reputación <b>${jugador.reputacion}/100</b></span>
      <span>🙂 Moral <b>${jugador.moral}/100</b></span>
      <span>🏆 Títulos <b>${titulosTxt}</b></span>
      <span>🌐 Selección <b>${jugador.convocatoriasSeleccion}</b></span>
    </div>
  `;
}

function actualizarCabeceraTemporada(jugador, temporadaNum) {
  const el = $cabeceraTemporada();
  if (!jugador) { el.textContent = ""; return; }
  el.textContent = `Temp. ${temporadaNum} · ${jugador.edad} años`;
}

/* ================= PANTALLA DE INICIO ================= */
function renderInicio({ hayGuardado }, cb) {
  $sidebar().classList.add("oculto");
  $cabeceraTemporada().textContent = "";
  irArriba();
  $pantalla().innerHTML = `
    <div class="pantalla-centrada">
      <div class="balon-hero">🏐</div>
      <h1>Vive tu <span class="resalte">carrera de vóley</span></h1>
      <p>Crea tu jugador o jugadora, elige selección y posición, y recorre una carrera completa —de los 16 a los 38 años— desde la segunda división hasta las mejores ligas del mundo.</p>
      <div class="opciones horizontal" style="justify-content:center; max-width:340px; width:100%;">
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
  irArriba();
  const estadoLocal = {
    nombre: "",
    paisId: null,
    posicionId: null,
    reparto: Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0])),
  };

  function puntosUsados() {
    return Object.values(estadoLocal.reparto).reduce((a, b) => a + b, 0);
  }

  function pintar() {
    const restantes = PUNTOS_CREACION - puntosUsados();

    const paisesHtml = Object.entries(PAISES).map(([id, p]) => `
      <div class="tarjeta-opcion ${estadoLocal.paisId === id ? "seleccionada" : ""}" data-pais="${id}">
        <h3>${p.nombre}</h3>
        <p>${p.ligas.primera.nombre}<br>${p.ligas.segunda.nombre}</p>
      </div>
    `).join("");

    const posicionesHtml = Object.entries(POSICIONES).map(([id, p]) => `
      <div class="tarjeta-opcion ${estadoLocal.posicionId === id ? "seleccionada" : ""}" data-pos="${id}">
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
            <button class="btn-punto" data-op="menos" data-attr="${a.id}" ${extra <= 0 ? "disabled" : ""}>−</button>
            <span class="valor-attr">${valor}</span>
            <button class="btn-punto" data-op="mas" data-attr="${a.id}" ${(restantes <= 0 || valor >= TOPE_CREACION) ? "disabled" : ""}>+</button>
            <div class="barra-fondo"><div class="barra-relleno" style="width:${valor}%"></div></div>
          </div>`;
      }).join("");
    }

    const listo = estadoLocal.posicionId && estadoLocal.paisId && estadoLocal.nombre.trim();

    $pantalla().innerHTML = `
      <div class="panel">
        <h2>Crea tu jugador/a</h2>

        <div class="form-fila">
          <label for="input-nombre">Nombre</label>
          <input type="text" id="input-nombre" maxlength="24" placeholder="Ej. Laura Martín" value="${escapar(estadoLocal.nombre)}">
        </div>

        <div class="form-fila">
          <label>País — empezarás en la 2ª división</label>
          <div class="tarjetas-grid">${paisesHtml}</div>
        </div>

        <div class="form-fila">
          <label>Posición</label>
          <div class="tarjetas-grid">${posicionesHtml}</div>
        </div>

        ${estadoLocal.posicionId ? `
        <div class="form-fila">
          <label>Reparto de atributos</label>
          <div class="puntos-restantes"><b>${restantes}</b> puntos disponibles</div>
          ${repartoHtml}
        </div>` : ""}

        <div class="opciones">
          <button class="principal" id="btn-crear" ${listo ? "" : "disabled"}>Comenzar carrera</button>
        </div>
      </div>
    `;

    document.getElementById("input-nombre").oninput = (e) => {
      estadoLocal.nombre = e.target.value;
      const btn = document.getElementById("btn-crear");
      if (btn) btn.disabled = !(estadoLocal.posicionId && estadoLocal.paisId && estadoLocal.nombre.trim());
    };
    document.querySelectorAll("[data-pais]").forEach((el) => {
      el.onclick = () => { estadoLocal.paisId = el.dataset.pais; pintar(); };
    });
    document.querySelectorAll("[data-pos]").forEach((el) => {
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

  pintar();
}

/* ================= PRETEMPORADA: ENTRENAMIENTO ================= */
function renderEntrenamiento(jugador, cb) {
  const opciones = ATRIBUTOS.filter((a) => POSICIONES[jugador.posicionId].pesos[a.id] > 0).map((a) => `
    <button class="ficha-entreno" data-foco="${a.id}">
      <span class="ficha-icono">${a.icono}</span>
      <span class="ficha-nombre">${a.nombre}</span>
      <span class="ficha-valor">${jugador.atributos[a.id]}</span>
    </button>
  `).join("");

  irArriba();
  $pantalla().innerHTML = `
    <div class="panel">
      <h2>Pretemporada · ${jugador.edad} años</h2>
      <p class="narrativa">¿En qué centras tu preparación con <b>${escapar(jugador.club.nombre)}</b>?</p>
      <div class="rejilla-entreno">
        ${opciones}
        <button class="ficha-entreno ancha" data-foco="descanso">
          <span class="ficha-icono">😴</span>
          <span class="ficha-texto">
            <span class="ficha-nombre">Descanso y recuperación</span>
            <span class="ficha-detalle">Mejora tu físico y tu moral, reduciendo el riesgo de lesión.</span>
          </span>
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

  irArriba();
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
  irArriba();
  $pantalla().innerHTML = `
    <div class="panel">
      <p class="narrativa destacada">${escapar(mensaje)}</p>
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= RESUMEN DE TEMPORADA ================= */
function renderResumenTemporada(jugador, resultado, cb) {
  const liga = PAISES[jugador.club.paisId].ligas[jugador.club.division];
  const chips = [];
  if (resultado.esCampeon) chips.push(`<span class="chip oro">🏆 Campeón/a de ${escapar(liga.nombre)}</span>`);
  if (resultado.copa) chips.push(`<span class="chip oro">🥇 Copa</span>`);
  if (resultado.temporadaDificil) chips.push(`<span class="chip rojo">📉 Temporada difícil</span>`);
  if (resultado.lesionado) chips.push(`<span class="chip rojo">🩹 Lesión</span>`);
  chips.push(`<span class="chip azul">${resultado.titular ? "⭐ Titular habitual" : "🪑 Rol suplente"}</span>`);

  const s = resultado.stats;
  const esLibero = jugador.posicionId === "libero";
  const tiles = esLibero
    ? `<div class="stat-tile"><span class="stat-valor">${resultado.partidosJugados}</span><span class="stat-label">Partidos</span></div>
       <div class="stat-tile fria"><span class="stat-valor">${s.recepcionPct}%</span><span class="stat-label">Recepción</span></div>
       <div class="stat-tile fria"><span class="stat-valor">${s.defensasTotales}</span><span class="stat-label">Defensas</span></div>`
    : `<div class="stat-tile"><span class="stat-valor">${s.puntosTotales}</span><span class="stat-label">Puntos</span></div>
       <div class="stat-tile"><span class="stat-valor">${resultado.partidosJugados}</span><span class="stat-label">Partidos</span></div>
       <div class="stat-tile fria"><span class="stat-valor">${s.acesTotales}</span><span class="stat-label">Aces</span></div>
       <div class="stat-tile fria"><span class="stat-valor">${s.bloqueosTotales}</span><span class="stat-label">Bloqueos</span></div>`;

  irArriba();
  $pantalla().innerHTML = `
    <div class="panel">
      <h2>Temporada · ${jugador.edad} años</h2>
      <p class="narrativa"><b>${escapar(jugador.club.nombre)}</b> termina ${escapar(liga.nombre)} en la <b>${resultado.posicion}ª posición</b> de ${resultado.nClubes}.</p>
      ${resultado.fraseFinal ? `<p class="narrativa destacada">${resultado.fraseFinal}</p>` : ""}
      <div class="chips">${chips.join("")}</div>
      <div class="stats-grid">${tiles}</div>
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= CONVOCATORIA SELECCIÓN NACIONAL ================= */
function renderConvocatoria(jugador, info, cb) {
  const paisJugador = PAISES[jugador.paisId];
  let extra = "";
  if (info.torneoResultado) {
    extra = `
      <p class="narrativa destacada">
        Compites en <b>${escapar(info.torneoResultado.torneo)}</b> con la selección ${escapar(paisJugador.gentilicio)}.
      </p>
      <div class="chips"><span class="chip oro">${escapar(info.torneoResultado.resultado)}</span></div>`;
  }
  irArriba();
  $pantalla().innerHTML = `
    <div class="panel">
      <h2>📣 Llamada de la selección</h2>
      <p class="narrativa">¡Recibes una convocatoria de la selección ${escapar(paisJugador.gentilicio)}!</p>
      ${extra}
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `;
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= FICHAJES ================= */
function renderFichajes(jugador, ofertas, permiteRetiro, cb) {
  const tarjetas = ofertas.map((o, i) => {
    const paisOferta = PAISES[o.paisId];
    const ligaOferta = paisOferta.ligas[o.division];
    const insignias = [];
    if (o.esActual) insignias.push(`<span class="chip">Tu club</span>`);
    if (o.ascenso) insignias.push(`<span class="chip verde">⬆️ Ascenso a 1ª</span>`);
    if (o.internacional) insignias.push(`<span class="chip azul">🌍 ${escapar(paisOferta.nombre)}</span>`);

    return `
    <button class="opcion" data-idx="${i}">
      <span class="titulo-opcion">${o.esActual ? "Renovar con " : "Fichar por "}${escapar(o.club)}</span>
      <span class="detalle-opcion">${escapar(ligaOferta.nombre)} · ${etiquetaDivision(o.division)} · ${o.salario.toLocaleString("es-ES")} €/temporada</span>
      ${insignias.length ? `<span class="chips">${insignias.join("")}</span>` : ""}
    </button>`;
  }).join("");

  irArriba();
  $pantalla().innerHTML = `
    <div class="panel">
      <h2>Mercado de fichajes</h2>
      <p class="narrativa">Estas son las propuestas que recibes de cara a la próxima temporada.</p>
      <div class="opciones">${tarjetas}</div>
      ${permiteRetiro ? `
        <div class="opciones" style="margin-top:20px;">
          <button class="opcion" id="btn-retiro">
            <span class="titulo-opcion">🏁 Poner fin a tu carrera profesional</span>
            <span class="detalle-opcion">Te retiras del vóley profesional y cierras tu palmarés.</span>
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

  const historialClubes = jugador.historialClubes.map((c) => {
    const liga = PAISES[c.paisId].ligas[c.division];
    return `<tr>
      <td>${escapar(c.club)}</td>
      <td>${escapar(liga.nombre)} · ${etiquetaDivision(c.division)} (${escapar(PAISES[c.paisId].nombre)})</td>
      <td>${c.desdeEdad} años</td>
    </tr>`;
  }).join("");

  const titulos = jugador.titulos.length
    ? `<div class="chips">${jugador.titulos.map((t) =>
        `<span class="chip oro">🏆 ${t.tipo} — ${escapar(t.liga)} · ${t.edad} años</span>`).join("")}</div>`
    : `<p class="narrativa">No conseguiste títulos, pero cada temporada dejó su huella.</p>`;

  const medallas = jugador.torneosInternacionales.length
    ? `<div class="chips">${jugador.torneosInternacionales.map((t) =>
        `<span class="chip azul">${escapar(t.torneo)}: ${escapar(t.resultado)} · ${t.edad} años</span>`).join("")}</div>`
    : "";

  const esLibero = jugador.posicionId === "libero";
  const tilesCarrera = `
    <div class="stat-tile"><span class="stat-valor">${jugador.historialTemporadas.length}</span><span class="stat-label">Temporadas</span></div>
    <div class="stat-tile"><span class="stat-valor">${e.partidosTotales}</span><span class="stat-label">Partidos</span></div>
    ${esLibero
      ? `<div class="stat-tile fria"><span class="stat-valor">${e.defensasTotales}</span><span class="stat-label">Defensas</span></div>`
      : `<div class="stat-tile"><span class="stat-valor">${e.puntosTotales}</span><span class="stat-label">Puntos</span></div>
         <div class="stat-tile fria"><span class="stat-valor">${e.acesTotales}</span><span class="stat-label">Aces</span></div>
         <div class="stat-tile fria"><span class="stat-valor">${e.bloqueosTotales}</span><span class="stat-label">Bloqueos</span></div>`}
    <div class="stat-tile fria"><span class="stat-valor">${jugador.convocatoriasSeleccion}</span><span class="stat-label">Selección</span></div>
  `;

  irArriba();
  $pantalla().innerHTML = `
    <div class="pantalla-centrada">
      <div class="balon-hero">🏐</div>
      <h1>Fin de tu carrera</h1>
      <div class="legado-titulo">${escapar(legado.titulo)}</div>
      <p>${escapar(legado.descripcion)}</p>
    </div>

    <div class="panel">
      <h2>Estadísticas de carrera</h2>
      <div class="stats-grid">${tilesCarrera}</div>
    </div>

    <div class="panel">
      <h2>Palmarés</h2>
      ${titulos}
      ${medallas}
    </div>

    <div class="panel">
      <h2>Clubes defendidos</h2>
      <div class="tabla-envoltorio">
        <table class="tabla-stats">
          <thead><tr><th>Club</th><th>Competición</th><th>Desde</th></tr></thead>
          <tbody>${historialClubes}</tbody>
        </table>
      </div>
    </div>

    <div class="opciones" style="margin-top:18px;">
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

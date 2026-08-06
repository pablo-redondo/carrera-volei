import { ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION, PAISES } from "./data.js";
import { calcularOverall, calcularOverallMedio, calcularOverallMaximo } from "./engine.js";

const $pantalla = () => document.getElementById("pantalla");
const $sidebar = () => document.getElementById("sidebar");
const $cabeceraTemporada = () => document.getElementById("cabecera-temporada");
const $cabeceraOverall = () => document.getElementById("cabecera-overall");

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

const balonSvg = (clase = "") => `<svg class="${clase}" viewBox="0 0 100 100" aria-hidden="true"><use href="#ico-balon"/></svg>`;

/* Anima los números de las tarjetas de estadística contando hasta su valor. */
function animarContadores(raiz) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  raiz.querySelectorAll("[data-contador]").forEach((el) => {
    const destino = Number(el.dataset.contador);
    if (!Number.isFinite(destino) || destino === 0) return;
    const sufijo = el.dataset.sufijo || "";
    const duracion = 750;
    const inicio = performance.now();
    function paso(ahora) {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(destino * suave).toLocaleString("es-ES") + sufijo;
      if (t < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  });
}

/* Pinta una pantalla nueva: sube arriba, inserta el HTML y lanza las animaciones. */
function pintarPantalla(html) {
  irArriba();
  const el = $pantalla();
  el.innerHTML = html;
  animarContadores(el);
  return el;
}

/* ================= FICHA DEL JUGADOR ================= */
function renderSidebar(jugador, opts = {}) {
  const el = $sidebar();
  if (!jugador) {
    el.classList.add("oculto");
    el.innerHTML = "";
    $cabeceraOverall().textContent = "";
    return;
  }
  el.classList.remove("oculto");

  const overall = opts.overallOverride ?? calcularOverall(jugador);
  const etiquetaOverall = opts.etiquetaOverall ?? "GLOBAL";
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

  el.innerHTML = `
    <div class="jugador-cabecera">
      <div class="overall-ring" style="--pct:${overall}">
        <div class="overall-ring-inner">
          <span class="num">${overall}</span>
          <span class="lbl">${escapar(etiquetaOverall)}</span>
        </div>
      </div>
      <div class="jugador-info">
        <h2>${escapar(jugador.nombre)}</h2>
        <div class="sub">${posicion} · ${jugador.edad} años<br>${escapar(paisJugador.nombre)}</div>
      </div>
    </div>

    <div class="club-actual">
      ${balonSvg("club-balon")}
      <span class="club-txt">
        <b>${escapar(jugador.club.nombre)}</b>
        <span class="liga-linea">${escapar(ligaClub.nombre)} · ${etiquetaDivision(jugador.club.division)}</span>
      </span>
    </div>

    <div class="bloque-titulo">Atributos</div>
    <div class="atributos">${barras}</div>

    <div class="bloque-titulo">Estado</div>
    <div class="mini-stats">
      <div class="mini-stat"><span class="mini-icono">💰</span><span class="mini-label">Ahorros</span><span class="mini-valor">${jugador.dinero.toLocaleString("es-ES")} €</span></div>
      <div class="mini-stat"><span class="mini-icono">📣</span><span class="mini-label">Reputación</span><span class="mini-valor">${jugador.reputacion}/100</span></div>
      <div class="mini-stat"><span class="mini-icono">🙂</span><span class="mini-label">Moral</span><span class="mini-valor">${jugador.moral}/100</span></div>
      <div class="mini-stat"><span class="mini-icono">🏆</span><span class="mini-label">Títulos</span><span class="mini-valor">${jugador.titulos.length}</span></div>
      <div class="mini-stat"><span class="mini-icono">🌐</span><span class="mini-label">Selección</span><span class="mini-valor">${jugador.convocatoriasSeleccion}</span></div>
    </div>
  `;

  // En móvil la ficha queda debajo, así que la valoración se duplica en la cabecera.
  $cabeceraOverall().innerHTML = `${escapar(etiquetaOverall === "GLOBAL" ? "GLOBAL" : "MEDIA")} <b>${overall}</b>`;
}

function actualizarCabeceraTemporada(jugador, temporadaNum) {
  const el = $cabeceraTemporada();
  if (!jugador) { el.textContent = ""; return; }
  el.textContent = `T${temporadaNum} · ${jugador.edad} años`;
}

/* ================= PANTALLA DE INICIO ================= */
function renderInicio({ hayGuardado }, cb) {
  $sidebar().classList.add("oculto");
  $cabeceraTemporada().textContent = "";
  $cabeceraOverall().textContent = "";
  pintarPantalla(`
    <div class="hero">
      ${balonSvg("balon-hero")}
      <h1>Vive tu <span class="resalte">carrera de vóley</span></h1>
      <p>Crea tu jugador o jugadora, elige selección y posición, y recorre una carrera completa —de los 16 a los 38 años— desde la segunda división hasta las mejores ligas del mundo.</p>
      <div class="acciones">
        <button class="principal" id="btn-nueva">Nueva carrera</button>
        ${hayGuardado ? `<button class="secundario" id="btn-continuar">Continuar carrera</button>` : ""}
      </div>
    </div>
  `);
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

    const paisesHtml = Object.entries(PAISES).map(([id, p], i) => `
      <div class="tarjeta-opcion ${estadoLocal.paisId === id ? "seleccionada" : ""}" data-pais="${id}" style="--i:${i}">
        <h3>${p.nombre}</h3>
        <p>${p.ligas.primera.nombre}<br>${p.ligas.segunda.nombre}</p>
      </div>
    `).join("");

    const posicionesHtml = Object.entries(POSICIONES).map(([id, p], i) => `
      <div class="tarjeta-opcion ${estadoLocal.posicionId === id ? "seleccionada" : ""}" data-pos="${id}" style="--i:${i}">
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
        <div class="panel-cabecera">
          <div>
            <span class="eyebrow">Nueva carrera</span>
            <h2>Crea tu jugador/a</h2>
          </div>
        </div>

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
  const entrenables = ATRIBUTOS.filter((a) => POSICIONES[jugador.posicionId].pesos[a.id] > 0);
  const opciones = entrenables.map((a, i) => `
    <button class="ficha-entreno" data-foco="${a.id}" style="--i:${i}">
      <span class="ficha-icono">${a.icono}</span>
      <span class="ficha-nombre">${a.nombre}</span>
      <span class="ficha-valor">${jugador.atributos[a.id]}</span>
    </button>
  `).join("");

  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">Pretemporada</span>
          <h2>${jugador.edad} años · ${escapar(jugador.club.nombre)}</h2>
        </div>
      </div>
      <p class="narrativa">¿En qué centras tu preparación esta temporada?</p>
      <div class="rejilla-entreno">
        ${opciones}
        <button class="ficha-entreno ancha" data-foco="descanso" style="--i:${entrenables.length}">
          <span class="ficha-icono">😴</span>
          <span class="ficha-texto">
            <span class="ficha-nombre">Descanso y recuperación</span>
            <span class="ficha-detalle">Mejora tu físico y tu moral, reduciendo el riesgo de lesión.</span>
          </span>
        </button>
      </div>
    </div>
  `);
  document.querySelectorAll("[data-foco]").forEach((el) => {
    el.onclick = () => cb.onElegir(el.dataset.foco);
  });
}

/* ================= EVENTO NARRATIVO ================= */
function renderEvento(jugador, evento, titulo, cb) {
  const opciones = evento.opciones.map((op, i) => `
    <button class="opcion" data-idx="${i}">
      <span class="titulo-opcion">${escapar(op.texto)}</span>
    </button>
  `).join("");

  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">${escapar(titulo)}</span>
          <h2>Tienes que decidir</h2>
        </div>
      </div>
      <p class="narrativa destacada">${evento.texto(jugador)}</p>
      <div class="opciones">${opciones}</div>
    </div>
  `);
  document.querySelectorAll("[data-idx]").forEach((el) => {
    el.onclick = () => cb.onElegir(evento.opciones[Number(el.dataset.idx)]);
  });
}

function renderResultadoEvento(mensaje, cb) {
  pintarPantalla(`
    <div class="panel">
      <span class="eyebrow">Consecuencias</span>
      <p class="narrativa destacada">${escapar(mensaje)}</p>
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `);
  document.getElementById("btn-continuar").onclick = cb.onContinuar;
}

/* ================= RESUMEN DE TEMPORADA ================= */
function renderResumenTemporada(jugador, resultado, cb) {
  // Ojo: si el club ascendió/descendió esta misma temporada, jugador.club.division
  // ya apunta a la división NUEVA — para el resumen usamos la que realmente se jugó.
  const liga = PAISES[jugador.club.paisId].ligas[resultado.divisionJugada];
  const chips = [];
  if (resultado.esCampeon) chips.push(`<span class="chip oro destaca">🏆 Campeón/a de ${escapar(liga.nombre)}</span>`);
  if (resultado.copa) chips.push(`<span class="chip oro">🥇 Copa</span>`);
  if (resultado.ascensoDivision) chips.push(`<span class="chip verde destaca">⬆️ ¡Asciende a 1ª división!</span>`);
  if (resultado.descensoDivision) chips.push(`<span class="chip rojo">⬇️ Desciende a 2ª división</span>`);
  if (resultado.temporadaDificil && !resultado.descensoDivision) chips.push(`<span class="chip rojo">📉 Temporada difícil</span>`);
  if (resultado.lesionado) chips.push(`<span class="chip rojo">🩹 Lesión</span>`);
  chips.push(`<span class="chip azul">${resultado.titular ? "⭐ Titular habitual" : "🪑 Rol suplente"}</span>`);
  const chipsHtml = chips.map((c, i) => c.replace('class="chip', `style="--i:${i}" class="chip`)).join("");

  const s = resultado.stats;
  const esLibero = jugador.posicionId === "libero";
  const tilesDatos = esLibero
    ? [["", resultado.partidosJugados, "Partidos", ""], ["fria", s.recepcionPct, "Recepción", "%"], ["fria", s.defensasTotales, "Defensas", ""]]
    : [["", s.puntosTotales, "Puntos", ""], ["", resultado.partidosJugados, "Partidos", ""], ["fria", s.acesTotales, "Aces", ""], ["fria", s.bloqueosTotales, "Bloqueos", ""]];
  const tiles = tilesDatos.map(([clase, valor, label, sufijo], i) => `
    <div class="stat-tile ${clase}" style="--i:${i}">
      <span class="stat-valor" data-contador="${valor}" data-sufijo="${sufijo}">0${sufijo}</span>
      <span class="stat-label">${label}</span>
    </div>`).join("");

  const fin = resultado.finanzas;
  let finanzasHtml = "";
  if (fin) {
    const signo = fin.neto >= 0 ? "+" : "";
    finanzasHtml = `
      <div class="bloque-titulo">Finanzas de la temporada</div>
      <div class="chips">
        <span class="chip ${fin.neto >= 0 ? "verde" : "rojo"}">💶 ${signo}${fin.neto.toLocaleString("es-ES")} € netos</span>
      </div>
      ${fin.evento ? `<p class="narrativa destacada">💸 ${escapar(fin.evento.texto)} (${fin.evento.delta >= 0 ? "+" : ""}${fin.evento.delta.toLocaleString("es-ES")} €)</p>` : ""}
    `;
  }

  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">Fin de temporada · ${jugador.edad} años</span>
          <h2>${resultado.posicion}º de ${resultado.nClubes} en ${escapar(liga.nombre)}</h2>
        </div>
      </div>
      <p class="narrativa"><b>${escapar(jugador.club.nombre)}</b> cierra la temporada en la <b>${resultado.posicion}ª posición</b>.</p>
      ${resultado.fraseFinal ? `<p class="narrativa destacada">${resultado.fraseFinal}</p>` : ""}
      <div class="chips">${chipsHtml}</div>
      <div class="stats-grid">${tiles}</div>
      ${finanzasHtml}
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `);
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
      <div class="chips"><span class="chip oro destaca">${escapar(info.torneoResultado.resultado)}</span></div>`;
  }
  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">Selección nacional</span>
          <h2>📣 Te llaman</h2>
        </div>
      </div>
      <p class="narrativa">¡Recibes una convocatoria de la selección ${escapar(paisJugador.gentilicio)}!</p>
      ${extra}
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `);
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

  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">Mercado de fichajes</span>
          <h2>¿Dónde jugarás?</h2>
        </div>
      </div>
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
  `);
  document.querySelectorAll("[data-idx]").forEach((el) => {
    el.onclick = () => cb.onElegir(ofertas[Number(el.dataset.idx)]);
  });
  if (permiteRetiro) document.getElementById("btn-retiro").onclick = cb.onRetiro;
}

/* ================= RETIRO / FIN DE CARRERA ================= */
function renderRetiro(jugador, legado, cb) {
  const e = jugador.estadisticasCarrera;

  const historialClubes = jugador.historialClubes.map((c) => {
    const pais = PAISES[c.paisId];
    // Si el club cambió de categoría durante la etapa, se listan las dos ligas.
    const divisiones = c.divisiones && c.divisiones.length ? c.divisiones : [c.division];
    const competiciones = divisiones
      .map((d) => `${escapar(pais.ligas[d].nombre)} <span class="tenue">(${etiquetaDivision(d)})</span>`)
      .join(" → ");
    return `<tr>
      <td>${escapar(c.club)}<br><span class="tenue">${escapar(pais.nombre)}</span></td>
      <td>${competiciones}</td>
      <td>${c.desdeEdad} años</td>
    </tr>`;
  }).join("");

  const titulos = jugador.titulos.length
    ? `<div class="chips">${jugador.titulos.map((t, i) =>
        `<span style="--i:${i}" class="chip oro">🏆 ${t.tipo} — ${escapar(t.liga)} · ${t.edad} años</span>`).join("")}</div>`
    : `<p class="narrativa">No conseguiste títulos, pero cada temporada dejó su huella.</p>`;

  const medallas = jugador.torneosInternacionales.length
    ? `<div class="chips">${jugador.torneosInternacionales.map((t, i) =>
        `<span style="--i:${i}" class="chip azul">${escapar(t.torneo)}: ${escapar(t.resultado)} · ${t.edad} años</span>`).join("")}</div>`
    : "";

  const esLibero = jugador.posicionId === "libero";
  const datos = [
    ["", calcularOverallMedio(jugador), "Media global"],
    ["fria", calcularOverallMaximo(jugador), "Máxima global"],
    ["", jugador.historialTemporadas.length, "Temporadas"],
    ["", e.partidosTotales, "Partidos"],
    ...(esLibero
      ? [["fria", e.defensasTotales, "Defensas"]]
      : [["", e.puntosTotales, "Puntos"], ["fria", e.acesTotales, "Aces"], ["fria", e.bloqueosTotales, "Bloqueos"]]),
    ["fria", jugador.convocatoriasSeleccion, "Selección"],
  ];
  const tilesCarrera = datos.map(([clase, valor, label], i) => `
    <div class="stat-tile ${clase}" style="--i:${i}">
      <span class="stat-valor" data-contador="${valor}">0</span>
      <span class="stat-label">${label}</span>
    </div>`).join("");

  pintarPantalla(`
    <div class="hero">
      <svg class="trofeo-hero" viewBox="0 0 100 100" aria-hidden="true"><use href="#ico-trofeo"/></svg>
      <h1>Fin de tu carrera</h1>
      <div class="legado-titulo">${escapar(legado.titulo)}</div>
      <p>${escapar(legado.descripcion)}</p>
    </div>

    <div class="panel">
      <span class="eyebrow">Balance</span>
      <h2>Estadísticas de carrera</h2>
      <div class="stats-grid">${tilesCarrera}</div>
    </div>

    <div class="panel">
      <span class="eyebrow">Vitrina</span>
      <h2>Palmarés</h2>
      ${titulos}
      ${medallas}
    </div>

    <div class="panel">
      <span class="eyebrow">Trayectoria</span>
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
  `);
  document.getElementById("btn-nueva-carrera").onclick = cb.onNuevaCarrera;
}

export {
  renderSidebar, actualizarCabeceraTemporada, renderInicio, renderCreacion,
  renderEntrenamiento, renderEvento, renderResultadoEvento, renderResumenTemporada,
  renderConvocatoria, renderFichajes, renderRetiro,
};

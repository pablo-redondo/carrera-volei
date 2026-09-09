import { ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION, PAISES } from "./data.js";
import {
  calcularOverall, calcularOverallMedio, calcularOverallMaximo, equiposIniciales,
  clamp as clampNumero, EDAD_INICIAL, EDAD_RETIRO_OBLIGATORIO, probabilidadesOpcion,
} from "./engine.js";
import { LOGROS, cargarDesbloqueados } from "./logros.js";
import { escudoClub, emblemaLiga, trofeoSvg, ico, colorClub, nivelOverall, banderaSvg } from "./graficos.js";

const $pantalla = () => document.getElementById("pantalla");
const $ficha = () => document.getElementById("ficha");
const $trayectoria = () => document.getElementById("trayectoria");
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

/* Cifras cortas para los huecos estrechos de la ficha: por debajo de mil no
   se abrevia (un "0K €" al empezar la carrera quedaba raro). */
function formatearDinero(valor) {
  const v = Math.round(valor);
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1).replace(".", ",")}M €`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}K €`;
  return `${v} €`;
}

const balonSvg = (clase = "") => `<svg class="${clase}" viewBox="0 0 100 100" aria-hidden="true"><use href="#ico-balon"/></svg>`;

/* Anima los números de las tarjetas de estadística contando hasta su valor. */
function animarContadores(raiz) {
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  raiz.querySelectorAll("[data-contador]").forEach((el) => {
    const destino = Number(el.dataset.contador);
    const sufijo = el.dataset.sufijo || "";
    // Sin animación (o si no hay nada que contar) mostramos ya el valor final:
    // de lo contrario la cifra se quedaría congelada en 0.
    if (!Number.isFinite(destino) || destino === 0 || sinMovimiento) {
      el.textContent = (Number.isFinite(destino) ? destino : 0).toLocaleString("es-ES") + sufijo;
      return;
    }
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
/* Cabecera con la valoración en grande, el club como banner (con su escudo
   de marca de agua) y el resumen acumulado de la carrera. */
function renderSidebar(jugador, opts = {}) {
  const el = $ficha();
  if (!jugador) {
    el.classList.add("oculto");
    el.innerHTML = "";
    $cabeceraOverall().textContent = "";
    return;
  }
  el.classList.remove("oculto");

  const overall = opts.overallOverride ?? calcularOverall(jugador);
  const etiquetaOverall = opts.etiquetaOverall ?? "OVR";
  const paisJugador = PAISES[jugador.paisId];
  const ligaClub = PAISES[jugador.club.paisId].ligas[jugador.club.division];
  const color = colorClub(jugador.club.nombre);
  const e = jugador.estadisticasCarrera;
  const esLibero = jugador.posicionId === "libero";

  const datos = esLibero
    ? [["partido", "PJ", e.partidosTotales], ["defensa", "DEF", e.defensasTotales], ["recepcion", "REC", e.acesTotales]]
    : [["partido", "PJ", e.partidosTotales], ["ataque", "PTS", e.puntosTotales], ["saque", "ACE", e.acesTotales]];

  // Vitrina: una silueta por título, o el aviso de vitrina vacía.
  const piezas = [
    ...jugador.titulos.map((t) => trofeoSvg(t.tipo, 34)),
    ...jugador.torneosInternacionales.filter((t) => /oro|plata|bronce/i.test(t.resultado)).map((t) => trofeoSvg(t.resultado, 34)),
  ];
  const vitrina = piezas.length
    ? `<div class="vitrina-mini">${piezas.join("")}</div>`
    : `<div class="vitrina-mini vacia">${trofeoSvg("liga", 30)}<span>Vitrina vacía</span></div>`;

  el.innerHTML = `
    <div class="ficha-superior">
      <div class="ovr-caja ${nivelOverall(overall)}">
        <span class="ovr-lbl">${escapar(etiquetaOverall)}</span>
        <span class="ovr-num">${overall}</span>
      </div>

      <div class="club-banner" style="--club-base:${color.base}; --club-acento:${color.acento}">
        <span class="club-marca" aria-hidden="true">${escudoClub(jugador.club.nombre, 150)}</span>
        <div class="club-fila-chips">
          <span class="chip-pais">${banderaSvg(jugador.paisId, 18)} ${escapar(paisJugador.nombre)}</span>
          <span class="chip-dorsal">#${jugador.dorsal} ${PUESTOS_CANCHA[jugador.posicionId].corto}</span>
          <span class="chip-pais">${jugador.manoHabil === "izquierda" ? "Zurdo/a" : "Diestro/a"}</span>
        </div>
        <div class="club-fila-nombre">
          ${escudoClub(jugador.club.nombre, 34)}
          <b>${escapar(jugador.club.nombre)}</b>
        </div>
        <div class="club-meta">
          <span><i>Edad</i><b>${jugador.edad}</b></span>
          <span><i>Ahorros</i><b>${formatearDinero(jugador.dinero)}</b></span>
        </div>
        <span class="club-liga">${emblemaLiga(jugador.club.paisId, jugador.club.division, 20)} ${escapar(ligaClub.nombre)}</span>
      </div>
    </div>

    <div class="ficha-datos">
      ${datos.map(([icono, lbl, val]) => `
        <span class="dato"><i>${lbl}</i><b>${ico(icono)} ${val.toLocaleString("es-ES")}</b></span>`).join("")}
    </div>

    <div class="tira-atributos">
      ${ATRIBUTOS.map((a) => {
        const v = jugador.atributos[a.id];
        return `<span class="attr-mini" title="${a.nombre}">
          ${ico(a.id)}<b>${v}</b>
          <span class="attr-barra"><span style="width:${v}%"></span></span>
        </span>`;
      }).join("")}
    </div>

    ${vitrina}
  `;

  $cabeceraOverall().innerHTML = `${escapar(etiquetaOverall)} <b>${overall}</b>`;
}

/* ================= TRAYECTORIA (columna derecha) =================
   Una fila por edad, de los 16 a los 38, con las temporadas ya jugadas
   rellenas y las futuras en gris. Al estar siempre completa, la columna
   nunca deja un hueco vacío por muy corta que sea la decisión de turno. */
function renderTrayectoria(jugador) {
  const el = $trayectoria();
  if (!jugador) {
    el.classList.add("oculto");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("oculto");

  const esLibero = jugador.posicionId === "libero";
  const porEdad = new Map(jugador.historialTemporadas.map((t) => [t.edad, t]));
  const paisJugador = PAISES[jugador.paisId];

  const filas = [];
  for (let edad = EDAD_INICIAL; edad <= EDAD_RETIRO_OBLIGATORIO; edad++) {
    const t = porEdad.get(edad);

    if (!t) {
      // Temporada en curso (la que se está jugando ahora) o futura.
      const enCurso = edad === jugador.edad && !jugador.retirado;
      filas.push(`
        <tr class="fila-vacia ${enCurso ? "en-curso" : ""}">
          <td class="col-edad"><span class="edad-badge">${edad}</span></td>
          <td class="col-club">${enCurso ? `<span class="tenue">Temporada en juego…</span>` : ""}</td>
          <td class="col-ovr">${enCurso ? `<span class="ovr-pill ${nivelOverall(calcularOverall(jugador))}">${calcularOverall(jugador)}</span>` : ""}</td>
          <td></td><td></td><td></td>
        </tr>`);
      continue;
    }

    const color = colorClub(t.club);
    const titulo = (t.titulos && t.titulos.length)
      ? `<span class="fila-trofeo" title="${escapar(t.titulos[0])}">${trofeoSvg(t.titulos[0], 15)}</span>` : "";
    const c1 = t.partidosJugados ?? 0;
    const c2 = esLibero ? (t.defensasTotales ?? 0) : (t.puntosTotales ?? 0);
    const c3 = t.acesTotales ?? 0;

    filas.push(`
      <tr style="--club-base:${color.base}">
        <td class="col-edad"><span class="edad-badge jugada">${t.edad}</span></td>
        <td class="col-club">
          <span class="club-celda">${escudoClub(t.club, 19)}<span class="club-nom">${escapar(t.club)}</span>${titulo}</span>
        </td>
        <td class="col-ovr"><span class="ovr-pill ${nivelOverall(t.overall)}">${t.overall}</span></td>
        <td class="col-num">${c1}</td>
        <td class="col-num">${c2.toLocaleString("es-ES")}</td>
        <td class="col-num">${c3}</td>
      </tr>`);
  }

  // Pie: resumen con la selección nacional.
  const medallas = jugador.torneosInternacionales.filter((t) => /oro|plata|bronce/i.test(t.resultado)).length;

  el.innerHTML = `
    <div class="tabla-envoltorio-tray">
      <table class="tabla-trayectoria">
        <thead>
          <tr>
            <th class="col-edad">Edad</th>
            <th class="col-club">Club</th>
            <th class="col-ovr">OVR</th>
            <th class="col-num">PJ</th>
            <th class="col-num">${esLibero ? "DEF" : "PTS"}</th>
            <th class="col-num">ACE</th>
          </tr>
        </thead>
        <tbody>${filas.join("")}</tbody>
      </table>
    </div>
    <div class="tray-pie">
      <span class="club-celda">${ico("seleccion")}<span class="club-nom">${banderaSvg(jugador.paisId, 18)} ${escapar(paisJugador.nombre)}</span></span>
      <span class="tray-pie-datos">
        <span><i>Conv.</i> ${jugador.convocatoriasSeleccion}</span>
        <span><i>Medallas</i> ${medallas}</span>
      </span>
    </div>
  `;
}

function actualizarCabeceraTemporada(jugador, temporadaNum) {
  const el = $cabeceraTemporada();
  el.textContent = jugador ? `T${temporadaNum} · ${jugador.edad} años` : "";

  const relleno = document.getElementById("progreso-carrera-fill");
  if (relleno) {
    const pct = jugador
      ? clampNumero(((jugador.edad - EDAD_INICIAL) / (EDAD_RETIRO_OBLIGATORIO - EDAD_INICIAL)) * 100, 0, 100)
      : 0;
    relleno.style.width = `${pct}%`;
  }
}

/* ================= PANTALLA DE INICIO ================= */
function renderInicio({ hayGuardado }, cb) {
  $ficha().classList.add("oculto");
  $trayectoria().classList.add("oculto");
  $cabeceraTemporada().textContent = "";
  $cabeceraOverall().textContent = "";
  pintarPantalla(`
    <div class="hero">
      <span class="franjas" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
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

/* ================= CREACIÓN DE PERSONAJE =================
   Dos pasos: primero la identidad (camiseta con dorsal, nacionalidad y
   posición sobre la cancha) y después el primer equipo y el reparto de
   atributos. Todo se actualiza en sitio, sin reconstruir la pantalla, para
   que no reaparezcan las a/* Dónde juega cada posición sobre la media cancha (red arriba).
   x/y en % dentro de la pista; zona = numeración oficial del voleibol. */
const PUESTOS_CANCHA = {
  receptor:  { corto: "REC", x: 22, y: 28, zona: 4, icono: "🎯", rol: "Recepción y ataque en banda", clave: "Ataque · Recepción · Saque" },
  central:   { corto: "CEN", x: 50, y: 20, zona: 3, icono: "🧱", rol: "Bloqueo y ataque rápido", clave: "Bloqueo · Ataque · Físico" },
  opuesto:   { corto: "OPU", x: 78, y: 28, zona: 2, icono: "🔥", rol: "Remate principal y potencia", clave: "Ataque · Saque · Bloqueo" },
  libero:    { corto: "LIB", x: 28, y: 74, zona: 5, icono: "🛡️", rol: "Especialista defensivo", clave: "Recepción · Defensa · Colocación" },
  colocador: { corto: "COL", x: 74, y: 68, zona: 1, icono: "🧠", rol: "Cerebro y colocación", clave: "Colocación · Liderazgo · Defensa" },
};

/* Camiseta deportiva profesional de vóley:
   Corte atlético raglán, cuello en V con ribete de contraste, textura de
   micro-malla sublimada, paneles laterales y sombras de volumen. */
const CAMISETA_CONTORNO = [
  "M100 22",
  "C88 22 76 18 68 14",
  "L24 38", "C18 42 16 50 19 57",
  "L36 94", "C39 100 48 102 54 97", "L60 90",
  "L56 208", "C56 216 61 222 70 223",
  "C90 226 110 226 130 223", "C139 222 144 216 144 208",
  "L140 90", "L146 97", "C152 102 161 100 164 94",
  "L181 57", "C184 50 182 42 176 38",
  "L132 14", "C124 18 112 22 100 22", "Z",
].join(" ");

function camisetaSvg() {
  return `
    <svg class="camiseta" viewBox="0 0 200 240" role="img" aria-label="Camiseta oficial del jugador">
      <defs>
        <clipPath id="recorte-camiseta"><path d="${CAMISETA_CONTORNO}"/></clipPath>
        
        <!-- Textura micro-malla atlética deportiva -->
        <pattern id="patron-malla" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="0.75" fill="#ffffff" opacity="0.08"/>
        </pattern>

        <!-- Sombreado volumétrico de alta definición -->
        <linearGradient id="luzCamiseta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity=".32"/>
          <stop offset="35%"  stop-color="#ffffff" stop-opacity=".06"/>
          <stop offset="65%"  stop-color="#000000" stop-opacity=".04"/>
          <stop offset="100%" stop-color="#000000" stop-opacity=".38"/>
        </linearGradient>

        <linearGradient id="volumenLateral" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#000000" stop-opacity=".38"/>
          <stop offset="16%"  stop-color="#000000" stop-opacity=".05"/>
          <stop offset="50%"  stop-color="#ffffff" stop-opacity=".12"/>
          <stop offset="84%"  stop-color="#000000" stop-opacity=".05"/>
          <stop offset="100%" stop-color="#000000" stop-opacity=".38"/>
        </linearGradient>

        <linearGradient id="gradCuello" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity=".25"/>
          <stop offset="100%" stop-color="#000000" stop-opacity=".35"/>
        </linearGradient>
      </defs>

      <!-- Cuerpo principal de la equipación -->
      <path class="kit-cuerpo" d="${CAMISETA_CONTORNO}"/>

      <g clip-path="url(#recorte-camiseta)">
        <!-- Paneles laterales atléticos -->
        <path class="kit-detalle" d="M24 38 L60 90 L56 220 L40 220 L19 57 Z" opacity=".95"/>
        <path class="kit-detalle" d="M176 38 L140 90 L144 220 L160 220 L181 57 Z" opacity=".95"/>

        <!-- Puños de mangas y banda inferior -->
        <path class="kit-detalle" d="M19 57 L36 94 L47 88 L30 51 Z"/>
        <path class="kit-detalle" d="M181 57 L164 94 L153 88 L170 51 Z"/>
        <rect class="kit-detalle" x="0" y="212" width="200" height="30"/>

        <!-- Costuras raglán -->
        <path d="M68 14 C58 40 52 64 60 90" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.2" stroke-dasharray="3,2"/>
        <path d="M132 14 C142 40 148 64 140 90" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2.2" stroke-dasharray="3,2"/>

        <!-- Textura micro-malla -->
        <rect x="0" y="0" width="200" height="240" fill="url(#patron-malla)"/>

        <!-- Sombreado de volumen y drapeado atlético -->
        <path d="${CAMISETA_CONTORNO}" fill="url(#volumenLateral)"/>
        <path d="${CAMISETA_CONTORNO}" fill="url(#luzCamiseta)"/>

        <!-- Pliegues realistas -->
        <g class="kit-pliegues">
          <path d="M74 96 C69 135 70 174 72 208"/>
          <path d="M126 96 C131 135 130 174 128 208"/>
          <path d="M88 155 C86 178 87 194 88 212"/>
          <path d="M112 155 C114 178 113 194 112 212"/>
        </g>
      </g>

      <!-- Cuello en V atlético -->
      <g clip-path="url(#recorte-camiseta)">
        <path d="M68 14 L100 48 L132 14 L124 10 L100 38 L76 10 Z" class="kit-detalle"/>
        <path d="M68 14 L100 48 L132 14 L124 10 L100 38 L76 10 Z" fill="url(#gradCuello)"/>
      </g>
      
      <!-- Contorno general definido -->
      <path class="kit-contorno" d="${CAMISETA_CONTORNO}"/>

      <!-- Tipografía deportiva para nombre y dorsal -->
      <text id="camiseta-nombre" class="camiseta-nombre" x="100" y="78" text-anchor="middle">JUGADOR</text>
      <text id="camiseta-dorsal" class="camiseta-dorsal" x="100" y="162" text-anchor="middle">10</text>
    </svg>`;
}

/* Media cancha reglamentaria indoor vista desde arriba:
   Pista bicolor tipo Taraflex con zona de ataque de 3m, red profesional
   con varillas rojas/blancas y nodos tácticos interactivos. */
function canchasSvg(seleccionada) {
  const marcas = Object.entries(PUESTOS_CANCHA).map(([id, p]) => `
    <button type="button" class="puesto ${seleccionada === id ? "elegido" : ""}" data-pos="${id}" style="--x:${p.x}%; --y:${p.y}%"
            aria-label="${POSICIONES[id].nombre}">
      <span class="puesto-icono">${p.icono}</span>
      <span class="puesto-corto">${p.corto}</span>
      <span class="puesto-zona">Z${p.zona}</span>
    </button>`).join("");

  return `
    <div class="cancha-marco">
      <div class="cancha-red" aria-hidden="true">
        <span class="red-antena antena-izq" title="Antena"></span>
        <span class="red-malla"></span>
        <span class="red-antena antena-der" title="Antena"></span>
      </div>
      <div class="cancha">
        <div class="cancha-piso" aria-hidden="true"></div>
        <div class="cancha-zona-ataque" aria-hidden="true">
          <span class="cancha-etiqueta-ataque">ZONA DE ATAQUE (3m)</span>
        </div>
        <div class="cancha-linea-ataque" aria-hidden="true"></div>
        <div class="cancha-linea-central" aria-hidden="true"></div>
        <div class="cancha-zona-zaga" aria-hidden="true">
          <span class="cancha-etiqueta-zaga">ZONA DEFENSIVA</span>
        </div>
        ${marcas}
      </div>
    </div>`;
}

function renderCreacion(cb) {
  const estadoLocal = {
    paso: 1, // 1: Identidad, 2: País, 3: Posición, 4: Club, 5: Atributos
    nombre: "",
    dorsal: String(Math.floor(Math.random() * 99) + 1),
    paisId: "espana",
    posicionId: null,
    manoHabil: "derecha",
    clubNombre: null,
    reparto: Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0])),
  };

  const PASOS_CONFIG = [
    { num: 1, id: "identidad", titulo: "Identidad", sub: "Nombre, dorsal y mano hábil" },
    { num: 2, id: "nacion",    titulo: "Nacionalidad", sub: "País y colores de selección" },
    { num: 3, id: "posicion",  titulo: "Posición", sub: "Puesto y rol táctico en pista" },
    { num: 4, id: "club",      titulo: "Primer Club", sub: "Equipo de debut en 2ª división" },
    { num: 5, id: "atributos", titulo: "Atributos", sub: "Reparto de puntos iniciales" },
  ];

  const puntosUsados = () => Object.values(estadoLocal.reparto).reduce((a, b) => a + b, 0);
  const dorsalValido = () => {
    const n = Number(estadoLocal.dorsal);
    return Number.isInteger(n) && n >= 1 && n <= 99;
  };

  function pasoValido(paso) {
    if (paso === 1) return Boolean(estadoLocal.nombre.trim() && dorsalValido());
    if (paso === 2) return Boolean(estadoLocal.paisId && PAISES[estadoLocal.paisId]);
    if (paso === 3) return Boolean(estadoLocal.posicionId && POSICIONES[estadoLocal.posicionId]);
    if (paso === 4) return Boolean(estadoLocal.clubNombre);
    if (paso === 5) return true;
    return false;
  }

  function renderWizard() {
    const pasoActual = estadoLocal.paso;
    const config = PASOS_CONFIG[pasoActual - 1];
    const pais = PAISES[estadoLocal.paisId];

    // Stepper HTML
    const stepperHtml = PASOS_CONFIG.map((p) => {
      let clase = "step-pill";
      if (p.num === pasoActual) clase += " activo";
      else if (p.num < pasoActual) clase += " completado";
      return `
        <button type="button" class="${clase}" data-ir-paso="${p.num}" ${p.num > pasoActual && !pasoValido(pasoActual) ? "disabled" : ""}>
          <span class="step-num">${p.num < pasoActual ? "✔" : p.num}</span>
          <span class="step-lbl">${p.titulo}</span>
        </button>`;
    }).join(`<span class="step-linea"></span>`);

    // Contenido del paso activo
    let contenidoPasoHtml = "";

    if (pasoActual === 1) {
      contenidoPasoHtml = `
        <div class="paso-box paso-identidad">
          <div class="campo-pro">
            <label for="input-nombre">Apellido / Nombre en Camiseta</label>
            <input type="text" id="input-nombre" maxlength="16" placeholder="EJ. MARTÍNEZ" autocomplete="off" value="${escapar(estadoLocal.nombre)}">
            <span class="campo-pista">Máximo 16 caracteres · Aparecerá en tu dorsal y dorsales de partido</span>
          </div>

          <div class="campo-fila-doble">
            <div class="campo-pro">
              <label for="input-dorsal">Número de Dorsal (1-99)</label>
              <div class="dorsal-stepper-wrap">
                <button type="button" class="btn-dorsal-step" id="btn-dorsal-menos">-</button>
                <input type="number" id="input-dorsal" min="1" max="99" inputmode="numeric" value="${estadoLocal.dorsal}">
                <button type="button" class="btn-dorsal-step" id="btn-dorsal-mas">+</button>
                <button type="button" class="btn-dorsal-random" id="btn-dorsal-random" title="Dorsal aleatorio">🎲</button>
              </div>
            </div>

            <div class="campo-pro">
              <label>Mano Hábil</label>
              <div class="selector-mano-grid" id="selector-mano">
                <button type="button" data-mano="derecha" class="btn-mano ${estadoLocal.manoHabil === "derecha" ? "elegida" : ""}">
                  <span class="mano-ico">🤚</span>
                  <span class="mano-nom">Diestro/a</span>
                </button>
                <button type="button" data-mano="izquierda" class="btn-mano ${estadoLocal.manoHabil === "izquierda" ? "elegida" : ""}">
                  <span class="mano-ico">🖐️</span>
                  <span class="mano-nom">Zurdo/a</span>
                </button>
              </div>
            </div>
          </div>
        </div>`;
    } else if (pasoActual === 2) {
      const paisesHtml = Object.entries(PAISES).map(([id, p]) => `
        <button type="button" class="pais-card-pro ${estadoLocal.paisId === id ? "elegido" : ""}" data-pais="${id}" data-nombre="${escapar(p.nombre.toLowerCase())}">
          <span class="pais-flag-wrap">${banderaSvg(id, 32)}</span>
          <span class="pais-name-txt">${escapar(p.nombre)}</span>
          <span class="pais-kit-dots" aria-hidden="true">
            <i style="background:${p.kit.base}"></i>
            <i style="background:${p.kit.detalle}"></i>
          </span>
          <span class="pais-check-ico" aria-hidden="true">${ico("check")}</span>
        </button>`).join("");

      contenidoPasoHtml = `
        <div class="paso-box paso-nacion">
          <div class="buscador-bar">
            ${ico("buscar", "search-ico")}
            <input type="search" id="buscar-pais" class="input-search-pro" placeholder="Buscar país (España, Italia, Polonia, Brasil...)" autocomplete="off">
          </div>
          <div class="grid-paises-scroll" id="lista-paises">
            ${paisesHtml}
          </div>
        </div>`;
    } else if (pasoActual === 3) {
      const posicionesHtml = Object.entries(PUESTOS_CANCHA).map(([id, p]) => `
        <button type="button" class="pos-item-pro ${estadoLocal.posicionId === id ? "elegida" : ""}" data-pos="${id}">
          <span class="pos-ico-bubble">${p.icono}</span>
          <div class="pos-info-texts">
            <div class="pos-title-row">
              <span class="pos-main-name">${escapar(POSICIONES[id].nombre)}</span>
              <span class="pos-zona-badge">Zona ${p.zona}</span>
            </div>
            <span class="pos-sub-role">${escapar(p.rol)}</span>
            <span class="pos-keys-pill">⚡ ${p.clave}</span>
          </div>
          <span class="pos-sel-indicator">${ico("check")}</span>
        </button>`).join("");

      contenidoPasoHtml = `
        <div class="paso-box paso-posicion">
          <div class="posicion-split-layout">
            <div class="cancha-tactica-col">
              ${canchasSvg(estadoLocal.posicionId)}
            </div>
            <div class="posiciones-lista-col" id="lista-posiciones">
              ${posicionesHtml}
            </div>
          </div>
        </div>`;
    } else if (pasoActual === 4) {
      const candidatos = equiposIniciales(estadoLocal.paisId, 3);
      const clubesSegunda = candidatos.map((c, i) => `
        <button type="button" class="club-debut-card ${estadoLocal.clubNombre === c.nombre ? "elegido" : ""}" data-club="${escapar(c.nombre)}" style="--i:${i}">
          <div class="club-debut-crest">${escudoClub(c.nombre, 62)}</div>
          <div class="club-debut-details">
            <span class="club-debut-nombre">${escapar(c.nombre)}</span>
            <span class="club-debut-liga">${escapar(pais.ligas.segunda.nombre)}</span>
            <div class="club-debut-prestigio">
              <span class="stars-gold">${"★".repeat(Math.max(1, Math.round(c.prestigio / 2)))}</span><span class="stars-dim">${"★".repeat(5 - Math.max(1, Math.round(c.prestigio / 2)))}</span>
              <span class="prest-num">Prestigio ${c.prestigio}/10</span>
            </div>
          </div>
          <span class="club-check-ico">${ico("check")}</span>
        </button>`).join("");

      contenidoPasoHtml = `
        <div class="paso-box paso-club">
          <div class="paso-intro-banner">
            <span>Debut profesional en <b>${escapar(pais.ligas.segunda.nombre)}</b> (${banderaSvg(estadoLocal.paisId, 16)} ${escapar(pais.nombre)})</span>
          </div>
          <div class="grid-clubes-debut">
            ${clubesSegunda}
          </div>
        </div>`;
    } else if (pasoActual === 5) {
      const perfil = POSICIONES[estadoLocal.posicionId];
      const slidersHtml = ATRIBUTOS.filter((a) => perfil.pesos[a.id] > 0).map((a) => `
        <div class="attr-slider-card" data-fila="${a.id}">
          <div class="attr-slider-header">
            <span class="attr-name">${ico(a.id)} ${a.nombre}</span>
            <span class="attr-val">${perfil.base[a.id]}</span>
          </div>
          <div class="attr-track-wrap">
            <input type="range" class="deslizador-pro" data-attr="${a.id}"
                   min="0" max="${TOPE_CREACION}" step="1"
                   value="${perfil.base[a.id]}" aria-label="${a.nombre}">
          </div>
        </div>`).join("");

      contenidoPasoHtml = `
        <div class="paso-box paso-atributos">
          <div class="puntos-reparto-banner">
            <div class="puntos-counter-badge">
              <span class="pts-num" id="puntos-libres">${PUNTOS_CREACION - puntosUsados()}</span>
              <span class="pts-lbl">Puntos Disponibles</span>
            </div>
            <span class="puntos-desc-txt">Reparte tus puntos iniciales para definir tus fortalezas como ${escapar(perfil.nombre)}</span>
          </div>
          <div class="grid-atributos-sliders" id="lista-reparto">
            ${slidersHtml}
          </div>
        </div>`;
    }

    const puedeAvanzar = pasoValido(pasoActual);
    const esUltimo = pasoActual === 5;

    pintarPantalla(`
      <div class="panel-creacion-wizard">
        <!-- Barra de Progreso Superior (Stepper) -->
        <header class="wizard-header">
          <div class="wizard-stepper-bar">
            ${stepperHtml}
          </div>
        </header>

        <!-- Cuerpo del Wizard -->
        <div class="wizard-body-layout">
          <!-- Columna Lateral: Player Card en Vivo -->
          <aside class="wizard-card-col">
            <div class="player-live-card" id="player-card">
              <div class="live-card-halo" aria-hidden="true"></div>

              <div class="live-card-top-meta">
                <div class="live-flag-chip" id="card-nacion">
                  ${banderaSvg(estadoLocal.paisId, 20)}
                  <span>${escapar(PAISES[estadoLocal.paisId].nombre)}</span>
                </div>
                <div class="live-hand-chip" id="card-mano-chip">
                  ${estadoLocal.manoHabil === "izquierda" ? "🖐️ Zurdo" : "🤚 Diestro"}
                </div>
              </div>

              <div class="live-pos-chip ${estadoLocal.posicionId ? "activo" : "pendiente"}" id="card-pos-chip">
                ${estadoLocal.posicionId 
                  ? `${PUESTOS_CANCHA[estadoLocal.posicionId].icono} ${escapar(POSICIONES[estadoLocal.posicionId].nombre)}`
                  : `⚡ Elige posición`}
              </div>

              <div class="live-jersey-stage">
                <div class="jersey-spotlight-halo" aria-hidden="true"></div>
                ${camisetaSvg()}
              </div>

              <div class="live-card-bottom">
                <div class="live-card-player-id">
                  <span class="live-dorsal-tag" id="card-dorsal-display">#${estadoLocal.dorsal}</span>
                  <span class="live-player-name" id="card-nombre-display">${escapar(estadoLocal.nombre.trim() || "JUGADOR/A")}</span>
                </div>
                <div class="live-card-sub-status">
                  <span>16 AÑOS · DEBUT</span>
                  <span class="live-dot-ready"><i></i> LISTO</span>
                </div>
              </div>
            </div>
          </aside>

          <!-- Columna Principal: Contenido del Paso Activo -->
          <main class="wizard-content-col">
            <div class="step-title-block">
              <span class="step-eyebrow">Paso ${pasoActual} de 5</span>
              <h2>${config.titulo}</h2>
              <p>${config.sub}</p>
            </div>

            <div class="step-body-container">
              ${contenidoPasoHtml}
            </div>

            <!-- Barra de Navegación Inferior -->
            <footer class="wizard-footer-bar">
              <button type="button" class="btn-wizard-back ${pasoActual === 1 ? "inactivo" : ""}" id="btn-wizard-prev" ${pasoActual === 1 ? "disabled" : ""}>
                ← Anterior
              </button>
              
              <div class="wizard-status-txt" id="wizard-status-txt">
                ${puedeAvanzar ? "✔ Listo para continuar" : "Completa este paso para avanzar"}
              </div>

              <button type="button" class="principal btn-wizard-next" id="btn-wizard-next" ${puedeAvanzar ? "" : "disabled"}>
                <span>${esUltimo ? "🚀 ¡Comenzar Carrera!" : "Siguiente →"}</span>
              </button>
            </footer>
          </main>
        </div>
      </div>
    `);

    // Sincronización de componentes del paso activo
    engancharEventosPaso();
  }

  function engancharEventosPaso() {
    const $ = (s) => document.querySelector(s);
    const pasoActual = estadoLocal.paso;
    const btnNext = $("#btn-wizard-next");
    const btnPrev = $("#btn-wizard-prev");
    const camisetaNombre = $("#camiseta-nombre");
    const camisetaDorsal = $("#camiseta-dorsal");
    const cardNombreDisplay = $("#card-nombre-display");
    const cardDorsalDisplay = $("#card-dorsal-display");
    const cardManoChip = $("#card-mano-chip");
    const cardPosChip = $("#card-pos-chip");
    const cardNacion = $("#card-nacion");
    const wizardStatusTxt = $("#wizard-status-txt");

    const refrescarBotones = () => {
      const ok = pasoValido(pasoActual);
      if (btnNext) btnNext.disabled = !ok;
      if (wizardStatusTxt) {
        wizardStatusTxt.textContent = ok ? "✔ Listo para continuar" : "Completa este paso para avanzar";
        wizardStatusTxt.classList.toggle("ok", ok);
      }
    };

    function ajustarTextoCamiseta(el, texto, anchoMaximo, tamanoBase, tamanoMinimo) {
      if (!el) return;
      el.textContent = texto;
      el.removeAttribute("textLength");
      el.removeAttribute("lengthAdjust");

      let tam = tamanoBase;
      el.style.fontSize = `${tam}px`;
      while (tam > tamanoMinimo && el.getComputedTextLength() > anchoMaximo) {
        tam -= 1;
        el.style.fontSize = `${tam}px`;
      }
      if (el.getComputedTextLength() > anchoMaximo) {
        el.setAttribute("textLength", anchoMaximo);
        el.setAttribute("lengthAdjust", "spacingAndGlyphs");
      }
    }

    function sincronizarCamiseta() {
      const displayTxt = (estadoLocal.nombre.trim() || "JUGADOR/A").toUpperCase();
      const dorsalTxt = dorsalValido() ? String(Number(estadoLocal.dorsal)) : "?";
      ajustarTextoCamiseta(camisetaNombre, displayTxt, 72, 16, 9);
      ajustarTextoCamiseta(camisetaDorsal, dorsalTxt, 70, 68, 38);
      if (cardNombreDisplay) cardNombreDisplay.textContent = displayTxt;
      if (cardDorsalDisplay) cardDorsalDisplay.textContent = `#${dorsalTxt}`;

      const svg = document.querySelector(".camiseta");
      const kit = estadoLocal.paisId ? PAISES[estadoLocal.paisId]?.kit : null;
      if (svg && kit) {
        svg.style.setProperty("--kit-base", kit.base);
        svg.style.setProperty("--kit-detalle", kit.detalle);
        svg.style.setProperty("--kit-texto", kit.texto);
      }
      const card = document.getElementById("player-card");
      if (card && kit) {
        card.style.setProperty("--pais-color-base", kit.base);
        card.style.setProperty("--pais-color-acento", kit.detalle);
      }
    }

    sincronizarCamiseta();

    // Navegación Stepper
    document.querySelectorAll("[data-ir-paso]").forEach((btn) => {
      btn.onclick = () => {
        const destino = Number(btn.dataset.irPaso);
        if (destino < pasoActual || pasoValido(pasoActual)) {
          estadoLocal.paso = destino;
          renderWizard();
        }
      };
    });

    if (btnPrev && pasoActual > 1) {
      btnPrev.onclick = () => {
        estadoLocal.paso = Math.max(1, pasoActual - 1);
        renderWizard();
      };
    }

    if (btnNext) {
      btnNext.onclick = () => {
        if (!pasoValido(pasoActual)) return;
        if (pasoActual === 5) {
          cb.onCrear({ ...estadoLocal });
        } else {
          estadoLocal.paso = Math.min(5, pasoActual + 1);
          renderWizard();
        }
      };
    }

    // Eventos específicos según paso
    if (pasoActual === 1) {
      const inputNombre = $("#input-nombre");
      const inputDorsal = $("#input-dorsal");

      if (inputNombre) {
        inputNombre.oninput = (e) => {
          estadoLocal.nombre = e.target.value;
          sincronizarCamiseta();
          refrescarBotones();
        };
      }

      if (inputDorsal) {
        inputDorsal.oninput = (e) => {
          estadoLocal.dorsal = e.target.value;
          sincronizarCamiseta();
          inputDorsal.classList.toggle("invalido", e.target.value !== "" && !dorsalValido());
          refrescarBotones();
        };
        inputDorsal.onblur = () => {
          if (!dorsalValido()) {
            estadoLocal.dorsal = String(clampNumero(Number(estadoLocal.dorsal) || 1, 1, 99));
            inputDorsal.value = estadoLocal.dorsal;
            inputDorsal.classList.remove("invalido");
            sincronizarCamiseta();
            refrescarBotones();
          }
        };
      }

      const btnMenos = $("#btn-dorsal-menos");
      const btnMas = $("#btn-dorsal-mas");
      const btnRandom = $("#btn-dorsal-random");

      if (btnMenos) {
        btnMenos.onclick = () => {
          const cur = Number(estadoLocal.dorsal) || 10;
          estadoLocal.dorsal = String(clampNumero(cur - 1, 1, 99));
          if (inputDorsal) inputDorsal.value = estadoLocal.dorsal;
          sincronizarCamiseta();
          refrescarBotones();
        };
      }
      if (btnMas) {
        btnMas.onclick = () => {
          const cur = Number(estadoLocal.dorsal) || 10;
          estadoLocal.dorsal = String(clampNumero(cur + 1, 1, 99));
          if (inputDorsal) inputDorsal.value = estadoLocal.dorsal;
          sincronizarCamiseta();
          refrescarBotones();
        };
      }
      if (btnRandom) {
        btnRandom.onclick = () => {
          estadoLocal.dorsal = String(Math.floor(Math.random() * 99) + 1);
          if (inputDorsal) inputDorsal.value = estadoLocal.dorsal;
          sincronizarCamiseta();
          refrescarBotones();
        };
      }

      document.querySelectorAll("#selector-mano .btn-mano").forEach((btn) => {
        btn.onclick = () => {
          estadoLocal.manoHabil = btn.dataset.mano;
          document.querySelectorAll("#selector-mano .btn-mano").forEach((o) => o.classList.toggle("elegida", o === btn));
          if (cardManoChip) {
            cardManoChip.textContent = estadoLocal.manoHabil === "izquierda" ? "🖐️ Zurdo" : "🤚 Diestro";
          }
        };
      });
    } else if (pasoActual === 2) {
      const search = $("#buscar-pais");
      if (search) {
        search.oninput = (e) => {
          const q = e.target.value.trim().toLowerCase();
          document.querySelectorAll(".pais-card-pro").forEach((el) => {
            el.hidden = q !== "" && !el.dataset.nombre.includes(q);
          });
        };
      }

      document.querySelectorAll(".pais-card-pro").forEach((el) => {
        el.onclick = () => {
          estadoLocal.paisId = el.dataset.pais;
          estadoLocal.clubNombre = null; // Reinicia club si cambia país
          document.querySelectorAll(".pais-card-pro").forEach((o) => o.classList.toggle("elegido", o === el));
          sincronizarCamiseta();
          if (cardNacion) {
            cardNacion.innerHTML = `${banderaSvg(estadoLocal.paisId, 20)} <span>${escapar(PAISES[estadoLocal.paisId].nombre)}</span>`;
          }
          refrescarBotones();
        };
      });
    } else if (pasoActual === 3) {
      function seleccionarPosicion(id) {
        if (!POSICIONES[id]) return;
        estadoLocal.posicionId = id;
        document.querySelectorAll(".puesto").forEach((o) => o.classList.toggle("elegido", o.dataset.pos === id));
        document.querySelectorAll(".pos-item-pro").forEach((o) => o.classList.toggle("elegida", o.dataset.pos === id));
        
        const p = PUESTOS_CANCHA[id];
        if (cardPosChip) {
          cardPosChip.className = "live-pos-chip activo";
          cardPosChip.innerHTML = `${p.icono} ${escapar(POSICIONES[id].nombre)}`;
        }
        refrescarBotones();
      }

      document.querySelectorAll(".puesto").forEach((el) => {
        el.onclick = () => seleccionarPosicion(el.dataset.pos);
      });
      document.querySelectorAll(".pos-item-pro").forEach((el) => {
        el.onclick = () => seleccionarPosicion(el.dataset.pos);
      });
    } else if (pasoActual === 4) {
      document.querySelectorAll(".club-debut-card").forEach((el) => {
        el.onclick = () => {
          estadoLocal.clubNombre = el.dataset.club;
          document.querySelectorAll(".club-debut-card").forEach((o) => o.classList.toggle("elegido", o === el));
          refrescarBotones();
        };
      });
    } else if (pasoActual === 5) {
      const perfil = POSICIONES[estadoLocal.posicionId];
      const listaReparto = $("#lista-reparto");
      const puntosLibres = $("#puntos-libres");

      function actualizarSliders() {
        const restantes = PUNTOS_CREACION - puntosUsados();
        if (puntosLibres) puntosLibres.textContent = restantes;
        if (listaReparto) {
          listaReparto.querySelectorAll("[data-fila]").forEach((fila) => {
            const id = fila.dataset.fila;
            const base = perfil.base[id];
            const valor = base + estadoLocal.reparto[id];
            const deslizador = fila.querySelector(".deslizador-pro");

            fila.querySelector(".attr-val").textContent = valor;
            if (deslizador) {
              deslizador.value = valor;
              deslizador.style.setProperty("--base", `${(base / TOPE_CREACION) * 100}%`);
              deslizador.style.setProperty("--relleno", `${(valor / TOPE_CREACION) * 100}%`);
            }
            fila.classList.toggle("al-maximo", valor >= TOPE_CREACION);
          });
        }
        refrescarBotones();
      }

      if (listaReparto) {
        listaReparto.oninput = (e) => {
          const deslizador = e.target.closest(".deslizador-pro");
          if (!deslizador) return;
          const attr = deslizador.dataset.attr;
          const base = perfil.base[attr];
          const usadosEnOtros = puntosUsados() - estadoLocal.reparto[attr];
          const extraMaximo = Math.min(TOPE_CREACION - base, PUNTOS_CREACION - usadosEnOtros);
          estadoLocal.reparto[attr] = clampNumero(Number(deslizador.value) - base, 0, extraMaximo);
          actualizarSliders();
        };
      }

      actualizarSliders();
    }
  }

  renderWizard();
}

/* ================= PRETEMPORADA: ENTRENAMIENTO ================= */
function renderEntrenamiento(jugador, cb) {
  const entrenables = ATRIBUTOS.filter((a) => POSICIONES[jugador.posicionId].pesos[a.id] > 0);
  const opciones = entrenables.map((a, i) => `
    <button class="ficha-entreno" data-foco="${a.id}" style="--i:${i}">
      <span class="ficha-icono">${ico(a.id)}</span>
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
          <span class="ficha-icono">${ico("descanso")}</span>
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
/* Barra con el reparto de probabilidades de una opción: verde lo que puede
   salir bien, rojo lo que puede salir mal y gris lo que no cambia nada. */
function barraProbabilidad(p) {
  if (p.segura && p.neutro === 100) {
    return `<span class="prob"><span class="prob-etiqueta neutro">Sin riesgo · nada cambia</span></span>`;
  }
  if (p.segura) {
    const clase = p.bien >= 100 ? "bien" : (p.mal >= 100 ? "mal" : "neutro");
    return `<span class="prob"><span class="prob-etiqueta ${clase}">Resultado asegurado</span></span>`;
  }
  const trozo = (clase, valor) => valor > 0 ? `<span class="prob-trozo ${clase}" style="width:${valor}%"></span>` : "";
  const dato = (clase, icono, valor) => valor > 0 ? `<span class="prob-dato ${clase}">${icono} ${valor}%</span>` : "";
  return `
    <span class="prob">
      <span class="prob-barra">
        ${trozo("bien", p.bien)}${trozo("neutro", p.neutro)}${trozo("mal", p.mal)}
      </span>
      <span class="prob-datos">
        ${dato("bien", "✔", p.bien)}${dato("neutro", "•", p.neutro)}${dato("mal", "✖", p.mal)}
      </span>
    </span>`;
}

/* Resumen corto del efecto de un desenlace, para caber en la tarjeta:
   se queda con los dos cambios de mayor peso. */
function resumenEfecto(efecto) {
  const entradas = Object.entries(efecto || {});
  if (!entradas.length) return "Sin cambios";
  return entradas
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([clave, valor]) => {
      const attr = ATRIBUTOS.find((a) => a.id === clave);
      const nombre = attr ? attr.nombre : (NOMBRES_EFECTO[clave]?.nombre || clave);
      const signo = valor > 0 ? "+" : "";
      const cifra = clave === "dinero" ? `${signo}${(valor / 1000).toFixed(0)}K €` : `${signo}${valor}`;
      return `${cifra} ${nombre}`;
    })
    .join(" · ");
}

/* Cada opción es una tarjeta con sus desenlaces posibles y la probabilidad
   de cada uno, para poder comparar las dos apuestas de un vistazo. */
function renderEvento(jugador, evento, titulo, cb) {
  const opciones = evento.opciones.map((op, i) => {
    // `prob` es un peso, no un porcentaje: hay que normalizarlo sobre el
    // total igual que hace el motor al sortear el desenlace.
    const total = op.resultados.reduce((s, r) => s + r.prob, 0) || 1;
    const desenlaces = op.resultados.map((r) => `
      <span class="oc-des ${r.signo || "neutro"}">
        <b>${escapar(resumenEfecto(r.efecto))}</b>
        <i>${Math.round(r.prob / total * 100)}%</i>
      </span>`).join("");

    return `
      <button class="opcion-card" data-idx="${i}" style="--i:${i}">
        <span class="oc-titulo">${escapar(op.texto)}</span>
        <span class="oc-arte" aria-hidden="true">
          <svg viewBox="0 0 160 160"><use href="#ico-remate"/></svg>
        </span>
        <span class="oc-desenlaces">${desenlaces}</span>
      </button>`;
  }).join("");

  pintarPantalla(`
    <div class="panel">
      <span class="eyebrow">${escapar(titulo)}</span>
      <h2>Tienes que decidir</h2>
      <p class="narrativa">${evento.texto(jugador)}</p>
      <div class="opciones-grid">${opciones}</div>
    </div>
  `);
  document.querySelectorAll("[data-idx]").forEach((el) => {
    el.onclick = () => cb.onElegir(evento.opciones[Number(el.dataset.idx)]);
  });
}

/* Etiquetas legibles para cada cosa que puede cambiar un evento. */
const NOMBRES_EFECTO = {
  moral: { icono: ico("moral"), nombre: "Moral" },
  dinero: { icono: ico("dinero"), nombre: "Ahorros", sufijo: " €" },
  reputacion: { icono: ico("reputacion"), nombre: "Reputación" },
  riesgoLesion: { icono: ico("lesion"), nombre: "Riesgo de lesión", alRevés: true },
};

function chipsEfecto(efecto) {
  const entradas = Object.entries(efecto || {});
  if (!entradas.length) return `<div class="chips"><span class="chip">Sin cambios</span></div>`;

  const chips = entradas.map(([clave, valor], i) => {
    const attr = ATRIBUTOS.find((a) => a.id === clave);
    const meta = attr ? { icono: ico(attr.id), nombre: attr.nombre } : (NOMBRES_EFECTO[clave] || { icono: "", nombre: clave });
    // En el riesgo de lesión, subir es malo: el color se invierte.
    const positivo = meta.alRevés ? valor < 0 : valor > 0;
    const signo = valor > 0 ? "+" : "";
    const cantidad = `${signo}${valor.toLocaleString("es-ES")}${meta.sufijo || ""}`;
    return `<span style="--i:${i}" class="chip ${positivo ? "verde" : "rojo"}">${meta.icono} ${escapar(meta.nombre)} ${cantidad}</span>`;
  }).join("");

  return `<div class="chips">${chips}</div>`;
}

const DESENLACE = {
  bien:   { icono: "✔", titulo: "¡Ha salido bien!" },
  mal:    { icono: "✖", titulo: "No ha salido como esperabas" },
  neutro: { icono: "•", titulo: "Sin sorpresas" },
};

function renderResultadoEvento(resultado, cb) {
  const signo = resultado.signo || "neutro";
  const info = DESENLACE[signo];
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  pintarPantalla(`
    <div class="panel">
      <span class="eyebrow">Consecuencias</span>
      <div class="desenlace ${signo}" id="desenlace">
        <div class="desenlace-sello" id="desenlace-sello">?</div>
        <div class="desenlace-cuerpo">
          <h3 class="desenlace-titulo">Veamos cómo sale…</h3>
          <p class="desenlace-texto"></p>
        </div>
      </div>
      <div id="desenlace-efectos"></div>
      <div class="opciones">
        <button class="principal" id="btn-continuar">Continuar</button>
      </div>
    </div>
  `);

  const caja = document.getElementById("desenlace");
  const sello = document.getElementById("desenlace-sello");
  const titulo = caja.querySelector(".desenlace-titulo");
  const texto = caja.querySelector(".desenlace-texto");
  const efectos = document.getElementById("desenlace-efectos");
  const btn = document.getElementById("btn-continuar");

  let giro = null;
  let temporizador = null;
  let revelado = false;

  function revelar() {
    if (revelado) return;
    revelado = true;
    clearInterval(giro);
    clearTimeout(temporizador);
    caja.classList.remove("sorteando");
    caja.classList.add("revelado");
    sello.textContent = info.icono;
    titulo.textContent = info.titulo;
    texto.textContent = resultado.texto;
    efectos.innerHTML = chipsEfecto(resultado.efecto);
  }

  if (sinMovimiento) {
    revelar();
  } else {
    // Suspense breve: el sello va alternando antes de fijarse en el desenlace.
    caja.classList.add("sorteando");
    const caras = ["✔", "✖", "•"];
    let n = 0;
    giro = setInterval(() => { sello.textContent = caras[n++ % caras.length]; }, 110);
    temporizador = setTimeout(revelar, 1100);
  }

  // El botón nunca se bloquea: si aún se está sorteando, la primera pulsación
  // se salta la animación y muestra ya el desenlace.
  btn.onclick = () => {
    if (!revelado) revelar();
    else cb.onContinuar();
  };
}

/* ================= RESUMEN DE TEMPORADA ================= */
function renderResumenTemporada(jugador, resultado, cb) {
  // Ojo: si el club ascendió/descendió esta misma temporada, jugador.club.division
  // ya apunta a la división NUEVA — para el resumen usamos la que realmente se jugó.
  const liga = PAISES[jugador.club.paisId].ligas[resultado.divisionJugada];
  const chips = [];
  if (resultado.esCampeon) chips.push(`<span class="chip oro destaca">${ico("titulo")} Campeón/a de ${escapar(liga.nombre)}</span>`);
  if (resultado.copa) chips.push(`<span class="chip oro">${ico("titulo")} Copa</span>`);
  if (resultado.ascensoDivision) chips.push(`<span class="chip verde destaca">${ico("flecha-arriba")} ¡Asciende a 1ª división!</span>`);
  if (resultado.descensoDivision) chips.push(`<span class="chip rojo">${ico("flecha-abajo")} Desciende a 2ª división</span>`);
  if (resultado.temporadaDificil && !resultado.descensoDivision) chips.push(`<span class="chip rojo">${ico("flecha-abajo")} Temporada difícil</span>`);
  if (resultado.lesionado) chips.push(`<span class="chip rojo">${ico("lesion")} Lesión</span>`);
  chips.push(`<span class="chip azul">${ico(resultado.titular ? "liderazgo" : "descanso")} ${resultado.titular ? "Titular habitual" : "Rol suplente"}</span>`);
  const chipsHtml = chips.map((c, i) => c.replace('class="chip', `style="--i:${i}" class="chip`)).join("");

  // Si se ha ganado algo, la vitrina enseña el trofeo en grande: es el
  // momento culminante de la temporada y merece más que una etiqueta.
  const trofeos = [];
  if (resultado.esCampeon) trofeos.push({ svg: trofeoSvg("liga", 74), titulo: escapar(liga.nombre), sub: "Campeón/a de liga" });
  if (resultado.copa) trofeos.push({ svg: trofeoSvg("copa", 74), titulo: "Copa nacional", sub: "Título de copa" });
  const vitrinaHtml = trofeos.length ? `
    <div class="vitrina">
      ${trofeos.map((t, i) => `
        <div class="vitrina-pieza" style="--i:${i}">
          ${t.svg}
          <span class="vitrina-txt"><b>${t.titulo}</b><span>${t.sub}</span></span>
        </div>`).join("")}
    </div>` : "";

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
        <span class="chip ${fin.neto >= 0 ? "verde" : "rojo"}">${ico("dinero")} ${signo}${fin.neto.toLocaleString("es-ES")} € netos</span>
      </div>
      ${fin.evento ? `<p class="narrativa destacada">${escapar(fin.evento.texto)} (${fin.evento.delta >= 0 ? "+" : ""}${fin.evento.delta.toLocaleString("es-ES")} €)</p>` : ""}
    `;
  }

  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">Fin de temporada · ${jugador.edad} años</span>
          <h2>${resultado.posicion}º de ${resultado.nClubes} en ${escapar(liga.nombre)}</h2>
        </div>
        ${emblemaLiga(jugador.club.paisId, resultado.divisionJugada, 46)}
      </div>
      <p class="narrativa"><b>${escapar(jugador.club.nombre)}</b> cierra la temporada en la <b>${resultado.posicion}ª posición</b>.</p>
      ${resultado.fraseFinal ? `<p class="narrativa destacada">${resultado.fraseFinal}</p>` : ""}
      ${vitrinaHtml}
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
    const res = info.torneoResultado.resultado;
    const hayMedalla = /oro|plata|bronce/i.test(res);
    extra = `
      <p class="narrativa destacada">
        Compites en <b>${escapar(info.torneoResultado.torneo)}</b> con la selección ${escapar(paisJugador.gentilicio)}.
      </p>
      ${hayMedalla ? `
        <div class="vitrina">
          <div class="vitrina-pieza" style="--i:0">
            ${trofeoSvg(res, 80)}
            <span class="vitrina-txt"><b>${escapar(res.replace(/^[^\p{L}]+/u, ""))}</b><span>${escapar(info.torneoResultado.torneo)}</span></span>
          </div>
        </div>`
        : `<div class="chips"><span class="chip azul">${escapar(res)}</span></div>`}`;
  }
  pintarPantalla(`
    <div class="panel">
      <div class="panel-cabecera">
        <div>
          <span class="eyebrow">Selección nacional</span>
          <h2>Te llaman</h2>
        </div>
        ${ico("seleccion", "ico-cabecera")}
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
    if (o.ascenso) insignias.push(`<span class="chip verde">${ico("flecha-arriba")} Ascenso a 1ª</span>`);
    if (o.internacional) insignias.push(`<span class="chip azul">${banderaSvg(o.paisId, 16)} ${escapar(paisOferta.nombre)}</span>`);

    return `
    <button class="opcion oferta" data-idx="${i}" style="--i:${i}">
      ${escudoClub(o.club, 52)}
      <span class="oferta-datos">
        <span class="titulo-opcion">${o.esActual ? "Renovar con " : "Fichar por "}${escapar(o.club)}</span>
        <span class="detalle-opcion">${escapar(ligaOferta.nombre)} · ${etiquetaDivision(o.division)}</span>
        ${insignias.length ? `<span class="chips">${insignias.join("")}</span>` : ""}
      </span>
      <span class="oferta-salario"><b>${o.salario.toLocaleString("es-ES")} €</b><span>por temporada</span></span>
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
            <span class="titulo-opcion">Poner fin a tu carrera profesional</span>
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
  // El balance de carrera se lee a pantalla completa: la ficha y la tabla de
  // trayectoria sobran aquí porque este resumen ya recoge ambas cosas.
  $ficha().classList.add("oculto");
  $trayectoria().classList.add("oculto");
  const e = jugador.estadisticasCarrera;

  const historialClubes = jugador.historialClubes.map((c) => {
    const pais = PAISES[c.paisId];
    // Si el club cambió de categoría durante la etapa, se listan las dos ligas.
    const divisiones = c.divisiones && c.divisiones.length ? c.divisiones : [c.division];
    const competiciones = divisiones
      .map((d) => `${escapar(pais.ligas[d].nombre)} <span class="tenue">(${etiquetaDivision(d)})</span>`)
      .join(" → ");
    return `<tr>
      <td><span class="celda-club">${escudoClub(c.club, 30)}<span>${escapar(c.club)}<br><span class="tenue">${escapar(pais.nombre)}</span></span></span></td>
      <td>${competiciones}</td>
      <td>${c.desdeEdad} años</td>
    </tr>`;
  }).join("");

  // Palmarés como vitrina de trofeos. Solo entran los metales de verdad:
  // llegar a semifinales es un mérito, pero no es un trofeo y desentonaba
  // ver una copa junto a un "fase de grupos".
  const esMedalla = (texto) => /oro|plata|bronce/i.test(texto);
  const piezas = [
    ...jugador.titulos.map((t) => ({
      svg: trofeoSvg(t.tipo, 62), titulo: t.tipo, sub: `${escapar(t.liga)} · ${t.edad} años`,
    })),
    ...jugador.torneosInternacionales.filter((t) => esMedalla(t.resultado)).map((t) => ({
      svg: trofeoSvg(t.resultado, 62),
      titulo: escapar(t.resultado.replace(/^[^\p{L}]+/u, "").trim()),
      sub: `${escapar(t.torneo)} · ${t.edad} años`,
    })),
  ];

  // Participaciones sin medalla: se listan aparte, como méritos.
  const sinMedalla = jugador.torneosInternacionales.filter((t) => !esMedalla(t.resultado));
  const otrasHtml = sinMedalla.length
    ? `<div class="chips">${sinMedalla.map((t, i) =>
        `<span style="--i:${i}" class="chip azul">${ico("seleccion")} ${escapar(t.torneo)}: ${escapar(t.resultado)} · ${t.edad} años</span>`).join("")}</div>`
    : "";

  const palmares = (piezas.length
    ? `<div class="vitrina amplia">${piezas.map((p, i) => `
        <div class="vitrina-pieza" style="--i:${i}">
          ${p.svg}
          <span class="vitrina-txt"><b>${p.titulo}</b><span>${p.sub}</span></span>
        </div>`).join("")}</div>`
    : `<p class="narrativa">No conseguiste títulos, pero cada temporada dejó su huella.</p>`) + otrasHtml;

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
      <span class="franjas" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
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
      ${palmares}
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

/* ================= LOGROS ================= */
/* El modal vive fuera de #pantalla (ver index.html), así que se puede abrir
   desde cualquier momento de la partida sin tocar el estado del juego. */
function tarjetaLogro(logro, info) {
  const conseguido = Boolean(info);
  return `
    <div class="logro-card ${conseguido ? "conseguido" : "bloqueado"}">
      <span class="logro-icono">${conseguido ? logro.icono : ico("candado")}</span>
      <span class="logro-texto">
        <span class="logro-nombre">${escapar(logro.nombre)}</span>
        <span class="logro-desc">${conseguido ? escapar(logro.descripcion) : "???"}</span>
        ${conseguido ? `<span class="logro-meta">Conseguido a los ${info.edad} años</span>` : ""}
      </span>
    </div>`;
}

function renderLogros() {
  const desbloqueados = cargarDesbloqueados();
  const categorias = [];
  for (const l of LOGROS) if (!categorias.includes(l.categoria)) categorias.push(l.categoria);

  const bloques = categorias.map((cat) => {
    const items = LOGROS.filter((l) => l.categoria === cat)
      .map((l) => tarjetaLogro(l, desbloqueados[l.id])).join("");
    return `<div class="logros-categoria"><h3>${escapar(cat)}</h3><div class="logros-grid">${items}</div></div>`;
  }).join("");

  const conseguidos = Object.keys(desbloqueados).length;
  const total = LOGROS.length;

  document.getElementById("logros-contenido").innerHTML = `
    <div class="logros-progreso">
      <div class="logros-progreso-pista"><div class="logros-progreso-relleno" style="width:${Math.round((conseguidos / total) * 100)}%"></div></div>
      <span>${conseguidos} / ${total} conseguidos</span>
    </div>
    ${bloques}
  `;
}

function abrirLogros() {
  renderLogros();
  document.getElementById("modal-logros").classList.remove("oculto");
  document.body.classList.add("modal-abierto");
}

function cerrarLogros() {
  document.getElementById("modal-logros").classList.add("oculto");
  document.body.classList.remove("modal-abierto");
}

/* Engancha los controles del modal una sola vez, al arrancar la aplicación. */
function inicializarLogrosUI() {
  document.getElementById("btn-logros").onclick = abrirLogros;
  document.getElementById("cerrar-logros").onclick = cerrarLogros;
  document.getElementById("modal-logros").addEventListener("click", (e) => {
    if (e.target.id === "modal-logros") cerrarLogros();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("modal-logros").classList.contains("oculto")) cerrarLogros();
  });
}

/* Aviso emergente al desbloquear un logro, apilado en la esquina. */
const MAX_TOASTS = 3;

function mostrarLogroToast(logro) {
  const cont = document.getElementById("logros-toast");
  // Una temporada redonda puede desbloquear media docena de logros a la vez;
  // apilados taparían justo las estadísticas que el jugador quiere leer.
  while (cont.children.length >= MAX_TOASTS) cont.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = "logro-toast";
  el.innerHTML = `
    <span class="logro-toast-icono">${logro.icono}</span>
    <span class="logro-toast-texto"><b>Logro conseguido</b>${escapar(logro.nombre)}</span>
  `;
  cont.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("visible")));
  setTimeout(() => {
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 400);
  }, 4200);
}

export {
  renderSidebar, actualizarCabeceraTemporada, renderInicio, renderCreacion,
  renderEntrenamiento, renderEvento, renderResultadoEvento, renderResumenTemporada,
  renderConvocatoria, renderFichajes, renderRetiro,
  inicializarLogrosUI, mostrarLogroToast, renderTrayectoria,
};

import { ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION, PAISES } from "./data.js";
import {
  calcularOverall, calcularOverallMedio, calcularOverallMaximo, equiposIniciales,
  clamp as clampNumero, EDAD_INICIAL, EDAD_RETIRO_OBLIGATORIO, probabilidadesOpcion,
} from "./engine.js";
import { LOGROS, cargarDesbloqueados } from "./logros.js";

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
        <h2>${escapar(jugador.nombre)} <span class="dorsal">#${jugador.dorsal}</span></h2>
        <div class="sub">${posicion} · ${jugador.edad} años<br>${paisJugador.bandera} ${escapar(paisJugador.nombre)}</div>
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

/* Pinta la barra central de la cabecera con cualquier progreso (temporadas de
   la carrera o pasos de la creación), para que no quede un hueco vacío. */
function mostrarProgresoCabecera({ etiqueta, detalle, porcentaje }) {
  const progreso = document.getElementById("cabecera-progreso");
  progreso.hidden = false;
  document.getElementById("progreso-etiqueta").textContent = etiqueta;
  document.getElementById("progreso-restante").textContent = detalle;
  document.getElementById("progreso-relleno").style.width = `${porcentaje}%`;
}

function actualizarCabeceraTemporada(jugador, temporadaNum) {
  const el = $cabeceraTemporada();
  const progreso = document.getElementById("cabecera-progreso");

  if (!jugador) {
    el.textContent = "";
    progreso.hidden = true;
    return;
  }

  el.textContent = `T${temporadaNum} · ${jugador.edad} años`;

  // Barra de progreso de la carrera (16 → 38 años), visible en escritorio.
  const total = EDAD_RETIRO_OBLIGATORIO - EDAD_INICIAL;
  const restantes = Math.max(0, EDAD_RETIRO_OBLIGATORIO - jugador.edad);
  mostrarProgresoCabecera({
    etiqueta: `Temporada ${temporadaNum} · ${jugador.edad} años`,
    detalle: restantes === 0 ? "última temporada" : `${restantes} ${restantes === 1 ? "año" : "años"} por delante`,
    porcentaje: clampNumero(Math.round(((jugador.edad - EDAD_INICIAL) / total) * 100), 0, 100),
  });
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

/* ================= CREACIÓN DE PERSONAJE =================
   Dos pasos: primero la identidad (camiseta con dorsal, nacionalidad y
   posición sobre la cancha) y después el primer equipo y el reparto de
   atributos. Todo se actualiza en sitio, sin reconstruir la pantalla, para
   que no reaparezcan las animaciones de entrada en cada clic. */

/* Dónde juega cada posición sobre la media cancha (red arriba).
   x/y en % dentro de la pista; zona = numeración oficial del voleibol. */
const PUESTOS_CANCHA = {
  receptor:  { corto: "REC", x: 20, y: 24, zona: 4 },
  central:   { corto: "CEN", x: 50, y: 18, zona: 3 },
  opuesto:   { corto: "OPU", x: 80, y: 24, zona: 2 },
  libero:    { corto: "LIB", x: 30, y: 74, zona: 5 },
  colocador: { corto: "COL", x: 76, y: 68, zona: 1 },
};

/* Camiseta como una equipación real: el nombre va arqueado en la parte alta
   de la espalda y el dorsal, grande, centrado debajo. Las piezas (cuerpo,
   mangas, cuello y banda inferior) se colorean según la selección elegida. */
const CAMISETA_CONTORNO = "M78 16 L44 30 L14 64 L48 94 L64 80 L64 220 Q110 234 156 220 L156 80 L172 94 L206 64 L176 30 L142 16 Q110 42 78 16 Z";

function camisetaSvg() {
  return `
    <svg class="camiseta" viewBox="0 0 220 250" role="img" aria-label="Camiseta del jugador">
      <defs>
        <linearGradient id="brilloTela" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity=".22"/>
          <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity=".16"/>
        </linearGradient>
        <path id="arco-nombre" d="M67 84 Q110 64 153 84" fill="none"/>
      </defs>

      <path class="kit-cuerpo" d="${CAMISETA_CONTORNO}"/>
      <path class="kit-detalle" d="M78 16 L44 30 L14 64 L48 94 L64 80 Z"/>
      <path class="kit-detalle" d="M142 16 L176 30 L206 64 L172 94 L156 80 Z"/>
      <path class="kit-detalle" d="M64 200 L156 200 L156 220 Q110 234 64 220 Z"/>
      <path class="kit-detalle" d="M78 16 Q110 42 142 16 Q110 58 78 16 Z"/>
      <path class="kit-brillo" d="${CAMISETA_CONTORNO}" fill="url(#brilloTela)"/>
      <path class="kit-contorno" d="${CAMISETA_CONTORNO}"/>

      <text id="camiseta-nombre" class="camiseta-nombre">
        <textPath href="#arco-nombre" startOffset="50%" text-anchor="middle">JUGADOR</textPath>
      </text>
      <text id="camiseta-dorsal" class="camiseta-dorsal" x="110" y="162" text-anchor="middle">10</text>
    </svg>`;
}

function canchaSvg(seleccionada) {
  const marcas = Object.entries(PUESTOS_CANCHA).map(([id, p]) => `
    <button type="button" class="puesto ${seleccionada === id ? "elegido" : ""}" data-pos="${id}" style="--x:${p.x}%; --y:${p.y}%"
            aria-label="${POSICIONES[id].nombre}">
      <span class="puesto-corto">${p.corto}</span>
      <span class="puesto-zona">${p.zona}</span>
    </button>`).join("");

  return `
    <div class="cancha">
      <div class="cancha-red" aria-hidden="true"></div>
      <div class="cancha-linea-ataque" aria-hidden="true"></div>
      ${marcas}
    </div>`;
}

function renderCreacion(cb) {
  const estadoLocal = {
    nombre: "",
    dorsal: String(Math.floor(Math.random() * 99) + 1),
    paisId: null,
    posicionId: null,
    clubNombre: null,
    reparto: Object.fromEntries(ATRIBUTOS.map((a) => [a.id, 0])),
  };

  const puntosUsados = () => Object.values(estadoLocal.reparto).reduce((a, b) => a + b, 0);
  const dorsalValido = () => {
    const n = Number(estadoLocal.dorsal);
    return Number.isInteger(n) && n >= 1 && n <= 99;
  };
  const identidadLista = () => Boolean(estadoLocal.nombre.trim() && dorsalValido() && estadoLocal.paisId && estadoLocal.posicionId);

  /* ---------- PASO 1: identidad ---------- */
  function pasoIdentidad() {
    mostrarProgresoCabecera({ etiqueta: "Creando tu jugador/a", detalle: "paso 1 de 2", porcentaje: 50 });
    const paisesHtml = Object.entries(PAISES).map(([id, p]) => `
      <button type="button" class="pais-item ${estadoLocal.paisId === id ? "elegido" : ""}" data-pais="${id}" data-nombre="${escapar(p.nombre.toLowerCase())}">
        <span class="pais-bandera">${p.bandera}</span>
        <span class="pais-nombre">${escapar(p.nombre)}</span>
      </button>`).join("");

    pintarPantalla(`
      <div class="panel">
        <div class="panel-cabecera">
          <div>
            <span class="eyebrow">Nueva carrera · paso 1 de 2</span>
            <h2>Define tu identidad</h2>
          </div>
        </div>

        <div class="creacion-grid">
          <section class="creacion-col">
            <h3 class="col-titulo">Identidad</h3>
            ${camisetaSvg()}
            <div class="campos-identidad">
              <div class="campo campo-ancho">
                <label for="input-nombre">Nombre</label>
                <input type="text" id="input-nombre" maxlength="16" placeholder="APELLIDO" autocomplete="off" value="${escapar(estadoLocal.nombre)}">
              </div>
              <div class="campo">
                <label for="input-dorsal">Dorsal</label>
                <input type="number" id="input-dorsal" min="1" max="99" inputmode="numeric" value="${estadoLocal.dorsal}">
              </div>
            </div>
          </section>

          <section class="creacion-col">
            <h3 class="col-titulo">Nacionalidad</h3>
            <input type="search" id="buscar-pais" class="buscador" placeholder="🔍 Buscar país" autocomplete="off">
            <div class="lista-paises" id="lista-paises">${paisesHtml}</div>
          </section>

          <section class="creacion-col">
            <h3 class="col-titulo">Posición</h3>
            ${canchaSvg(estadoLocal.posicionId)}
            <div class="cancha-info" id="cancha-info">${
              estadoLocal.posicionId
                ? `<b>${escapar(POSICIONES[estadoLocal.posicionId].nombre)}</b><span>${escapar(POSICIONES[estadoLocal.posicionId].descripcion)}</span>`
                : `<b>Elige tu posición</b><span>Pulsa un puesto sobre la cancha para ver qué hace.</span>`
            }</div>
          </section>
        </div>

        <div class="opciones">
          <button class="principal" id="btn-siguiente" disabled>Confirmar identidad</button>
        </div>
      </div>
    `);

    const $ = (s) => document.querySelector(s);
    const btnSiguiente = $("#btn-siguiente");
    const camisetaNombre = $("#camiseta-nombre");
    const camisetaDorsal = $("#camiseta-dorsal");
    const inputDorsal = $("#input-dorsal");
    const canchaInfo = $("#cancha-info");

    const refrescarBoton = () => { btnSiguiente.disabled = !identidadLista(); };

    /* El cuerpo de la camiseta mide 92 unidades de ancho en el viewBox.
       Primero se reduce el tamaño de letra, pero solo hasta un mínimo legible;
       si aún no cabe (nombres muy largos), se comprime el texto. */
    function ajustarTextoCamiseta(el, texto, anchoMaximo, tamanoBase, tamanoMinimo) {
      const destino = el.querySelector("textPath") || el;
      destino.textContent = texto;
      destino.removeAttribute("textLength");
      destino.removeAttribute("lengthAdjust");

      let tam = tamanoBase;
      el.style.fontSize = `${tam}px`;
      while (tam > tamanoMinimo && el.getComputedTextLength() > anchoMaximo) {
        tam -= 1;
        el.style.fontSize = `${tam}px`;
      }
      if (el.getComputedTextLength() > anchoMaximo) {
        destino.setAttribute("textLength", anchoMaximo);
        destino.setAttribute("lengthAdjust", "spacingAndGlyphs");
      }
    }
    const ajustarNombreCamiseta = (texto) => ajustarTextoCamiseta(camisetaNombre, texto, 84, 15, 9);
    const ajustarDorsalCamiseta = (texto) => ajustarTextoCamiseta(camisetaDorsal, texto, 84, 66, 40);

    /* Pinta la camiseta con los colores de la selección elegida. */
    function aplicarKit(paisId) {
      const svg = document.querySelector(".camiseta");
      if (!svg) return;
      const kit = paisId ? PAISES[paisId].kit : null;
      for (const [prop, valor] of [["--kit-base", kit?.base], ["--kit-detalle", kit?.detalle], ["--kit-texto", kit?.texto]]) {
        if (valor) svg.style.setProperty(prop, valor);
        else svg.style.removeProperty(prop);
      }
    }

    $("#input-nombre").oninput = (e) => {
      estadoLocal.nombre = e.target.value;
      ajustarNombreCamiseta((e.target.value.trim() || "JUGADOR").toUpperCase());
      refrescarBoton();
    };
    aplicarKit(estadoLocal.paisId);
    ajustarNombreCamiseta((estadoLocal.nombre.trim() || "JUGADOR").toUpperCase());
    refrescarBoton();

    inputDorsal.oninput = (e) => {
      estadoLocal.dorsal = e.target.value;
      ajustarDorsalCamiseta(dorsalValido() ? String(Number(e.target.value)) : "?");
      inputDorsal.classList.toggle("invalido", e.target.value !== "" && !dorsalValido());
      refrescarBoton();
    };
    inputDorsal.onblur = () => {
      if (!dorsalValido()) {
        estadoLocal.dorsal = String(clampNumero(Number(estadoLocal.dorsal) || 1, 1, 99));
        inputDorsal.value = estadoLocal.dorsal;
        inputDorsal.classList.remove("invalido");
        ajustarDorsalCamiseta(estadoLocal.dorsal);
        refrescarBoton();
      }
    };
    ajustarDorsalCamiseta(estadoLocal.dorsal);

    $("#buscar-pais").oninput = (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll(".pais-item").forEach((el) => {
        el.hidden = q !== "" && !el.dataset.nombre.includes(q);
      });
    };

    document.querySelectorAll(".pais-item").forEach((el) => {
      el.onclick = () => {
        estadoLocal.paisId = el.dataset.pais;
        estadoLocal.clubNombre = null;      // el equipo depende del país
        document.querySelectorAll(".pais-item").forEach((o) => o.classList.toggle("elegido", o === el));
        aplicarKit(estadoLocal.paisId);
        refrescarBoton();
      };
    });

    document.querySelectorAll(".puesto").forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.pos;
        estadoLocal.posicionId = id;
        document.querySelectorAll(".puesto").forEach((o) => o.classList.toggle("elegido", o === el));
        canchaInfo.innerHTML = `<b>${escapar(POSICIONES[id].nombre)}</b><span>${escapar(POSICIONES[id].descripcion)}</span>`;
        refrescarBoton();
      };
    });

    btnSiguiente.onclick = () => pasoEquipo();
  }

  /* ---------- PASO 2: equipo y atributos ---------- */
  function pasoEquipo() {
    mostrarProgresoCabecera({ etiqueta: "Creando tu jugador/a", detalle: "paso 2 de 2", porcentaje: 100 });
    const pais = PAISES[estadoLocal.paisId];
    const opciones = equiposIniciales(estadoLocal.paisId, 3);
    const perfil = POSICIONES[estadoLocal.posicionId];
    for (const id of Object.keys(estadoLocal.reparto)) estadoLocal.reparto[id] = 0;

    const equiposHtml = opciones.map((c, i) => `
      <button type="button" class="tarjeta-equipo" data-club="${escapar(c.nombre)}" style="--i:${i}">
        <span class="equipo-nombre">${escapar(c.nombre)}</span>
        <span class="equipo-liga">${escapar(pais.ligas.segunda.nombre)}</span>
        <span class="equipo-prestigio" aria-label="Prestigio ${c.prestigio} sobre 10">
          ${"★".repeat(Math.max(1, Math.round(c.prestigio / 2)))}<span class="tenue">${"★".repeat(5 - Math.max(1, Math.round(c.prestigio / 2)))}</span>
        </span>
      </button>`).join("");

    /* Un deslizador por atributo: arrastrar es mucho más cómodo que ir
       pulsando "+" punto a punto. La escala va de 0 al tope para que la barra
       represente el valor real del atributo; el tramo inicial es el valor base
       de la posición y no se puede reducir. */
    const repartoHtml = ATRIBUTOS.filter((a) => perfil.pesos[a.id] > 0).map((a) => `
      <div class="reparto-atributo" data-fila="${a.id}">
        <span class="nombre-attr">${a.icono} ${a.nombre}</span>
        <span class="valor-attr">${perfil.base[a.id]}</span>
        <input type="range" class="deslizador" data-attr="${a.id}"
               min="0" max="${TOPE_CREACION}" step="1"
               value="${perfil.base[a.id]}" aria-label="${a.nombre}">
      </div>`).join("");

    pintarPantalla(`
      <div class="panel">
        <div class="panel-cabecera">
          <div>
            <span class="eyebrow">Nueva carrera · paso 2 de 2</span>
            <h2>Tu primer equipo</h2>
          </div>
        </div>

        <p class="narrativa">
          ${escapar(estadoLocal.nombre.trim())} <b>#${escapar(estadoLocal.dorsal)}</b> ·
          ${escapar(perfil.nombre)} · ${pais.bandera} ${escapar(pais.nombre)}.
          Empiezas en <b>${escapar(pais.ligas.segunda.nombre)}</b>: elige dónde firmar tu primer contrato.
        </p>

        <div class="equipos-grid">${equiposHtml}</div>

        <div class="form-fila" style="margin-top:24px;">
          <label>Reparto de atributos</label>
          <div class="puntos-restantes"><b id="puntos-libres">${PUNTOS_CREACION}</b> puntos disponibles</div>
          <div id="lista-reparto">${repartoHtml}</div>
        </div>

        <div class="opciones">
          <button class="principal" id="btn-crear" disabled>Comenzar carrera</button>
          <button class="secundario" id="btn-atras">Volver a la identidad</button>
        </div>
      </div>
    `);

    const btnCrear = document.getElementById("btn-crear");
    const listaReparto = document.getElementById("lista-reparto");
    const puntosLibres = document.getElementById("puntos-libres");

    function actualizarValores() {
      const restantes = PUNTOS_CREACION - puntosUsados();
      puntosLibres.textContent = restantes;
      listaReparto.querySelectorAll("[data-fila]").forEach((fila) => {
        const id = fila.dataset.fila;
        const base = perfil.base[id];
        const valor = base + estadoLocal.reparto[id];
        const deslizador = fila.querySelector(".deslizador");

        fila.querySelector(".valor-attr").textContent = valor;
        deslizador.value = valor;
        // El tramo hasta "base" es fijo; a partir de ahí, los puntos repartidos.
        deslizador.style.setProperty("--base", `${(base / TOPE_CREACION) * 100}%`);
        deslizador.style.setProperty("--relleno", `${(valor / TOPE_CREACION) * 100}%`);
        fila.classList.toggle("al-maximo", valor >= TOPE_CREACION);
      });
      btnCrear.disabled = !estadoLocal.clubNombre;
    }

    document.querySelectorAll(".tarjeta-equipo").forEach((el) => {
      el.onclick = () => {
        estadoLocal.clubNombre = el.dataset.club;
        document.querySelectorAll(".tarjeta-equipo").forEach((o) => o.classList.toggle("elegido", o === el));
        btnCrear.disabled = false;
      };
    });

    /* Un solo listener para todas las barras. Aunque cada barra ya lleva su
       propio tope, se vuelve a limitar aquí: así el reparto nunca puede pasar
       de los puntos disponibles (por teclado, por arrastre rápido, etc.). */
    listaReparto.oninput = (e) => {
      const deslizador = e.target.closest(".deslizador");
      if (!deslizador) return;
      const attr = deslizador.dataset.attr;
      const base = perfil.base[attr];
      const usadosEnOtros = puntosUsados() - estadoLocal.reparto[attr];
      // No se puede bajar del valor base ni gastar más puntos de los que quedan.
      const extraMaximo = Math.min(TOPE_CREACION - base, PUNTOS_CREACION - usadosEnOtros);
      estadoLocal.reparto[attr] = clampNumero(Number(deslizador.value) - base, 0, extraMaximo);
      actualizarValores();
    };

    document.getElementById("btn-atras").onclick = () => pasoIdentidad();
    btnCrear.onclick = () => cb.onCrear({ ...estadoLocal });

    actualizarValores();
  }

  pasoIdentidad();
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

function renderEvento(jugador, evento, titulo, cb) {
  const opciones = evento.opciones.map((op, i) => `
    <button class="opcion" data-idx="${i}">
      <span class="titulo-opcion">${escapar(op.texto)}</span>
      ${barraProbabilidad(probabilidadesOpcion(op))}
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

/* Etiquetas legibles para cada cosa que puede cambiar un evento. */
const NOMBRES_EFECTO = {
  moral: { icono: "🙂", nombre: "Moral" },
  dinero: { icono: "💰", nombre: "Ahorros", sufijo: " €" },
  reputacion: { icono: "📣", nombre: "Reputación" },
  riesgoLesion: { icono: "🩹", nombre: "Riesgo de lesión", alRevés: true },
};

function chipsEfecto(efecto) {
  const entradas = Object.entries(efecto || {});
  if (!entradas.length) return `<div class="chips"><span class="chip">Sin cambios</span></div>`;

  const chips = entradas.map(([clave, valor], i) => {
    const attr = ATRIBUTOS.find((a) => a.id === clave);
    const meta = attr ? { icono: attr.icono, nombre: attr.nombre } : (NOMBRES_EFECTO[clave] || { icono: "•", nombre: clave });
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

/* ================= LOGROS ================= */
/* El modal vive fuera de #pantalla (ver index.html), así que se puede abrir
   desde cualquier momento de la partida sin tocar el estado del juego. */
function tarjetaLogro(logro, info) {
  const conseguido = Boolean(info);
  return `
    <div class="logro-card ${conseguido ? "conseguido" : "bloqueado"}">
      <span class="logro-icono">${conseguido ? logro.icono : "🔒"}</span>
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
function mostrarLogroToast(logro) {
  const cont = document.getElementById("logros-toast");
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
  inicializarLogrosUI, mostrarLogroToast,
};

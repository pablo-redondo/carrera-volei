import { PAISES } from "./data.js";

/* ============================================================
   Gráficos generados: escudos de club, emblemas de liga y trofeos.

   Todo se dibuja como SVG a medida en lugar de descargar imágenes:
   los logotipos reales de las competiciones y los clubes son marcas
   registradas, así que aquí se crean emblemas originales. Cada club
   recibe siempre el mismo escudo (los colores y el patrón salen de un
   hash de su nombre), de modo que el CV Melilla se reconoce igual en
   la ficha, en el mercado de fichajes y en el palmarés.
   ============================================================ */

/* Hash FNV-1a: determinista y bien repartido, para que dos clubes con
   nombres parecidos no acaben con el mismo escudo. */
function hash(cadena) {
  let h = 2166136261;
  for (let i = 0; i < cadena.length; i++) {
    h ^= cadena.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* Contador para que los <clipPath> de cada escudo tengan un id único:
   si se repiten, todos los escudos de la página heredan el recorte del
   primero y se ven mal. */
let contadorId = 0;

const PALETA_ESCUDOS = [
  { base: "#c1121f", acento: "#ffe08a" },
  { base: "#003049", acento: "#f77f00" },
  { base: "#005f73", acento: "#94d2bd" },
  { base: "#0a6c74", acento: "#e9d8a6" },
  { base: "#264653", acento: "#2a9d8f" },
  { base: "#1d3557", acento: "#a8dadc" },
  { base: "#6a040f", acento: "#ffba08" },
  { base: "#3d348b", acento: "#f7b801" },
  { base: "#14213d", acento: "#fca311" },
  { base: "#2b2d42", acento: "#ef476f" },
  { base: "#1b5e3f", acento: "#b7e4c7" },
  { base: "#6b4423", acento: "#e6ccb2" },
  { base: "#41415e", acento: "#f2e9e4" },
  { base: "#7d0633", acento: "#ff8fab" },
  { base: "#023e8a", acento: "#48cae4" },
  { base: "#3a2618", acento: "#ffd166" },
  { base: "#38040e", acento: "#d8a48f" },
  { base: "#10451d", acento: "#98d8a0" },
];

/* Palabras que no aportan nada a unas iniciales de escudo: casi todos los
   clubes de voleibol empiezan por "CV", "VC" o "Club Voleibol". */
const RUIDO = new Set([
  "cv", "vc", "cd", "sd", "ud", "ad", "ca", "as", "cs", "gs", "vk", "ok", "zaksa",
  "club", "voleibol", "volei", "vôlei", "volley", "volleyball", "pallavolo", "siatkarska",
  "de", "del", "la", "el", "los", "las", "di", "du", "da", "do", "y", "e",
]);

function inicialesClub(nombre) {
  const palabras = nombre
    .split(/[\s.\-·/]+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const utiles = palabras.filter((p) => !RUIDO.has(p.toLowerCase()));
  const base = utiles.length ? utiles : palabras;
  if (!base.length) return "VC";
  // Con una sola palabra útil quedan mejor tres letras ("ARA") que una sola.
  if (base.length === 1) return base[0].slice(0, 3).toUpperCase();
  return base.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
}

/* Patrones heráldicos clásicos, recortados a la silueta del escudo. */
function patronEscudo(indice, acento) {
  switch (indice % 6) {
    case 0: // palos verticales
      return [16, 44, 72].map((x) => `<rect x="${x}" y="0" width="13" height="112" fill="${acento}" opacity=".85"/>`).join("");
    case 1: // partido en diagonal
      return `<path d="M0 0H100V112Z" fill="${acento}" opacity=".8"/>`;
    case 2: // banda diagonal
      return `<path d="M-12 66 L60 -12 L96 -12 L-12 100Z" fill="${acento}" opacity=".85"/>`;
    case 3: // cheurón
      return `<path d="M0 26 L50 62 L100 26 V54 L50 90 L0 54Z" fill="${acento}" opacity=".82"/>`;
    case 4: // fajas horizontales
      return [4, 38, 72].map((y) => `<rect x="0" y="${y}" width="100" height="17" fill="${acento}" opacity=".82"/>`).join("");
    default: // cuartelado
      return `<path d="M0 0H50V56H0Z M50 56H100V112H50Z" fill="${acento}" opacity=".82"/>`;
  }
}

const SILUETA_ESCUDO = "M50 3 L95 17 V56 C95 83 75 99 50 108 C25 99 5 83 5 56 V17Z";

/* Escudo de club. `tam` es el lado en píxeles del cuadro que ocupa. */
function escudoClub(nombre, tam = 44) {
  const h = hash(nombre || "club");
  const { base, acento } = PALETA_ESCUDOS[h % PALETA_ESCUDOS.length];
  const iniciales = inicialesClub(nombre || "Club");
  const uid = `esc-${contadorId++}`;

  return `
  <svg class="escudo" viewBox="0 0 100 112" width="${tam}" height="${Math.round(tam * 1.12)}" role="img" aria-label="Escudo de ${nombre}">
    <defs>
      <clipPath id="${uid}-c"><path d="${SILUETA_ESCUDO}"/></clipPath>
      <linearGradient id="${uid}-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".26"/>
        <stop offset="46%" stop-color="#ffffff" stop-opacity=".03"/>
        <stop offset="100%" stop-color="#000000" stop-opacity=".32"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#${uid}-c)">
      <rect x="0" y="0" width="100" height="112" fill="${base}"/>
      ${patronEscudo(h >>> 9, acento)}
      <!-- plancha oscura tras las iniciales: garantiza que se lean sea cual
           sea el patrón que haya tocado debajo -->
      <rect x="0" y="55" width="100" height="34" fill="#0b1018" opacity=".72"/>
      <rect x="0" y="0" width="100" height="112" fill="url(#${uid}-b)"/>
    </g>
    <path d="${SILUETA_ESCUDO}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3.4"/>
    <path d="${SILUETA_ESCUDO}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <circle cx="50" cy="32" r="11" fill="#f4f8fc" opacity=".95"/>
    <g stroke="${base}" stroke-width="2.1" fill="none" stroke-linecap="round">
      <path d="M50 21c-5 5-7 11-6 18"/>
      <path d="M61 30c-5-1-12 1-17 6"/>
      <path d="M55 42c-1-6 1-12 6-16"/>
    </g>
    <text x="50" y="79" text-anchor="middle" fill="#ffffff"
          font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="25" font-weight="800"
          letter-spacing="-.5">${iniciales}</text>
  </svg>`;
}

/* Emblema de competición: hexágono con los colores de la equipación del
   país y el numeral de la división, para distinguir 1ª de 2ª de un vistazo. */
function emblemaLiga(paisId, division, tam = 40) {
  const pais = PAISES[paisId];
  if (!pais) return "";
  const kit = pais.kit;
  const liga = pais.ligas[division];
  const numeral = division === "primera" ? "I" : "II";
  const uid = `lig-${contadorId++}`;
  const silueta = "M50 4 L88 25 V71 L50 92 L12 71 V25Z";

  return `
  <svg class="emblema-liga" viewBox="0 0 100 96" width="${tam}" height="${Math.round(tam * 0.96)}" role="img" aria-label="${liga.nombre}">
    <defs>
      <clipPath id="${uid}-c"><path d="${silueta}"/></clipPath>
      <linearGradient id="${uid}-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${kit.base}"/>
        <stop offset="100%" stop-color="${kit.detalle}"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#${uid}-c)">
      <rect x="0" y="0" width="100" height="96" fill="url(#${uid}-g)"/>
      <path d="M0 62 L100 30 V96 H0Z" fill="#000000" opacity=".26"/>
      <g stroke="#ffffff" stroke-width="1.5" opacity=".22">
        ${[22, 38, 54, 70].map((y) => `<path d="M6 ${y}H94"/>`).join("")}
        ${[24, 42, 58, 76].map((x) => `<path d="M${x} 6V90"/>`).join("")}
      </g>
    </g>
    <path d="${silueta}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="4"/>
    <text x="50" y="60" text-anchor="middle" fill="${kit.texto}"
          font-family="Inter, Segoe UI, system-ui, sans-serif" font-size="38" font-weight="800"
          letter-spacing="-1">${numeral}</text>
  </svg>`;
}

/* Trofeos y medallas para el palmarés. Se dibujan de verdad (copa con asas,
   medalla con cinta) en vez de usar un emoji, que es lo que hacía que la
   vitrina pareciera un listado sin más. */
const METALES = {
  oro:     { alto: "#ffe9a8", medio: "#ffc53d", bajo: "#c8860d", cinta: "#ff6b1a" },
  plata:   { alto: "#f4f8fc", medio: "#c8d4e0", bajo: "#7e8c9c", cinta: "#4f7cff" },
  bronce:  { alto: "#f0c9a0", medio: "#cd7f32", bajo: "#8a4f1d", cinta: "#22d3ee" },
};

function copaSvg(metal, tam) {
  const m = METALES[metal] || METALES.oro;
  const uid = `cop-${contadorId++}`;
  return `
  <svg class="trofeo" viewBox="0 0 100 110" width="${tam}" height="${Math.round(tam * 1.1)}" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}-m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${m.alto}"/>
        <stop offset="45%" stop-color="${m.medio}"/>
        <stop offset="100%" stop-color="${m.bajo}"/>
      </linearGradient>
    </defs>
    <path d="M26 12h48v28a24 24 0 0 1-48 0z" fill="url(#${uid}-m)"/>
    <path d="M26 12h48v7H26z" fill="${m.alto}" opacity=".75"/>
    <path d="M24 18H10v10a20 20 0 0 0 17 19.7v-9.4A10.6 10.6 0 0 1 21 28z" fill="url(#${uid}-m)"/>
    <path d="M76 18h14v10a20 20 0 0 1-17 19.7v-9.4A10.6 10.6 0 0 0 79 28z" fill="url(#${uid}-m)"/>
    <path d="M44 62h12v14H44z" fill="url(#${uid}-m)"/>
    <path d="M28 78h44a4 4 0 0 1 4 4v6H24v-6a4 4 0 0 1 4-4z" fill="url(#${uid}-m)"/>
    <rect x="18" y="90" width="64" height="10" rx="4" fill="${m.bajo}"/>
    <path d="M38 22h6l-3 14 5-2-8 16 3-13-5 2z" fill="#ffffff" opacity=".5"/>
  </svg>`;
}

function medallaSvg(metal, tam) {
  const m = METALES[metal] || METALES.oro;
  const uid = `med-${contadorId++}`;
  return `
  <svg class="trofeo" viewBox="0 0 100 110" width="${tam}" height="${Math.round(tam * 1.1)}" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="${uid}-m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${m.alto}"/>
        <stop offset="45%" stop-color="${m.medio}"/>
        <stop offset="100%" stop-color="${m.bajo}"/>
      </linearGradient>
    </defs>
    <path d="M28 4 46 46 32 54 14 14z" fill="${m.cinta}"/>
    <path d="M72 4 54 46 68 54 86 14z" fill="${m.cinta}" opacity=".72"/>
    <circle cx="50" cy="72" r="30" fill="url(#${uid}-m)"/>
    <circle cx="50" cy="72" r="23" fill="none" stroke="${m.bajo}" stroke-width="2.4" opacity=".55"/>
    <path d="m50 56 4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.4L50 79.6 40.7 84.6l1.9-10.4L35 67l10.4-1.4z" fill="#ffffff" opacity=".85"/>
  </svg>`;
}

/* Devuelve el gráfico adecuado según el texto del resultado o del título. */
function trofeoSvg(tipo, tam = 46) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("oro")) return medallaSvg("oro", tam);
  if (t.includes("plata")) return medallaSvg("plata", tam);
  if (t.includes("bronce")) return medallaSvg("bronce", tam);
  if (t.includes("copa")) return copaSvg("plata", tam);
  if (t.includes("liga")) return copaSvg("oro", tam);
  return copaSvg("bronce", tam);
}

/* Icono de interfaz (usa los <symbol> definidos en index.html). */
function ico(nombre, clase = "") {
  return `<svg class="ico ${clase}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;
}

export { escudoClub, emblemaLiga, trofeoSvg, ico, inicialesClub };

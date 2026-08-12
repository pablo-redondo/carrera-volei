import { calcularOverall } from "./engine.js";

/* Sistema de logros: persiste en su propia clave de localStorage, separada
   de la partida, para que sobreviva a "Nueva carrera" y sea un progreso de
   toda la cuenta (como en un juego de verdad) en vez de reiniciarse cada vez. */
const CLAVE_LOGROS = "carreraVoley_logros";

/* Cada logro define su condición sobre el jugador actual y, cuando aplica,
   sobre el contexto del momento en el que se comprueba (ctx.resultado tras
   simular la temporada, ctx.legado al retirarse...). La mayoría se basan en
   datos acumulados en el propio jugador, así que se cumplen en cuanto se
   comprueban, sea cual sea la pantalla. */
const LOGROS = [
  // ---- Carrera ----
  { id: "debut", categoria: "Carrera", icono: "🏐", nombre: "Debut profesional",
    descripcion: "Firma tu primer contrato y empieza tu carrera.",
    condicion: (j) => Boolean(j) },
  { id: "ascenso", categoria: "Carrera", icono: "⬆️", nombre: "Rumbo a la cima",
    descripcion: "Consigue el ascenso a la 1ª división con tu club.",
    condicion: (j, ctx) => Boolean(ctx?.resultado?.ascensoDivision) },
  { id: "extranjero", categoria: "Carrera", icono: "🌍", nombre: "Aventura en el extranjero",
    descripcion: "Ficha por un club de un país distinto al tuyo.",
    condicion: (j) => j.historialClubes.some((c) => c.paisId !== j.paisId) },
  { id: "veterano_edad", categoria: "Carrera", icono: "🕰️", nombre: "Viejo/a roble",
    descripcion: "Sigue compitiendo a los 35 años.",
    condicion: (j) => j.edad >= 35 },
  { id: "carrera_completa", categoria: "Carrera", icono: "🏁", nombre: "Carrera completa",
    descripcion: "Llega hasta el final de tu carrera y cuelga las zapatillas.",
    condicion: (j) => Boolean(j.retirado) },
  { id: "titular_indiscutible", categoria: "Carrera", icono: "📋", nombre: "Titular indiscutible",
    descripcion: "Suma 10 temporadas como titular habitual.",
    condicion: (j) => j.estadisticasCarrera.temporadasComoTitular >= 10 },

  // ---- Títulos ----
  { id: "primer_titulo", categoria: "Títulos", icono: "🏆", nombre: "Primer título",
    descripcion: "Levanta tu primer título con el club.",
    condicion: (j) => j.titulos.length >= 1 },
  { id: "copa", categoria: "Títulos", icono: "🥇", nombre: "También la copa",
    descripcion: "Gana una copa nacional.",
    condicion: (j) => j.titulos.some((t) => t.tipo === "Copa") },
  { id: "bicampeon", categoria: "Títulos", icono: "🏆", nombre: "Bicampeón/a",
    descripcion: "Gana la liga en dos temporadas distintas.",
    condicion: (j) => j.titulos.filter((t) => t.tipo === "Liga").length >= 2 },
  { id: "dinastia", categoria: "Títulos", icono: "👑", nombre: "Dinastía",
    descripcion: "Acumula 5 títulos a lo largo de tu carrera.",
    condicion: (j) => j.titulos.length >= 5 },

  // ---- Selección nacional ----
  { id: "convocado", categoria: "Selección nacional", icono: "🌐", nombre: "La absoluta",
    descripcion: "Recibe tu primera convocatoria con la selección.",
    condicion: (j) => j.convocatoriasSeleccion >= 1 },
  { id: "veterano_seleccion", categoria: "Selección nacional", icono: "🎖️", nombre: "Fijo en la absoluta",
    descripcion: "Suma 8 convocatorias con tu selección.",
    condicion: (j) => j.convocatoriasSeleccion >= 8 },
  { id: "bronce", categoria: "Selección nacional", icono: "🥉", nombre: "Al pódium",
    descripcion: "Consigue una medalla de bronce con tu selección.",
    condicion: (j) => j.torneosInternacionales.some((t) => t.resultado.includes("bronce")) },
  { id: "plata", categoria: "Selección nacional", icono: "🥈", nombre: "Subcampeón/a del mundo",
    descripcion: "Consigue una medalla de plata con tu selección.",
    condicion: (j) => j.torneosInternacionales.some((t) => t.resultado.includes("plata")) },
  { id: "oro", categoria: "Selección nacional", icono: "🥇", nombre: "Campeón/a absoluto/a",
    descripcion: "Consigue el oro con tu selección nacional.",
    condicion: (j) => j.torneosInternacionales.some((t) => t.resultado.includes("oro")) },

  // ---- Rendimiento ----
  { id: "estrella_emergente", categoria: "Rendimiento", icono: "⭐", nombre: "Estrella emergente",
    descripcion: "Alcanza una valoración global de 80.",
    condicion: (j) => calcularOverall(j) >= 80 },
  { id: "superestrella", categoria: "Rendimiento", icono: "🌟", nombre: "Superestrella",
    descripcion: "Alcanza una valoración global de 90.",
    condicion: (j) => calcularOverall(j) >= 90 },
  { id: "elite_mundial", categoria: "Rendimiento", icono: "💫", nombre: "Élite mundial",
    descripcion: "Alcanza una valoración global de 95.",
    condicion: (j) => calcularOverall(j) >= 95 },
  { id: "capitan", categoria: "Rendimiento", icono: "🧭", nombre: "Líder nato",
    descripcion: "Alcanza 90 de liderazgo.",
    condicion: (j) => j.atributos.liderazgo >= 90 },
  { id: "muro", categoria: "Rendimiento", icono: "🧱", nombre: "Muro infranqueable",
    descripcion: "Alcanza 90 de bloqueo.",
    condicion: (j) => j.atributos.bloqueo >= 90 },
  { id: "maquina_puntos", categoria: "Rendimiento", icono: "🔥", nombre: "Máquina de puntos",
    descripcion: "Supera los 3.000 puntos en tu carrera.",
    condicion: (j) => j.estadisticasCarrera.puntosTotales >= 3000 },
  { id: "ace_master", categoria: "Rendimiento", icono: "🎯", nombre: "Especialista del saque",
    descripcion: "Consigue 300 aces en tu carrera.",
    condicion: (j) => j.estadisticasCarrera.acesTotales >= 300 },
  { id: "muralla_bloqueos", categoria: "Rendimiento", icono: "🛡️", nombre: "Pared en la red",
    descripcion: "Consigue 300 bloqueos en tu carrera.",
    condicion: (j) => j.estadisticasCarrera.bloqueosTotales >= 300 },
  { id: "libero_elite", categoria: "Rendimiento", icono: "🙌", nombre: "Muralla defensiva",
    descripcion: "Consigue 1.500 defensas en tu carrera.",
    condicion: (j) => j.estadisticasCarrera.defensasTotales >= 1500 },

  // ---- Economía ----
  { id: "rico", categoria: "Economía", icono: "💰", nombre: "Bien pagado/a",
    descripcion: "Acumula 300.000 € en ahorros.",
    condicion: (j) => j.dinero >= 300000 },
  { id: "millonario", categoria: "Economía", icono: "💎", nombre: "Millonario/a del vóley",
    descripcion: "Acumula 1.000.000 € en ahorros.",
    condicion: (j) => j.dinero >= 1000000 },

  // ---- Legado ----
  { id: "profesional", categoria: "Legado", icono: "🏐", nombre: "Profesional consagrado/a",
    descripcion: "Termina tu carrera como Profesional Consagrado/a.",
    condicion: (j, ctx) => ctx?.legado?.titulo === "Profesional Consagrado/a" },
  { id: "idolo", categoria: "Legado", icono: "⭐", nombre: "Ídolo de la afición",
    descripcion: "Termina tu carrera como Ídolo de la Afición.",
    condicion: (j, ctx) => ctx?.legado?.titulo === "Ídolo de la Afición" },
  { id: "leyenda", categoria: "Legado", icono: "👑", nombre: "Leyenda del vóley",
    descripcion: "Termina tu carrera como Leyenda del Voleibol.",
    condicion: (j, ctx) => ctx?.legado?.titulo === "Leyenda del Voleibol" },
];

function cargarDesbloqueados() {
  try {
    const raw = localStorage.getItem(CLAVE_LOGROS);
    if (!raw) return {};
    const datos = JSON.parse(raw);
    return (datos && typeof datos === "object") ? datos : {};
  } catch (e) { return {}; }
}

function guardarDesbloqueados(mapa) {
  try { localStorage.setItem(CLAVE_LOGROS, JSON.stringify(mapa)); } catch (e) { /* almacenamiento no disponible */ }
}

/* Comprueba todos los logros aún no conseguidos contra el jugador (y el
   contexto del momento). Devuelve solo los que se acaban de desbloquear,
   para poder avisar de ellos, y deja guardado el nuevo estado. */
function comprobarLogros(jugador, ctx = {}) {
  if (!jugador) return [];
  const desbloqueados = cargarDesbloqueados();
  const nuevos = [];
  for (const logro of LOGROS) {
    if (desbloqueados[logro.id]) continue;
    let cumple = false;
    try { cumple = Boolean(logro.condicion(jugador, ctx)); } catch (e) { cumple = false; }
    if (cumple) {
      desbloqueados[logro.id] = { edad: jugador.edad, fecha: Date.now() };
      nuevos.push(logro);
    }
  }
  if (nuevos.length) guardarDesbloqueados(desbloqueados);
  return nuevos;
}

export { LOGROS, cargarDesbloqueados, comprobarLogros };

import {
  ATRIBUTOS, POSICIONES, PAISES,
  EVENTOS_PRETEMPORADA, EVENTOS_TEMPORADA, TORNEOS,
  FRASES_CAMPEON, FRASES_TEMPORADA_DIFICIL,
} from "./data.js";

const EDAD_INICIAL = 16;
const EDAD_RETIRO_OBLIGATORIO = 38;
const PARTIDOS_LIGA = 26;

/* ---------------- utilidades ---------------- */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function clampAtributo(v) { return clamp(Math.round(v), 1, 99); }

/* ---------------- creación de jugador ---------------- */
function crearJugador({ nombre, paisId, posicionId, reparto }) {
  const perfil = POSICIONES[posicionId];
  const atributos = {};
  for (const a of ATRIBUTOS) {
    atributos[a.id] = clampAtributo(perfil.base[a.id] + (reparto[a.id] || 0));
  }

  const pais = PAISES[paisId];
  const clubesModestos = pais.clubes.filter((c) => c.prestigio <= 5);
  const clubInicial = pick(clubesModestos.length ? clubesModestos : pais.clubes);

  return {
    nombre: nombre || "Jugador/a",
    paisId,
    posicionId,
    edad: EDAD_INICIAL,
    atributos,
    moral: 70,
    dinero: 0,
    reputacion: 10,
    club: { nombre: clubInicial.nombre, paisId, prestigio: clubInicial.prestigio },
    historialClubes: [{ club: clubInicial.nombre, paisId, desdeEdad: EDAD_INICIAL }],
    titulos: [],
    convocatoriasSeleccion: 0,
    torneosInternacionales: [],
    riesgoLesionBase: 5,
    estadisticasCarrera: {
      puntosTotales: 0, partidosTotales: 0, acesTotales: 0, bloqueosTotales: 0,
      defensasTotales: 0, mejorTemporadaPuntos: 0, temporadasComoTitular: 0,
    },
    historialTemporadas: [],
    retirado: false,
  };
}

function calcularOverall(jugador) {
  const pesos = POSICIONES[jugador.posicionId].pesos;
  let total = 0;
  for (const a of ATRIBUTOS) total += jugador.atributos[a.id] * (pesos[a.id] || 0);
  return Math.round(total);
}

/* ---------------- curva de crecimiento por edad ---------------- */
function rangoCrecimiento(edad) {
  if (edad <= 19) return { entrenado: [3, 6], secundario: [0, 2] };
  if (edad <= 23) return { entrenado: [2, 4], secundario: [0, 1] };
  if (edad <= 27) return { entrenado: [1, 3], secundario: [-1, 1] };
  if (edad <= 30) return { entrenado: [0, 2], secundario: [-1, 1] };
  if (edad <= 33) return { entrenado: [-1, 1], secundario: [-2, 0] };
  if (edad <= 36) return { entrenado: [-2, 0], secundario: [-3, -1] };
  return { entrenado: [-4, -1], secundario: [-4, -2] };
}

function aplicarEntrenamiento(jugador, focoId) {
  const rango = rangoCrecimiento(jugador.edad);
  const cambios = {};

  if (focoId === "descanso") {
    cambios.fisico = randInt(1, 3);
    jugador.moral = clamp(jugador.moral + 3, 0, 100);
  } else {
    cambios[focoId] = randInt(rango.entrenado[0], rango.entrenado[1]);
    const otros = ATRIBUTOS.map((a) => a.id).filter((id) => id !== focoId && POSICIONES[jugador.posicionId].pesos[id] > 0);
    for (let i = 0; i < 2 && otros.length; i++) {
      const idx = randInt(0, otros.length - 1);
      const id = otros.splice(idx, 1)[0];
      cambios[id] = (cambios[id] || 0) + randInt(rango.secundario[0], rango.secundario[1]);
    }
  }

  for (const [id, delta] of Object.entries(cambios)) {
    jugador.atributos[id] = clampAtributo(jugador.atributos[id] + delta);
  }
  return cambios;
}

/* ---------------- eventos aleatorios ---------------- */
function generarEvento(pool) { return pick(pool); }

function aplicarEfectoEvento(jugador, efecto) {
  const resumen = [];
  for (const [clave, valor] of Object.entries(efecto)) {
    if (clave === "moral") {
      jugador.moral = clamp(jugador.moral + valor, 0, 100);
    } else if (clave === "dinero") {
      jugador.dinero += valor;
    } else if (clave === "riesgoLesion") {
      jugador.riesgoLesionBase += valor;
    } else if (ATRIBUTOS.some((a) => a.id === clave)) {
      jugador.atributos[clave] = clampAtributo(jugador.atributos[clave] + valor);
    }
    resumen.push({ clave, valor });
  }
  return resumen;
}

/* ---------------- simulación de temporada ---------------- */
function simularTemporada(jugador) {
  const overall = calcularOverall(jugador);
  const pais = PAISES[jugador.club.paisId];
  const clubesLiga = pais.clubes;
  const nClubes = clubesLiga.length;

  const fuerzaEquipo = clamp(overall * 0.5 + pais.nivelLiga * 3 + jugador.club.prestigio * 2.5 + randInt(-6, 6), 5, 99);
  const promedioLiga = 20 + pais.nivelLiga * 6.5;
  const diferencia = fuerzaEquipo - promedioLiga;

  let posicion = clamp(Math.round((nClubes + 1) / 2 - diferencia / 9 + randInt(-1, 1)), 1, nClubes);

  const esCampeon = posicion === 1 && Math.random() < 0.5;
  const copa = posicion <= 3 && Math.random() < 0.12;
  const temporadaDificil = posicion >= nClubes - 1 && Math.random() < 0.5;

  // Riesgo de lesión
  const riesgoLesion = clamp(
    jugador.riesgoLesionBase + Math.max(0, jugador.edad - 30) * 2 - Math.floor(jugador.atributos.fisico / 15),
    2, 45
  );
  const lesionado = Math.random() * 100 < riesgoLesion;

  // Minutos / rol
  const experiencia = clamp((jugador.edad - 16) / 6, 0, 1);
  let minutosFactor = clamp(0.25 + (overall / 100) * 0.55 + experiencia * 0.25 + randInt(-8, 8) / 100, 0.15, 1);
  if (lesionado) minutosFactor *= randInt(30, 70) / 100;
  const titular = minutosFactor >= 0.55;

  const partidosJugados = Math.round(PARTIDOS_LIGA * minutosFactor);

  const esLibero = jugador.posicionId === "libero";
  let stats;
  if (esLibero) {
    const recepcionPct = clamp(38 + jugador.atributos.recepcion * 0.5 + randInt(-5, 5), 20, 96);
    const defensasTotales = Math.round(partidosJugados * (jugador.atributos.defensa / 100) * randInt(18, 24) / 10);
    stats = { puntosTotales: 0, acesTotales: 0, bloqueosTotales: 0, recepcionPct, defensasTotales };
  } else {
    const puntosPorPartido = ((jugador.atributos.ataque * 0.6 + jugador.atributos.saque * 0.25 + jugador.atributos.bloqueo * 0.15) / 10) * (randInt(85, 115) / 100);
    const puntosTotales = Math.round(partidosJugados * puntosPorPartido);
    const acesTotales = Math.round(partidosJugados * (jugador.atributos.saque / 100) * randInt(10, 20) / 10);
    const bloqueosTotales = Math.round(partidosJugados * (jugador.atributos.bloqueo / 100) * randInt(8, 16) / 10);
    stats = { puntosTotales, acesTotales, bloqueosTotales, recepcionPct: null, defensasTotales: 0 };
  }

  const resultado = {
    overall, fuerzaEquipo, posicion, nClubes, esCampeon, copa, temporadaDificil,
    lesionado, titular, partidosJugados, stats,
    fraseFinal: esCampeon ? pick(FRASES_CAMPEON) : (temporadaDificil ? pick(FRASES_TEMPORADA_DIFICIL) : null),
  };

  return resultado;
}

function aplicarResultadoTemporada(jugador, resultado) {
  const e = jugador.estadisticasCarrera;
  e.puntosTotales += resultado.stats.puntosTotales;
  e.partidosTotales += resultado.partidosJugados;
  e.acesTotales += resultado.stats.acesTotales;
  e.bloqueosTotales += resultado.stats.bloqueosTotales;
  e.defensasTotales += resultado.stats.defensasTotales;
  e.mejorTemporadaPuntos = Math.max(e.mejorTemporadaPuntos, resultado.stats.puntosTotales);
  if (resultado.titular) e.temporadasComoTitular++;

  const pais = PAISES[jugador.club.paisId];
  if (resultado.esCampeon) jugador.titulos.push({ tipo: "Liga", liga: pais.liga, edad: jugador.edad, club: jugador.club.nombre, pais: pais.nombre });
  if (resultado.copa) jugador.titulos.push({ tipo: "Copa", liga: pais.liga, edad: jugador.edad, club: jugador.club.nombre, pais: pais.nombre });

  jugador.reputacion = clamp(jugador.reputacion + (resultado.esCampeon ? 8 : 0) + (resultado.titular ? 3 : -1) - (resultado.temporadaDificil ? 3 : 0), 0, 100);
  jugador.moral = clamp(jugador.moral + (resultado.esCampeon ? 10 : 0) - (resultado.temporadaDificil ? 6 : 0) - (resultado.lesionado ? 8 : 0), 0, 100);

  jugador.historialTemporadas.push({
    edad: jugador.edad,
    club: jugador.club.nombre,
    pais: pais.nombre,
    liga: pais.liga,
    posicion: resultado.posicion,
    nClubes: resultado.nClubes,
    overall: resultado.overall,
    ...resultado.stats,
    partidosJugados: resultado.partidosJugados,
    titulos: resultado.esCampeon ? ["Liga"] : (resultado.copa ? ["Copa"] : []),
  });
}

/* ---------------- selección nacional ---------------- */
function comprobarSeleccionNacional(jugador) {
  const overall = calcularOverall(jugador);
  const umbral = jugador.posicionId === "libero" ? 62 : 68;
  if (overall < umbral || jugador.edad < 18 || jugador.edad > 34) return null;

  const probabilidad = clamp((overall - umbral) * 2 + jugador.reputacion / 4, 0, 55);
  if (Math.random() * 100 > probabilidad) return null;

  jugador.convocatoriasSeleccion++;
  jugador.reputacion = clamp(jugador.reputacion + 4, 0, 100);

  const esGranTorneo = Math.random() < 0.4;
  let torneoResultado = null;
  if (esGranTorneo) {
    const torneo = pick(TORNEOS);
    const rendimiento = overall + randInt(-15, 15);
    let resultadoTexto;
    if (rendimiento >= 88) resultadoTexto = "🥇 Medalla de oro";
    else if (rendimiento >= 78) resultadoTexto = "🥈 Medalla de plata";
    else if (rendimiento >= 70) resultadoTexto = "🥉 Medalla de bronce";
    else if (rendimiento >= 55) resultadoTexto = "Semifinales";
    else resultadoTexto = "Fase de grupos";
    torneoResultado = { torneo, resultado: resultadoTexto, edad: jugador.edad };
    jugador.torneosInternacionales.push(torneoResultado);
    if (resultadoTexto.includes("edalla")) {
      jugador.reputacion = clamp(jugador.reputacion + 10, 0, 100);
    }
  }

  return { convocado: true, torneoResultado };
}

/* ---------------- ofertas de fichaje ---------------- */
function generarOfertas(jugador, resultadoTemporada) {
  const overall = resultadoTemporada.overall;
  const paisActual = PAISES[jugador.club.paisId];
  const ofertas = [];

  // Renovación con el club actual
  ofertas.push({
    club: jugador.club.nombre,
    paisId: jugador.club.paisId,
    prestigio: jugador.club.prestigio,
    salario: Math.round(jugador.club.prestigio * 1400 + overall * 90 + randInt(-300, 300)),
    esActual: true,
  });

  // Ofertas nacionales: clubes del mismo país, preferentemente de prestigio similar o superior si rindes bien
  const candidatosNacionales = paisActual.clubes.filter((c) => c.nombre !== jugador.club.nombre);
  const nOfertasNacionales = randInt(1, 2);
  for (let i = 0; i < nOfertasNacionales && candidatosNacionales.length; i++) {
    const club = pick(candidatosNacionales);
    if (ofertas.some((o) => o.club === club.nombre)) continue;
    ofertas.push({
      club: club.nombre,
      paisId: jugador.club.paisId,
      prestigio: club.prestigio,
      salario: Math.round(club.prestigio * 1400 + overall * 90 + randInt(-300, 500)),
      esActual: false,
    });
  }

  // Oferta internacional: solo si el rendimiento y la reputación lo justifican
  const probInternacional = clamp((overall - 65) * 2 + jugador.reputacion / 3, 0, 60);
  if (Math.random() * 100 < probInternacional) {
    const otrosPaisesIds = Object.keys(PAISES).filter((id) => id !== jugador.club.paisId);
    const paisDestinoId = pick(otrosPaisesIds);
    const paisDestino = PAISES[paisDestinoId];
    const club = pick(paisDestino.clubes);
    ofertas.push({
      club: club.nombre,
      paisId: paisDestinoId,
      prestigio: club.prestigio,
      salario: Math.round(club.prestigio * 1600 + paisDestino.nivelLiga * 300 + overall * 110 + randInt(0, 800)),
      esActual: false,
      internacional: true,
    });
  }

  return ofertas;
}

function ficharPorClub(jugador, oferta) {
  if (!oferta.esActual) {
    jugador.club = { nombre: oferta.club, paisId: oferta.paisId, prestigio: oferta.prestigio };
    jugador.historialClubes.push({ club: oferta.club, paisId: oferta.paisId, desdeEdad: jugador.edad + 1 });
  }
}

/* ---------------- legado / retiro ---------------- */
function calcularLegado(jugador) {
  const mejorOverall = jugador.historialTemporadas.reduce((m, t) => Math.max(m, t.overall), 0);
  const nTitulosLiga = jugador.titulos.filter((t) => t.tipo === "Liga").length;
  const nMedallas = jugador.torneosInternacionales.filter((t) => t.resultado.includes("edalla")).length;

  let puntuacion = mejorOverall + nTitulosLiga * 12 + nMedallas * 15 + jugador.convocatoriasSeleccion * 2;

  if (puntuacion >= 130) return { titulo: "Leyenda del Voleibol", descripcion: "Tu nombre quedará escrito en la historia de este deporte." };
  if (puntuacion >= 100) return { titulo: "Ídolo de la Afición", descripcion: "Una carrera brillante que se recordará durante años." };
  if (puntuacion >= 75) return { titulo: "Profesional Consagrado/a", descripcion: "Una trayectoria sólida y respetada en el mundo del vóley." };
  if (puntuacion >= 45) return { titulo: "Jugador/a de Club", descripcion: "Diste todo por tus colores partido tras partido." };
  return { titulo: "Carrera Discreta", descripcion: "El vóley profesional no fue sencillo, pero disfrutaste del camino." };
}

export {
  EDAD_INICIAL, EDAD_RETIRO_OBLIGATORIO,
  crearJugador, calcularOverall, aplicarEntrenamiento,
  generarEvento, aplicarEfectoEvento,
  simularTemporada, aplicarResultadoTemporada,
  comprobarSeleccionNacional, generarOfertas, ficharPorClub,
  calcularLegado, clamp, randInt,
};

import { EVENTOS_PRETEMPORADA, EVENTOS_TEMPORADA, PAISES, POSICIONES } from "./data.js";
import {
  EDAD_RETIRO_OBLIGATORIO, crearJugador, aplicarEntrenamiento,
  generarEvento, resolverOpcion, simularTemporada, aplicarResultadoTemporada,
  comprobarSeleccionNacional, generarOfertas, ficharPorClub, calcularLegado, calcularOverallMedio,
} from "./engine.js";
import {
  renderSidebar, actualizarCabeceraTemporada, renderInicio, renderCreacion,
  renderEntrenamiento, renderEvento, renderResultadoEvento, renderResumenTemporada,
  renderConvocatoria, renderFichajes, renderRetiro,
  inicializarLogrosUI, mostrarLogroToast, renderTrayectoria,
} from "./ui.js";
import { comprobarLogros } from "./logros.js";

const CLAVE_GUARDADO = "carreraVoley";
/* Subir esta versión invalida las partidas guardadas con un formato anterior.
   Sin esto, una partida vieja (con ligas o divisiones que ya no existen) hacía
   que la pantalla reventara al cargarla y el juego se quedaba colgado. */
const VERSION_GUARDADO = 5;

let estado = { jugador: null, temporadaNum: 1 };

/* ---------------- persistencia ---------------- */
function guardar() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ ...estado, version: VERSION_GUARDADO }));
  } catch (e) { /* almacenamiento no disponible */ }
}

/* Comprueba que la partida guardada encaja con los datos actuales del juego. */
function esGuardadoValido(g) {
  if (!g || g.version !== VERSION_GUARDADO || !g.jugador) return false;
  const j = g.jugador;
  const pais = PAISES[j.paisId];
  const paisClub = j.club && PAISES[j.club.paisId];
  return Boolean(
    pais && paisClub &&
    POSICIONES[j.posicionId] &&
    paisClub.ligas[j.club.division] &&
    j.atributos && Array.isArray(j.historialTemporadas) && Array.isArray(j.historialClubes)
  );
}

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE_GUARDADO);
    if (!raw) return null;
    const guardado = JSON.parse(raw);
    if (!esGuardadoValido(guardado)) { borrarGuardado(); return null; }
    return guardado;
  } catch (e) { return null; }
}
function borrarGuardado() {
  try { localStorage.removeItem(CLAVE_GUARDADO); } catch (e) { /* ignorar */ }
}

/* ---------------- refresco de UI persistente ---------------- */
function refrescarCabecera(opts) {
  renderSidebar(estado.jugador, opts);
  renderTrayectoria(estado.jugador);
  actualizarCabeceraTemporada(estado.jugador, estado.temporadaNum);
}

/* ---------------- logros ---------------- */
/* Comprueba los logros contra el jugador actual y avisa (con un pequeño
   desfase entre ellos) de los que se acaban de desbloquear. Se llama tras
   cualquier mutación relevante del jugador; los ya conseguidos se ignoran. */
function comprobarYNotificarLogros(ctx) {
  if (!estado.jugador) return;
  const nuevos = comprobarLogros(estado.jugador, ctx);
  nuevos.forEach((logro, i) => setTimeout(() => mostrarLogroToast(logro), i * 350));
}

/* ---------------- flujo del juego ---------------- */
function pantallaInicio() {
  estado = { jugador: null, temporadaNum: 1 };
  refrescarCabecera();
  renderInicio({ hayGuardado: !!cargar() }, {
    onNueva: pantallaCreacion,
    onContinuar: () => {
      const guardado = cargar();
      if (guardado && guardado.jugador) {
        estado = guardado;
        if (estado.jugador.retirado) { pantallaRetiro(); } else { pantallaEntrenamiento(); }
      } else {
        pantallaCreacion();
      }
    },
  });
}

function pantallaCreacion() {
  refrescarCabecera();
  renderCreacion({
    onCrear: (datos) => {
      estado.jugador = crearJugador(datos);
      estado.temporadaNum = 1;
      guardar();
      comprobarYNotificarLogros({});
      pantallaEntrenamiento();
    },
  });
}

function pantallaEntrenamiento() {
  refrescarCabecera();
  renderEntrenamiento(estado.jugador, {
    onElegir: (focoId) => {
      aplicarEntrenamiento(estado.jugador, focoId);
      refrescarCabecera();
      pantallaEventoPretemporada();
    },
  });
}

function pantallaEventoPretemporada() {
  const evento = generarEvento(EVENTOS_PRETEMPORADA);
  renderEvento(estado.jugador, evento, "Pretemporada", {
    onElegir: (opcion) => {
      const resultado = resolverOpcion(estado.jugador, opcion);
      refrescarCabecera();
      renderResultadoEvento(resultado, {
        onContinuar: () => {
          if (Math.random() < 0.5) pantallaEventoTemporada();
          else pantallaSimularTemporada();
        },
      });
    },
  });
}

function pantallaEventoTemporada() {
  const evento = generarEvento(EVENTOS_TEMPORADA);
  renderEvento(estado.jugador, evento, "Mitad de temporada", {
    onElegir: (opcion) => {
      const resultado = resolverOpcion(estado.jugador, opcion);
      refrescarCabecera();
      renderResultadoEvento(resultado, { onContinuar: pantallaSimularTemporada });
    },
  });
}

function pantallaSimularTemporada() {
  const resultado = simularTemporada(estado.jugador);
  resultado.finanzas = aplicarResultadoTemporada(estado.jugador, resultado);
  refrescarCabecera();
  guardar();
  comprobarYNotificarLogros({ resultado });
  renderResumenTemporada(estado.jugador, resultado, {
    onContinuar: () => pantallaComprobarSeleccion(),
  });
}

function pantallaComprobarSeleccion() {
  const info = comprobarSeleccionNacional(estado.jugador);
  refrescarCabecera();
  comprobarYNotificarLogros({ convocatoria: info });
  if (info && info.convocado) {
    guardar();
    renderConvocatoria(estado.jugador, info, { onContinuar: pantallaSiguientePaso });
  } else {
    pantallaSiguientePaso();
  }
}

function pantallaSiguientePaso() {
  if (estado.jugador.edad >= EDAD_RETIRO_OBLIGATORIO) {
    pantallaRetirar();
    return;
  }
  pantallaFichajes();
}

function pantallaFichajes() {
  const ultimaTemporada = estado.jugador.historialTemporadas[estado.jugador.historialTemporadas.length - 1];
  const ofertas = generarOfertas(estado.jugador, { overall: ultimaTemporada.overall });
  const permiteRetiro = estado.jugador.edad >= 30;

  renderFichajes(estado.jugador, ofertas, permiteRetiro, {
    onElegir: (oferta) => {
      ficharPorClub(estado.jugador, oferta);
      comprobarYNotificarLogros({});
      avanzarTemporada();
    },
    onRetiro: () => pantallaRetirar(),
  });
}

function avanzarTemporada() {
  estado.jugador.edad += 1;
  estado.temporadaNum += 1;
  guardar();
  pantallaEntrenamiento();
}

function pantallaRetirar() {
  estado.jugador.retirado = true;
  guardar();
  pantallaRetiro();
}

function pantallaRetiro() {
  // En la ficha lateral, la carrera terminada muestra la valoración MEDIA
  // de toda la trayectoria en vez de la de la última temporada jugada.
  refrescarCabecera({ overallOverride: calcularOverallMedio(estado.jugador), etiquetaOverall: "MEDIA" });
  const legado = calcularLegado(estado.jugador);
  comprobarYNotificarLogros({ legado });
  renderRetiro(estado.jugador, legado, {
    onNuevaCarrera: () => {
      borrarGuardado();
      pantallaInicio();
    },
  });
}

/* ---------------- arranque ---------------- */
inicializarLogrosUI();
pantallaInicio();

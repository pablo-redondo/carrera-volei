import { EVENTOS_PRETEMPORADA, EVENTOS_TEMPORADA } from "./data.js";
import {
  EDAD_RETIRO_OBLIGATORIO, crearJugador, aplicarEntrenamiento,
  generarEvento, resolverOpcion, simularTemporada, aplicarResultadoTemporada,
  comprobarSeleccionNacional, generarOfertas, ficharPorClub, calcularLegado, calcularOverallMedio,
} from "./engine.js";
import {
  renderSidebar, actualizarCabeceraTemporada, renderInicio, renderCreacion,
  renderEntrenamiento, renderEvento, renderResultadoEvento, renderResumenTemporada,
  renderConvocatoria, renderFichajes, renderRetiro,
} from "./ui.js";

const CLAVE_GUARDADO = "carreraVoley";

let estado = { jugador: null, temporadaNum: 1 };

/* ---------------- persistencia ---------------- */
function guardar() {
  try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado)); } catch (e) { /* almacenamiento no disponible */ }
}
function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE_GUARDADO);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function borrarGuardado() {
  try { localStorage.removeItem(CLAVE_GUARDADO); } catch (e) { /* ignorar */ }
}

/* ---------------- refresco de UI persistente ---------------- */
function refrescarCabecera(opts) {
  renderSidebar(estado.jugador, opts);
  actualizarCabeceraTemporada(estado.jugador, estado.temporadaNum);
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
      const texto = resolverOpcion(estado.jugador, opcion);
      refrescarCabecera();
      renderResultadoEvento(texto, {
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
      const texto = resolverOpcion(estado.jugador, opcion);
      refrescarCabecera();
      renderResultadoEvento(texto, { onContinuar: pantallaSimularTemporada });
    },
  });
}

function pantallaSimularTemporada() {
  const resultado = simularTemporada(estado.jugador);
  resultado.finanzas = aplicarResultadoTemporada(estado.jugador, resultado);
  refrescarCabecera();
  guardar();
  renderResumenTemporada(estado.jugador, resultado, {
    onContinuar: () => pantallaComprobarSeleccion(),
  });
}

function pantallaComprobarSeleccion() {
  const info = comprobarSeleccionNacional(estado.jugador);
  refrescarCabecera();
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
  refrescarCabecera({ overallOverride: calcularOverallMedio(estado.jugador), etiquetaOverall: "MEDIA CARRERA" });
  const legado = calcularLegado(estado.jugador);
  renderRetiro(estado.jugador, legado, {
    onNuevaCarrera: () => {
      borrarGuardado();
      pantallaInicio();
    },
  });
}

/* ---------------- arranque ---------------- */
pantallaInicio();

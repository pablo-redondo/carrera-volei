/* ============================================================
   DATOS DEL JUEGO — Simulador de Carrera de Voleibol
   ============================================================ */

const ATRIBUTOS = [
  { id: "ataque",     nombre: "Ataque",     icono: "🔥" },
  { id: "bloqueo",    nombre: "Bloqueo",    icono: "🧱" },
  { id: "saque",      nombre: "Saque",      icono: "🎯" },
  { id: "recepcion",  nombre: "Recepción",  icono: "🙌" },
  { id: "colocacion", nombre: "Colocación", icono: "🧠" },
  { id: "defensa",    nombre: "Defensa",    icono: "🛡️" },
  { id: "fisico",     nombre: "Físico",     icono: "💪" },
  { id: "liderazgo",  nombre: "Liderazgo",  icono: "⭐" },
];

/* Perfiles de posición: valores base al crear el jugador (16 años)
   y peso de cada atributo en el cálculo de la valoración global (overall). */
const POSICIONES = {
  colocador: {
    nombre: "Colocador/a",
    descripcion: "El cerebro del equipo. Reparte el juego y decide quién remata cada balón.",
    base: { ataque: 25, bloqueo: 20, saque: 30, recepcion: 30, colocacion: 45, defensa: 30, fisico: 30, liderazgo: 35 },
    pesos: { ataque: .08, bloqueo: .04, saque: .14, recepcion: .10, colocacion: .34, defensa: .12, fisico: .10, liderazgo: .08 },
  },
  opuesto: {
    nombre: "Opuesto/a",
    descripcion: "El rematador de referencia. Ataca desde la zaga y castiga con el saque.",
    base: { ataque: 40, bloqueo: 30, saque: 35, recepcion: 20, colocacion: 20, defensa: 25, fisico: 35, liderazgo: 25 },
    pesos: { ataque: .34, bloqueo: .14, saque: .18, recepcion: .04, colocacion: .04, defensa: .08, fisico: .12, liderazgo: .06 },
  },
  central: {
    nombre: "Central",
    descripcion: "La muralla en el bloqueo y el arma del ataque rápido por el centro de la red.",
    base: { ataque: 32, bloqueo: 42, saque: 25, recepcion: 18, colocacion: 20, defensa: 25, fisico: 35, liderazgo: 25 },
    pesos: { ataque: .18, bloqueo: .34, saque: .10, recepcion: .03, colocacion: .04, defensa: .09, fisico: .16, liderazgo: .06 },
  },
  receptor: {
    nombre: "Receptor/a-Atacante",
    descripcion: "Completo por naturaleza: ataca, recibe y saca con solvencia en banda.",
    base: { ataque: 35, bloqueo: 25, saque: 30, recepcion: 35, colocacion: 20, defensa: 28, fisico: 32, liderazgo: 25 },
    pesos: { ataque: .28, bloqueo: .09, saque: .14, recepcion: .19, colocacion: .04, defensa: .10, fisico: .10, liderazgo: .06 },
  },
  libero: {
    nombre: "Líbero",
    descripcion: "Especialista defensivo. No remata ni bloquea, pero sin él no se gana ni un set.",
    base: { ataque: 5, bloqueo: 5, saque: 15, recepcion: 42, colocacion: 25, defensa: 44, fisico: 30, liderazgo: 22 },
    pesos: { ataque: 0, bloqueo: 0, saque: .03, recepcion: .34, colocacion: .10, defensa: .34, fisico: .13, liderazgo: .06 },
  },
};

/* Puntos que el usuario puede repartir libremente en la creación del personaje */
const PUNTOS_CREACION = 35;
const TOPE_CREACION = 65;

/* ---------------------------------------------------------------
   Países, ligas y clubes reales.
   nivelLiga (1-10): fuerza relativa de la competición a nivel mundial.
   Cada club tiene un prestigio (1-10) relativo dentro de su propio país.
   --------------------------------------------------------------- */
const PAISES = {
  espana: {
    nombre: "España", gentilicio: "española", liga: "Superliga Masculina de Voleibol", nivelLiga: 5,
    clubes: [
      { nombre: "Unicaja Almería", prestigio: 9 },
      { nombre: "CV Teruel", prestigio: 8 },
      { nombre: "Barça Voleibol", prestigio: 7 },
      { nombre: "Guaguas Las Palmas", prestigio: 6 },
      { nombre: "Ushuaïa Ibiza Voley", prestigio: 6 },
      { nombre: "Río Duero Soria", prestigio: 4 },
      { nombre: "CV Melilla", prestigio: 4 },
      { nombre: "CV Textil Santanderina", prestigio: 3 },
    ],
  },
  polonia: {
    nombre: "Polonia", gentilicio: "polaca", liga: "PlusLiga", nivelLiga: 10,
    clubes: [
      { nombre: "Skra Bełchatów", prestigio: 10 },
      { nombre: "ZAKSA Kędzierzyn-Koźle", prestigio: 9 },
      { nombre: "Jastrzębski Węgiel", prestigio: 8 },
      { nombre: "Asseco Resovia Rzeszów", prestigio: 8 },
      { nombre: "Warta Zawiercie", prestigio: 7 },
      { nombre: "Trefl Gdańsk", prestigio: 6 },
      { nombre: "Projekt Warszawa", prestigio: 6 },
      { nombre: "Indykpol AZS Olsztyn", prestigio: 5 },
    ],
  },
  italia: {
    nombre: "Italia", gentilicio: "italiana", liga: "SuperLega", nivelLiga: 10,
    clubes: [
      { nombre: "Sir Susa Vim Perugia", prestigio: 10 },
      { nombre: "Cucine Lube Civitanova", prestigio: 9 },
      { nombre: "Itas Trentino", prestigio: 9 },
      { nombre: "Valsa Group Modena", prestigio: 8 },
      { nombre: "Allianz Milano", prestigio: 7 },
      { nombre: "Gas Sales Piacenza", prestigio: 6 },
      { nombre: "Vero Volley Monza", prestigio: 6 },
      { nombre: "Rana Verona", prestigio: 5 },
    ],
  },
  brasil: {
    nombre: "Brasil", gentilicio: "brasileña", liga: "Superliga Brasileira Masculina", nivelLiga: 9,
    clubes: [
      { nombre: "Sada Cruzeiro", prestigio: 10 },
      { nombre: "Minas Tênis Clube", prestigio: 9 },
      { nombre: "EC Pinheiros", prestigio: 8 },
      { nombre: "Sesi-SP", prestigio: 7 },
      { nombre: "EMS Taubaté Funvic", prestigio: 6 },
      { nombre: "Suzano Vôlei", prestigio: 6 },
      { nombre: "Vôlei Renata Campinas", prestigio: 5 },
      { nombre: "Fluminense Vôlei", prestigio: 4 },
    ],
  },
  francia: {
    nombre: "Francia", gentilicio: "francesa", liga: "Ligue A", nivelLiga: 7,
    clubes: [
      { nombre: "Tours VB", prestigio: 10 },
      { nombre: "Paris Volley", prestigio: 8 },
      { nombre: "Montpellier UC", prestigio: 8 },
      { nombre: "Chaumont VB 52", prestigio: 7 },
      { nombre: "AS Cannes Volley-Ball", prestigio: 6 },
      { nombre: "Nantes Rezé Métropole Volley", prestigio: 5 },
      { nombre: "Toulouse Spacer's", prestigio: 4 },
      { nombre: "Narbonne Volley", prestigio: 4 },
    ],
  },
  argentina: {
    nombre: "Argentina", gentilicio: "argentina", liga: "Liga Argentina de Voleibol", nivelLiga: 6,
    clubes: [
      { nombre: "UPCN San Juan Vóley", prestigio: 10 },
      { nombre: "Personal Bolívar", prestigio: 9 },
      { nombre: "Ciudad Vóley", prestigio: 7 },
      { nombre: "Boca Juniors Vóley", prestigio: 6 },
      { nombre: "River Plate Vóley", prestigio: 5 },
      { nombre: "Club de Amigos", prestigio: 5 },
      { nombre: "Ferro Carril Oeste", prestigio: 4 },
      { nombre: "Monteros Vóley", prestigio: 4 },
    ],
  },
  japon: {
    nombre: "Japón", gentilicio: "japonesa", liga: "V.League Division 1", nivelLiga: 7,
    clubes: [
      { nombre: "Suntory Sunbirds", prestigio: 10 },
      { nombre: "Panasonic Panthers", prestigio: 9 },
      { nombre: "Wolfdogs Nagoya", prestigio: 8 },
      { nombre: "JT Thunders Hiroshima", prestigio: 7 },
      { nombre: "Toray Arrows", prestigio: 6 },
      { nombre: "Osaka Bluteon", prestigio: 5 },
      { nombre: "Tokyo Great Bears", prestigio: 5 },
      { nombre: "Sagawa Printing", prestigio: 4 },
    ],
  },
  serbia: {
    nombre: "Serbia", gentilicio: "serbia", liga: "Superliga Srbije", nivelLiga: 7,
    clubes: [
      { nombre: "OK Vojvodina", prestigio: 9 },
      { nombre: "OK Crvena Zvezda", prestigio: 9 },
      { nombre: "OK Radnički Kragujevac", prestigio: 8 },
      { nombre: "OK Partizan", prestigio: 7 },
      { nombre: "OK Železničar", prestigio: 5 },
      { nombre: "OK Napredak", prestigio: 4 },
      { nombre: "OK Ub", prestigio: 4 },
      { nombre: "OK Vranjska Banja", prestigio: 3 },
    ],
  },
  turquia: {
    nombre: "Turquía", gentilicio: "turca", liga: "Efeler Ligi", nivelLiga: 8,
    clubes: [
      { nombre: "Ziraat Bankası", prestigio: 9 },
      { nombre: "Halkbank", prestigio: 9 },
      { nombre: "Fenerbahçe", prestigio: 8 },
      { nombre: "Galatasaray", prestigio: 8 },
      { nombre: "Arkas Spor İzmir", prestigio: 6 },
      { nombre: "Türk Telekom", prestigio: 5 },
      { nombre: "Beşiktaş", prestigio: 4 },
      { nombre: "Maliye Piyango", prestigio: 4 },
    ],
  },
  rusia: {
    nombre: "Rusia", gentilicio: "rusa", liga: "Superleague", nivelLiga: 8,
    clubes: [
      { nombre: "Zenit Kazan", prestigio: 10 },
      { nombre: "Dynamo Moscow", prestigio: 9 },
      { nombre: "Zenit Saint Petersburg", prestigio: 8 },
      { nombre: "Belogorie Belgorod", prestigio: 8 },
      { nombre: "Lokomotiv Novosibirsk", prestigio: 6 },
      { nombre: "Fakel Novy Urengoy", prestigio: 6 },
      { nombre: "Dynamo-LO", prestigio: 4 },
      { nombre: "Nova Novokuibyshevsk", prestigio: 4 },
    ],
  },
  iran: {
    nombre: "Irán", gentilicio: "iraní", liga: "Iran Volleyball Super League", nivelLiga: 6,
    clubes: [
      { nombre: "Foolad Sirjan", prestigio: 9 },
      { nombre: "Shahdab Yazd", prestigio: 8 },
      { nombre: "Shahrdari Urmia", prestigio: 8 },
      { nombre: "Sarmayeh Bank Tehran", prestigio: 7 },
      { nombre: "Paykan Tehran", prestigio: 7 },
      { nombre: "Kalleh Mazandaran", prestigio: 5 },
      { nombre: "Barij Essence Kashan", prestigio: 4 },
      { nombre: "Gostaresh Foulad Tabriz", prestigio: 4 },
    ],
  },
  eslovenia: {
    nombre: "Eslovenia", gentilicio: "eslovena", liga: "1. DOL", nivelLiga: 5,
    clubes: [
      { nombre: "ACH Volley Ljubljana", prestigio: 10 },
      { nombre: "Calcit Kamnik", prestigio: 7 },
      { nombre: "Merkur Maribor", prestigio: 5 },
      { nombre: "Fužinar Ravne", prestigio: 4 },
      { nombre: "Triglav Kranj", prestigio: 3 },
      { nombre: "Salonit Anhovo", prestigio: 3 },
    ],
  },
};

/* ---------------- Eventos aleatorios de pretemporada ---------------- */
/* efecto: objeto de cambios aplicado al jugador */
const EVENTOS_PRETEMPORADA = [
  {
    texto: (j) => `El preparador físico te propone un plan de pesas intensivo antes de empezar la pretemporada. Es duro, pero puede marcar la diferencia.`,
    opciones: [
      { texto: "Aceptar el reto", efecto: { fisico: 3, moral: -2 }, resultado: "Terminas la pretemporada agotado/a, pero notablemente más fuerte." },
      { texto: "Seguir el plan estándar", efecto: { fisico: 1 }, resultado: "Cumples con lo justo. Nada que destacar." },
    ],
  },
  {
    texto: (j) => `Una marca deportiva se pone en contacto contigo para patrocinarte la equipación a cambio de aparecer en sus anuncios.`,
    opciones: [
      { texto: "Firmar el patrocinio", efecto: { dinero: 3000, liderazgo: 1 }, resultado: "El dinero extra viene bien, aunque algún compañero comenta que te has vuelto “una estrella”." },
      { texto: "Rechazarlo y centrarte en el juego", efecto: { moral: 2 }, resultado: "Prefieres que hablen tus actuaciones en la cancha." },
    ],
  },
  {
    texto: (j) => `El entrenador reúne al vestuario y pide un capitán o capitana para la temporada. Varios compañeros te miran.`,
    opciones: [
      { texto: "Dar un paso al frente", efecto: { liderazgo: 4, moral: 1 }, resultado: "Te conviertes en un referente del vestuario." },
      { texto: "Declinar el ofrecimiento", efecto: { moral: -1 }, resultado: "Prefieres centrarte solo en tu rendimiento." },
    ],
  },
  {
    texto: (j) => `Un periodista de un medio deportivo local quiere entrevistarte sobre tus objetivos para la temporada.`,
    opciones: [
      { texto: "Hablar con ambición", efecto: { liderazgo: 2, moral: -1 }, resultado: "Tus declaraciones generan expectación... y presión." },
      { texto: "Mantener un perfil bajo", efecto: { moral: 1 }, resultado: "Prefieres que hablen los resultados." },
    ],
  },
  {
    texto: (j) => `Durante un entrenamiento notas una leve molestia física. El fisioterapeuta te recomienda parar unos días.`,
    opciones: [
      { texto: "Parar y cuidarte", efecto: { fisico: 1, moral: -1 }, resultado: "La molestia desaparece sin mayores complicaciones." },
      { texto: "Seguir entrenando al máximo", efecto: { fisico: -3, riesgoLesion: 8 }, resultado: "Sigues adelante, aunque el riesgo de lesión aumenta este año." },
    ],
  },
  {
    texto: (j) => `El club organiza una pretemporada con partidos amistosos frente a rivales de otros países.`,
    opciones: [
      { texto: "Aprovechar para foguearte fuera", efecto: { ataque: 1, bloqueo: 1, saque: 1, moral: 1 }, resultado: "La experiencia internacional te abre la cabeza y mejoras varios aspectos de tu juego." },
      { texto: "Centrarte en la puesta a punto física", efecto: { fisico: 2 }, resultado: "Priorizas llegar en plena forma al inicio de la liga." },
    ],
  },
  {
    texto: (j) => `Se acerca el cierre del mercado de fichajes y tu agente te llama: hay rumores de interés desde el extranjero.`,
    opciones: [
      { texto: "Escuchar la oferta", efecto: { moral: 1 }, resultado: "Aunque sigues en tu club, sientes que estás en el radar de otros equipos del mundo." },
      { texto: "Cortar la conversación", efecto: { liderazgo: 1 }, resultado: "Tu club valora tu compromiso este curso." },
    ],
  },
  {
    texto: (j) => `Un compañero veterano del vestuario se ofrece a darte consejos extra después de los entrenamientos.`,
    opciones: [
      { texto: "Aprovechar su experiencia", efecto: { colocacion: 1, defensa: 1, recepcion: 1 }, resultado: "Aprendes pequeños detalles que marcan la diferencia en pista." },
      { texto: "Preferir entrenar por tu cuenta", efecto: { fisico: 1 }, resultado: "Sigues tu propio método de trabajo." },
    ],
  },
];

/* ---------------- Eventos aleatorios durante la temporada ---------------- */
const EVENTOS_TEMPORADA = [
  {
    texto: (j) => `A mitad de temporada, el vestuario vive un cruce de opiniones sobre el sistema de juego del entrenador.`,
    opciones: [
      { texto: "Respaldar al entrenador en público", efecto: { liderazgo: 2 }, resultado: "El cuerpo técnico valora tu apoyo." },
      { texto: "Mantenerte al margen", efecto: {}, resultado: "Prefieres no meterte en líos internos." },
    ],
  },
  {
    texto: (j) => `Tienes la oportunidad de dar una charla motivacional en un colegio sobre tu experiencia como deportista.`,
    opciones: [
      { texto: "Aceptar la charla", efecto: { liderazgo: 2, moral: 1 }, resultado: "Disfrutas conectando con jóvenes aficionados/as al vóley." },
      { texto: "Declinar por falta de tiempo", efecto: { fisico: 1 }, resultado: "Prefieres centrar tu energía en los entrenamientos." },
    ],
  },
  {
    texto: (j) => `Una lesión de un compañero titular te da la oportunidad de ganar más minutos en pista.`,
    opciones: [
      { texto: "Dar un paso al frente", efecto: { moral: 2 }, resultado: "Aprovechas la ocasión para ganarte la confianza del cuerpo técnico." },
      { texto: "Ir con cautela", efecto: { fisico: 1 }, resultado: "Prefieres coger ritmo sin forzar." },
    ],
  },
];

/* ---------------- Torneos internacionales ---------------- */
const TORNEOS = ["Campeonato de Europa", "Copa del Mundo", "Juegos Olímpicos", "Liga de Naciones"];

/* ---------------- Frases de resumen de clasificación ---------------- */
const FRASES_CAMPEON = [
  "¡Alzáis el título entre una ovación cerrada de vuestra afición!",
  "Cerráis una temporada perfecta levantando el trofeo de campeones.",
  "El equipo entero se funde en un abrazo tras confirmar el título.",
];
const FRASES_TEMPORADA_DIFICIL = [
  "La temporada termina entre la decepción de una campaña muy irregular.",
  "Un curso para el olvido: el equipo nunca encontró su mejor versión.",
];

export {
  ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION,
  PAISES,
  EVENTOS_PRETEMPORADA, EVENTOS_TEMPORADA, TORNEOS,
  FRASES_CAMPEON, FRASES_TEMPORADA_DIFICIL,
};

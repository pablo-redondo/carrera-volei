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

/* ---------------- Clubes y divisiones (ficticios) ---------------- */
/* prestigio: 1 (modesto) a 10 (histórico), influye en dificultad, salario y fama */
const CLUBES = {
  primera_nacional: [
    { nombre: "CV Ribera Alta", prestigio: 2 },
    { nombre: "Club Voleibol Altamira", prestigio: 2 },
    { nombre: "UD Voleibol Peñalta", prestigio: 1 },
    { nombre: "CV Puerto Levante", prestigio: 2 },
    { nombre: "Voleibol Sierra Nueva", prestigio: 1 },
    { nombre: "CV Villafranca", prestigio: 2 },
  ],
  superliga2: [
    { nombre: "CV Costa Azul", prestigio: 4 },
    { nombre: "Voleibol Miralbueno", prestigio: 4 },
    { nombre: "CV Torremonte", prestigio: 3 },
    { nombre: "Club Voleibol Alcántara", prestigio: 4 },
    { nombre: "CV Guadalpeña", prestigio: 3 },
    { nombre: "Voleibol Montearagón", prestigio: 5 },
  ],
  superliga1: [
    { nombre: "CV Marbella Elite", prestigio: 8 },
    { nombre: "Real Voleibol Castilla", prestigio: 9 },
    { nombre: "CV Atlántico", prestigio: 7 },
    { nombre: "Voleibol Levante FC", prestigio: 8 },
    { nombre: "CV Ciudad Imperial", prestigio: 10 },
    { nombre: "Club Voleibol Norte", prestigio: 7 },
    { nombre: "CV Bahía Dorada", prestigio: 6 },
    { nombre: "Voleibol Sporting Vega", prestigio: 6 },
  ],
};

const ORDEN_DIVISIONES = ["primera_nacional", "superliga2", "superliga1"];
const NOMBRE_DIVISION = {
  primera_nacional: "Primera Nacional",
  superliga2: "Superliga 2",
  superliga1: "Superliga 1",
};

/* ---------------- Eventos aleatorios de pretemporada ---------------- */
/* efecto: función(estado) -> aplica cambios y devuelve texto de resultado */
const EVENTOS_PRETEMPORADA = [
  {
    texto: (j) => `El preparador físico te propone un plan de pesas intensivo antes de empezar la pretemporada. Es duro, pero puede marcar la diferencia.`,
    opciones: [
      { texto: "Aceptar el reto", efecto: { fisico: 3, moral: -2 }, resultado: "Terminas la pretemporada agotado/a, pero notablemente más fuerte." },
      { texto: "Seguir el plan estándar", efecto: { fisico: 1 }, resultado: "Cumples con lo justo. Nada que destacar." },
    ],
  },
  {
    texto: (j) => `Una marca deportiva local se pone en contacto contigo para patrocinarte la equipación a cambio de aparecer en sus anuncios.`,
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
    texto: (j) => `Un club extranjero se interesa por ti para una experiencia de pretemporada internacional.`,
    opciones: [
      { texto: "Ir a foguearte fuera", efecto: { ataque: 1, bloqueo: 1, saque: 1, moral: 1 }, resultado: "La experiencia te abre la cabeza y mejoras varios aspectos de tu juego." },
      { texto: "Quedarte con tu equipo", efecto: { liderazgo: 1 }, resultado: "Refuerzas la conexión con tus compañeros de siempre." },
    ],
  },
  {
    texto: (j) => `Se acerca el cierre del mercado de fichajes y tu agente te llama: hay rumores de interés de otro club.`,
    opciones: [
      { texto: "Escuchar la oferta", efecto: { moral: 1 }, resultado: "Aunque sigues en tu club, sientes que estás en el radar de otros equipos." },
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
const TORNEOS = ["Campeonato de Europa", "Copa del Mundo", "Juegos Olímpicos"];

/* ---------------- Frases de resumen de clasificación ---------------- */
const FRASES_CAMPEON = [
  "¡Alzáis el título entre una ovación cerrada de vuestra afición!",
  "Cerráis una temporada perfecta levantando el trofeo de campeones.",
  "El equipo entero se funde en un abrazo tras confirmar el título.",
];
const FRASES_DESCENSO = [
  "La temporada termina con la amarga noticia del descenso de categoría.",
  "El equipo no pudo evitar el descenso tras una campaña irregular.",
];

export {
  ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION,
  CLUBES, ORDEN_DIVISIONES, NOMBRE_DIVISION,
  EVENTOS_PRETEMPORADA, EVENTOS_TEMPORADA, TORNEOS,
  FRASES_CAMPEON, FRASES_DESCENSO,
};

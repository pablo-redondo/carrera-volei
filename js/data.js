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
    base: { ataque: 30, bloqueo: 25, saque: 35, recepcion: 35, colocacion: 52, defensa: 35, fisico: 35, liderazgo: 40 },
    pesos: { ataque: .08, bloqueo: .04, saque: .14, recepcion: .10, colocacion: .34, defensa: .12, fisico: .10, liderazgo: .08 },
  },
  opuesto: {
    nombre: "Opuesto/a",
    descripcion: "El rematador de referencia. Ataca desde la zaga y castiga con el saque.",
    base: { ataque: 48, bloqueo: 35, saque: 40, recepcion: 25, colocacion: 25, defensa: 30, fisico: 40, liderazgo: 30 },
    pesos: { ataque: .34, bloqueo: .14, saque: .18, recepcion: .04, colocacion: .04, defensa: .08, fisico: .12, liderazgo: .06 },
  },
  central: {
    nombre: "Central",
    descripcion: "La muralla en el bloqueo y el arma del ataque rápido por el centro de la red.",
    base: { ataque: 38, bloqueo: 50, saque: 30, recepcion: 22, colocacion: 25, defensa: 30, fisico: 42, liderazgo: 30 },
    pesos: { ataque: .18, bloqueo: .34, saque: .10, recepcion: .03, colocacion: .04, defensa: .09, fisico: .16, liderazgo: .06 },
  },
  receptor: {
    nombre: "Receptor/a-Atacante",
    descripcion: "Completo por naturaleza: ataca, recibe y saca con solvencia en banda.",
    base: { ataque: 42, bloqueo: 30, saque: 35, recepcion: 42, colocacion: 25, defensa: 33, fisico: 38, liderazgo: 30 },
    pesos: { ataque: .28, bloqueo: .09, saque: .14, recepcion: .19, colocacion: .04, defensa: .10, fisico: .10, liderazgo: .06 },
  },
  libero: {
    nombre: "Líbero",
    descripcion: "Especialista defensivo. No remata ni bloquea, pero sin él no se gana ni un set.",
    base: { ataque: 5, bloqueo: 5, saque: 18, recepcion: 50, colocacion: 30, defensa: 52, fisico: 35, liderazgo: 26 },
    pesos: { ataque: 0, bloqueo: 0, saque: .03, recepcion: .34, colocacion: .10, defensa: .34, fisico: .13, liderazgo: .06 },
  },
};

/* Puntos que el usuario puede repartir libremente en la creación del personaje */
const PUNTOS_CREACION = 45;
const TOPE_CREACION = 75;

/* ---------------------------------------------------------------
   Países, ligas y clubes reales — dos niveles por país (primera y
   segunda división). nivelLiga (1-10): fuerza relativa de cada
   competición. Empiezas tu carrera en un club de la segunda división
   de tu país; a base de rendir, llegan ofertas de división superior
   e incluso del extranjero.
   --------------------------------------------------------------- */
const PAISES = {
  espana: {
    nombre: "España", gentilicio: "española",
    ligas: {
      primera: {
        nombre: "Superliga Masculina de Voleibol", nivelLiga: 5,
        clubes: [
          { nombre: "Unicaja Almería", prestigio: 9 },
          { nombre: "CV Teruel", prestigio: 8 },
          { nombre: "Barça Voleibol", prestigio: 7 },
          { nombre: "Guaguas Las Palmas", prestigio: 6 },
          { nombre: "Ushuaïa Ibiza Voley", prestigio: 6 },
          { nombre: "Río Duero Soria", prestigio: 4 },
        ],
      },
      segunda: {
        nombre: "Superliga 2", nivelLiga: 3,
        clubes: [
          { nombre: "CV Melilla", prestigio: 4 },
          { nombre: "CV Textil Santanderina", prestigio: 4 },
          { nombre: "CV Manacor", prestigio: 3 },
          { nombre: "San Fernando CV", prestigio: 3 },
          { nombre: "CDU Málaga", prestigio: 3 },
          { nombre: "CV Playas de Castellón", prestigio: 2 },
          { nombre: "Leganés Voley", prestigio: 2 },
        ],
      },
    },
  },
  polonia: {
    nombre: "Polonia", gentilicio: "polaca",
    ligas: {
      primera: {
        nombre: "PlusLiga", nivelLiga: 10,
        clubes: [
          { nombre: "Skra Bełchatów", prestigio: 10 },
          { nombre: "ZAKSA Kędzierzyn-Koźle", prestigio: 9 },
          { nombre: "Jastrzębski Węgiel", prestigio: 8 },
          { nombre: "Asseco Resovia Rzeszów", prestigio: 8 },
          { nombre: "Warta Zawiercie", prestigio: 7 },
          { nombre: "Trefl Gdańsk", prestigio: 6 },
        ],
      },
      segunda: {
        nombre: "1. Liga (PLS 1. Liga)", nivelLiga: 6,
        clubes: [
          { nombre: "MKS Będzin", prestigio: 5 },
          { nombre: "Stal Nysa", prestigio: 5 },
          { nombre: "Czarni Radom", prestigio: 4 },
          { nombre: "GKS Katowice", prestigio: 4 },
          { nombre: "AZS Częstochowa", prestigio: 3 },
          { nombre: "Gwardia Wrocław", prestigio: 3 },
        ],
      },
    },
  },
  italia: {
    nombre: "Italia", gentilicio: "italiana",
    ligas: {
      primera: {
        nombre: "SuperLega", nivelLiga: 10,
        clubes: [
          { nombre: "Sir Susa Vim Perugia", prestigio: 10 },
          { nombre: "Cucine Lube Civitanova", prestigio: 9 },
          { nombre: "Itas Trentino", prestigio: 9 },
          { nombre: "Valsa Group Modena", prestigio: 8 },
          { nombre: "Allianz Milano", prestigio: 7 },
          { nombre: "Gas Sales Piacenza", prestigio: 6 },
        ],
      },
      segunda: {
        nombre: "Serie A2 Credem Banca", nivelLiga: 6,
        clubes: [
          { nombre: "Yuasa Battery Grottazzolina", prestigio: 5 },
          { nombre: "Delta Group Porto Viro", prestigio: 5 },
          { nombre: "Volley Mondovì", prestigio: 4 },
          { nombre: "Pallavolo Ortona", prestigio: 4 },
          { nombre: "Volley Cantù", prestigio: 3 },
          { nombre: "San Donà Volley", prestigio: 3 },
        ],
      },
    },
  },
  brasil: {
    nombre: "Brasil", gentilicio: "brasileña",
    ligas: {
      primera: {
        nombre: "Superliga Brasileira Masculina", nivelLiga: 9,
        clubes: [
          { nombre: "Sada Cruzeiro", prestigio: 10 },
          { nombre: "Minas Tênis Clube", prestigio: 9 },
          { nombre: "EC Pinheiros", prestigio: 8 },
          { nombre: "Sesi-SP", prestigio: 7 },
          { nombre: "EMS Taubaté Funvic", prestigio: 6 },
          { nombre: "Suzano Vôlei", prestigio: 6 },
        ],
      },
      segunda: {
        nombre: "Superliga B Masculina", nivelLiga: 5,
        clubes: [
          { nombre: "Academia do Vôlei", prestigio: 4 },
          { nombre: "Juiz de Fora Vôlei", prestigio: 4 },
          { nombre: "Araguari Vôlei", prestigio: 3 },
          { nombre: "Montes Claros Vôlei", prestigio: 3 },
          { nombre: "Brasília Vôlei", prestigio: 3 },
          { nombre: "Vôlei Renata Campinas", prestigio: 3 },
        ],
      },
    },
  },
  francia: {
    nombre: "Francia", gentilicio: "francesa",
    ligas: {
      primera: {
        nombre: "Ligue A", nivelLiga: 7,
        clubes: [
          { nombre: "Tours VB", prestigio: 10 },
          { nombre: "Paris Volley", prestigio: 8 },
          { nombre: "Montpellier UC", prestigio: 8 },
          { nombre: "Chaumont VB 52", prestigio: 7 },
          { nombre: "AS Cannes Volley-Ball", prestigio: 6 },
          { nombre: "Nantes Rezé Métropole Volley", prestigio: 5 },
        ],
      },
      segunda: {
        nombre: "Ligue B (Nationale 1)", nivelLiga: 4,
        clubes: [
          { nombre: "Cambrai Volley", prestigio: 3 },
          { nombre: "Nice Volley-Ball", prestigio: 3 },
          { nombre: "Poitiers Volley 86", prestigio: 3 },
          { nombre: "Sète Volley", prestigio: 2 },
          { nombre: "Rennes Volley 35", prestigio: 2 },
          { nombre: "Saint-Nazaire Volley", prestigio: 2 },
        ],
      },
    },
  },
  argentina: {
    nombre: "Argentina", gentilicio: "argentina",
    ligas: {
      primera: {
        nombre: "Liga Argentina de Voleibol", nivelLiga: 6,
        clubes: [
          { nombre: "UPCN San Juan Vóley", prestigio: 10 },
          { nombre: "Personal Bolívar", prestigio: 9 },
          { nombre: "Ciudad Vóley", prestigio: 7 },
          { nombre: "Boca Juniors Vóley", prestigio: 6 },
          { nombre: "River Plate Vóley", prestigio: 5 },
          { nombre: "Club de Amigos", prestigio: 5 },
        ],
      },
      segunda: {
        nombre: "Liga Argentina de Voleibol — Serie A2", nivelLiga: 4,
        clubes: [
          { nombre: "Vóley Bahía Blanca", prestigio: 3 },
          { nombre: "Instituto ATSA Córdoba", prestigio: 3 },
          { nombre: "Náutico Hacoaj", prestigio: 3 },
          { nombre: "Gimnasia y Esgrima La Plata", prestigio: 2 },
          { nombre: "Obras Sanitarias Vóley", prestigio: 2 },
          { nombre: "Quilmes Vóley", prestigio: 2 },
        ],
      },
    },
  },
  japon: {
    nombre: "Japón", gentilicio: "japonesa",
    ligas: {
      primera: {
        nombre: "V.League Division 1", nivelLiga: 7,
        clubes: [
          { nombre: "Suntory Sunbirds", prestigio: 10 },
          { nombre: "Panasonic Panthers", prestigio: 9 },
          { nombre: "Wolfdogs Nagoya", prestigio: 8 },
          { nombre: "JT Thunders Hiroshima", prestigio: 7 },
          { nombre: "Toray Arrows", prestigio: 6 },
          { nombre: "Osaka Bluteon", prestigio: 5 },
        ],
      },
      segunda: {
        nombre: "V.League Division 2", nivelLiga: 5,
        clubes: [
          { nombre: "Hokkaido Yellow Stars", prestigio: 4 },
          { nombre: "Toyota Motor Sun Hawks", prestigio: 4 },
          { nombre: "Aisin Tealmare", prestigio: 3 },
          { nombre: "Tsukuba United", prestigio: 3 },
          { nombre: "Tokyo Verdy Volleyball", prestigio: 3 },
          { nombre: "Voreas Hokkaido", prestigio: 2 },
        ],
      },
    },
  },
  serbia: {
    nombre: "Serbia", gentilicio: "serbia",
    ligas: {
      primera: {
        nombre: "Superliga Srbije", nivelLiga: 7,
        clubes: [
          { nombre: "OK Vojvodina", prestigio: 9 },
          { nombre: "OK Crvena Zvezda", prestigio: 9 },
          { nombre: "OK Radnički Kragujevac", prestigio: 8 },
          { nombre: "OK Partizan", prestigio: 7 },
          { nombre: "OK Železničar", prestigio: 5 },
          { nombre: "OK Napredak", prestigio: 4 },
        ],
      },
      segunda: {
        nombre: "Prva Liga Srbije", nivelLiga: 4,
        clubes: [
          { nombre: "OK Jedinstvo Stara Pazova", prestigio: 3 },
          { nombre: "OK Spartak Subotica", prestigio: 3 },
          { nombre: "OK Sloga Kraljevo", prestigio: 3 },
          { nombre: "OK Mladost Novi Sad", prestigio: 2 },
          { nombre: "OK Smederevo", prestigio: 2 },
          { nombre: "OK Kolubara", prestigio: 2 },
        ],
      },
    },
  },
  turquia: {
    nombre: "Turquía", gentilicio: "turca",
    ligas: {
      primera: {
        nombre: "Efeler Ligi", nivelLiga: 8,
        clubes: [
          { nombre: "Ziraat Bankası", prestigio: 9 },
          { nombre: "Halkbank", prestigio: 9 },
          { nombre: "Fenerbahçe", prestigio: 8 },
          { nombre: "Galatasaray", prestigio: 8 },
          { nombre: "Arkas Spor İzmir", prestigio: 6 },
          { nombre: "Türk Telekom", prestigio: 5 },
        ],
      },
      segunda: {
        nombre: "1. Lig", nivelLiga: 5,
        clubes: [
          { nombre: "Bursa BŞB", prestigio: 4 },
          { nombre: "Bandırma Bandırmaspor", prestigio: 4 },
          { nombre: "Karayolları Ankara", prestigio: 3 },
          { nombre: "Erzurum BŞB", prestigio: 3 },
          { nombre: "Adana Demirspor Voleybol", prestigio: 2 },
          { nombre: "Arhavi Belediyespor", prestigio: 2 },
        ],
      },
    },
  },
  rusia: {
    nombre: "Rusia", gentilicio: "rusa",
    ligas: {
      primera: {
        nombre: "Superleague", nivelLiga: 8,
        clubes: [
          { nombre: "Zenit Kazan", prestigio: 10 },
          { nombre: "Dynamo Moscow", prestigio: 9 },
          { nombre: "Zenit Saint Petersburg", prestigio: 8 },
          { nombre: "Belogorie Belgorod", prestigio: 8 },
          { nombre: "Lokomotiv Novosibirsk", prestigio: 6 },
          { nombre: "Fakel Novy Urengoy", prestigio: 6 },
        ],
      },
      segunda: {
        nombre: "Higher League A", nivelLiga: 5,
        clubes: [
          { nombre: "Dynamo-LO", prestigio: 4 },
          { nombre: "Nova Novokuibyshevsk", prestigio: 4 },
          { nombre: "VC Ural Ufa", prestigio: 3 },
          { nombre: "Neftyanik Orenburg", prestigio: 3 },
          { nombre: "Yugra-Samotlor Nizhnevartovsk", prestigio: 2 },
          { nombre: "VC Tyumen", prestigio: 2 },
        ],
      },
    },
  },
  iran: {
    nombre: "Irán", gentilicio: "iraní",
    ligas: {
      primera: {
        nombre: "Iran Volleyball Super League", nivelLiga: 6,
        clubes: [
          { nombre: "Foolad Sirjan", prestigio: 9 },
          { nombre: "Shahdab Yazd", prestigio: 8 },
          { nombre: "Shahrdari Urmia", prestigio: 8 },
          { nombre: "Sarmayeh Bank Tehran", prestigio: 7 },
          { nombre: "Paykan Tehran", prestigio: 7 },
          { nombre: "Kalleh Mazandaran", prestigio: 5 },
        ],
      },
      segunda: {
        nombre: "Iran Volleyball League 1", nivelLiga: 4,
        clubes: [
          { nombre: "Rah Ahan Tehran", prestigio: 3 },
          { nombre: "Naft Ahvaz", prestigio: 3 },
          { nombre: "Damash Gilan", prestigio: 3 },
          { nombre: "Farsan Chaharmahal", prestigio: 2 },
          { nombre: "Azarbayjan Urmia", prestigio: 2 },
          { nombre: "Gostaresh Foulad Tabriz", prestigio: 2 },
        ],
      },
    },
  },
  eslovenia: {
    nombre: "Eslovenia", gentilicio: "eslovena",
    ligas: {
      primera: {
        nombre: "1. DOL", nivelLiga: 5,
        clubes: [
          { nombre: "ACH Volley Ljubljana", prestigio: 10 },
          { nombre: "Calcit Kamnik", prestigio: 7 },
          { nombre: "Merkur Maribor", prestigio: 5 },
          { nombre: "Fužinar Ravne", prestigio: 4 },
          { nombre: "Triglav Kranj", prestigio: 3 },
        ],
      },
      segunda: {
        nombre: "2. DOL", nivelLiga: 3,
        clubes: [
          { nombre: "OK Zavrč", prestigio: 2 },
          { nombre: "OK Bled", prestigio: 2 },
          { nombre: "OK Šoštanj Topolšica", prestigio: 2 },
          { nombre: "OK Krka Novo Mesto", prestigio: 2 },
          { nombre: "OK Salonit Anhovo", prestigio: 1 },
        ],
      },
    },
  },
};

/* ---------------- Eventos aleatorios de pretemporada ---------------- */
/* Cada opción tiene varios desenlaces posibles ponderados por "prob"
   (no hace falta que sumen 100): la misma decisión no siempre sale igual. */
const EVENTOS_PRETEMPORADA = [
  {
    texto: (j) => `El preparador físico te propone un plan de pesas intensivo antes de empezar la pretemporada. Es duro, pero puede marcar la diferencia.`,
    opciones: [
      {
        texto: "Aceptar el reto",
        resultados: [
          { prob: 65, efecto: { fisico: 4, moral: -1 }, texto: "El plan te sienta de maravilla: terminas la pretemporada notablemente más fuerte." },
          { prob: 35, efecto: { fisico: -1, moral: -3, riesgoLesion: 6 }, texto: "Te has pasado de frenada: llegas sobrecargado/a y con molestias de cara al inicio de liga." },
        ],
      },
      {
        texto: "Seguir el plan estándar",
        resultados: [
          { prob: 80, efecto: { fisico: 1 }, texto: "Cumples con lo justo. Nada que destacar, pero llegas entero/a." },
          { prob: 20, efecto: { fisico: 2, moral: 1 }, texto: "La rutina sencilla te sienta mejor de lo esperado y llegas fresco/a a la pretemporada." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Una marca deportiva se pone en contacto contigo para patrocinarte la equipación a cambio de aparecer en sus anuncios.`,
    opciones: [
      {
        texto: "Firmar el patrocinio",
        resultados: [
          { prob: 75, efecto: { dinero: 3000, liderazgo: 1 }, texto: "El acuerdo sale redondo: ingresas un buen dinero y tu imagen crece." },
          { prob: 25, efecto: { dinero: 800, moral: -2 }, texto: "La campaña resulta un poco cutre y varios compañeros se ríen de los anuncios. El pago es menor de lo prometido." },
        ],
      },
      {
        texto: "Rechazarlo y centrarte en el juego",
        resultados: [
          { prob: 100, efecto: { moral: 2 }, texto: "Prefieres que hablen tus actuaciones en la cancha, y así se lo haces saber a tu entorno." },
        ],
      },
    ],
  },
  {
    texto: (j) => `El entrenador reúne al vestuario y pide un capitán o capitana para la temporada. Varios compañeros te miran.`,
    opciones: [
      {
        texto: "Dar un paso al frente",
        resultados: [
          { prob: 70, efecto: { liderazgo: 4, moral: 2 }, texto: "Te conviertes en un referente indiscutible del vestuario." },
          { prob: 30, efecto: { liderazgo: 2, moral: -2 }, texto: "Aceptas el brazalete, pero el peso extra de la responsabilidad te pasa factura al principio." },
        ],
      },
      {
        texto: "Declinar el ofrecimiento",
        resultados: [
          { prob: 100, efecto: { moral: -1 }, texto: "Prefieres centrarte solo en tu rendimiento, aunque algún veterano lo interpreta como falta de compromiso." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Un periodista de un medio deportivo local quiere entrevistarte sobre tus objetivos para la temporada.`,
    opciones: [
      {
        texto: "Hablar con ambición",
        resultados: [
          { prob: 55, efecto: { liderazgo: 3, reputacion: 4 }, texto: "Tus declaraciones generan expectación positiva y ganas notoriedad." },
          { prob: 45, efecto: { moral: -3, reputacion: -2 }, texto: "Tus palabras se malinterpretan y acaban generando presión extra y algún titular incómodo." },
        ],
      },
      {
        texto: "Mantener un perfil bajo",
        resultados: [
          { prob: 100, efecto: { moral: 1 }, texto: "Prefieres que hablen los resultados y evitas cualquier polémica innecesaria." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Durante un entrenamiento notas una leve molestia física. El fisioterapeuta te recomienda parar unos días.`,
    opciones: [
      {
        texto: "Parar y cuidarte",
        resultados: [
          { prob: 85, efecto: { fisico: 1, moral: -1 }, texto: "La molestia desaparece sin mayores complicaciones tras un descanso breve." },
          { prob: 15, efecto: { moral: -3, riesgoLesion: -5 }, texto: "El parón se alarga más de lo previsto y pierdes ritmo de pretemporada, aunque llegas más sano/a." },
        ],
      },
      {
        texto: "Seguir entrenando al máximo",
        resultados: [
          { prob: 40, efecto: { fisico: 2 }, texto: "Aprietas los dientes y sales indemne: la molestia no va a más." },
          { prob: 60, efecto: { fisico: -4, riesgoLesion: 10, moral: -2 }, texto: "Te has arriesgado de más: la molestia se agrava y el riesgo de lesión aumenta bastante este año." },
        ],
      },
    ],
  },
  {
    texto: (j) => `El club organiza una pretemporada con partidos amistosos frente a rivales de otros países.`,
    opciones: [
      {
        texto: "Aprovechar para foguearte fuera",
        resultados: [
          { prob: 70, efecto: { ataque: 1, bloqueo: 1, saque: 1, moral: 1 }, texto: "La experiencia internacional te abre la cabeza y mejoras varios aspectos de tu juego." },
          { prob: 30, efecto: { fisico: -2, moral: -1 }, texto: "El viaje y el cambio de horarios te pasan factura físicamente." },
        ],
      },
      {
        texto: "Centrarte en la puesta a punto física",
        resultados: [
          { prob: 100, efecto: { fisico: 2 }, texto: "Priorizas llegar en plena forma al inicio de la liga." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Se acerca el cierre del mercado de fichajes y tu agente te llama: hay rumores de interés desde el extranjero.`,
    opciones: [
      {
        texto: "Escuchar la oferta",
        resultados: [
          { prob: 60, efecto: { moral: 2, reputacion: 3 }, texto: "Aunque sigues en tu club, sientes que estás en el radar de otros equipos del mundo." },
          { prob: 40, efecto: { moral: -2 }, texto: "Los rumores llegan al vestuario y generan un ambiente incómodo con tus compañeros." },
        ],
      },
      {
        texto: "Cortar la conversación",
        resultados: [
          { prob: 100, efecto: { liderazgo: 1 }, texto: "Tu club valora tu compromiso este curso." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Un compañero veterano del vestuario se ofrece a darte consejos extra después de los entrenamientos.`,
    opciones: [
      {
        texto: "Aprovechar su experiencia",
        resultados: [
          { prob: 80, efecto: { colocacion: 1, defensa: 1, recepcion: 1 }, texto: "Aprendes pequeños detalles que marcan la diferencia en pista." },
          { prob: 20, efecto: { moral: -1 }, texto: "Sus consejos chocan con lo que te dice el entrenador y acabas hecho/a un lío." },
        ],
      },
      {
        texto: "Preferir entrenar por tu cuenta",
        resultados: [
          { prob: 100, efecto: { fisico: 1 }, texto: "Sigues tu propio método de trabajo." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Un canal deportivo te propone participar en un reto viral en redes sociales junto a otros jugadores.`,
    opciones: [
      {
        texto: "Grabar el vídeo",
        resultados: [
          { prob: 50, efecto: { dinero: 1200, reputacion: 5, moral: 2 }, texto: "El vídeo se hace viral: ganas seguidores, un pequeño ingreso y caes muy bien a la afición." },
          { prob: 30, efecto: { moral: -1 }, texto: "El vídeo pasa sin pena ni gloria, aunque no cuesta nada intentarlo." },
          { prob: 20, efecto: { reputacion: -4, moral: -2 }, texto: "Una broma sale mal y te llueven las críticas en redes durante unos días." },
        ],
      },
      {
        texto: "Declinar la propuesta",
        resultados: [
          { prob: 100, efecto: {}, texto: "Prefieres mantener tu vida privada al margen de las redes." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Tu club te ofrece firmar una cláusula de renovación automática a cambio de una prima ahora mismo.`,
    opciones: [
      {
        texto: "Aceptar la prima inmediata",
        resultados: [
          { prob: 100, efecto: { dinero: 1800, liderazgo: -1 }, texto: "Cobras la prima al instante, aunque pierdes algo de margen para negociar en el futuro." },
        ],
      },
      {
        texto: "Rechazarla y mantener la libertad de negociar",
        resultados: [
          { prob: 60, efecto: { reputacion: 2 }, texto: "Con el tiempo, tu decisión de no atarte resulta inteligente: mantienes tu valor de mercado." },
          { prob: 40, efecto: { moral: -1 }, texto: "El club se lo toma como un desplante y la relación se enfría un poco." },
        ],
      },
    ],
  },
];

/* ---------------- Eventos aleatorios durante la temporada ---------------- */
const EVENTOS_TEMPORADA = [
  {
    texto: (j) => `A mitad de temporada, el vestuario vive un cruce de opiniones sobre el sistema de juego del entrenador.`,
    opciones: [
      {
        texto: "Respaldar al entrenador en público",
        resultados: [
          { prob: 70, efecto: { liderazgo: 2, reputacion: 2 }, texto: "El cuerpo técnico valora mucho tu apoyo público." },
          { prob: 30, efecto: { moral: -2 }, texto: "Parte del vestuario se lo toma mal y notas cierta tensión con algunos compañeros." },
        ],
      },
      {
        texto: "Mantenerte al margen",
        resultados: [
          { prob: 100, efecto: {}, texto: "Prefieres no meterte en líos internos y sigues centrado/a en tu juego." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Tienes la oportunidad de dar una charla motivacional en un colegio sobre tu experiencia como deportista.`,
    opciones: [
      {
        texto: "Aceptar la charla",
        resultados: [
          { prob: 85, efecto: { liderazgo: 2, moral: 2, reputacion: 1 }, texto: "Disfrutas conectando con jóvenes aficionados/as al vóley y sales con las pilas cargadas." },
          { prob: 15, efecto: { fisico: -1, moral: -1 }, texto: "El día se alarga más de lo previsto y llegas cansado/a al entrenamiento siguiente." },
        ],
      },
      {
        texto: "Declinar por falta de tiempo",
        resultados: [
          { prob: 100, efecto: { fisico: 1 }, texto: "Prefieres centrar tu energía en los entrenamientos." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Una lesión de un compañero titular te da la oportunidad de ganar más minutos en pista.`,
    opciones: [
      {
        texto: "Dar un paso al frente",
        resultados: [
          { prob: 65, efecto: { moral: 3, reputacion: 3 }, texto: "Aprovechas la ocasión y te ganas la confianza definitiva del cuerpo técnico." },
          { prob: 35, efecto: { moral: -2, fisico: -2 }, texto: "El exceso de partidos de golpe te pasa factura físicamente y no rindes como esperabas." },
        ],
      },
      {
        texto: "Ir con cautela",
        resultados: [
          { prob: 100, efecto: { fisico: 1 }, texto: "Prefieres coger ritmo sin forzar la máquina." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Un ojeador de otro club se presenta en un partido para verte jugar en directo.`,
    opciones: [
      {
        texto: "Intentar destacar al máximo",
        resultados: [
          { prob: 55, efecto: { reputacion: 5, moral: 2 }, texto: "Firmas un partidazo delante del ojeador: tu valor de mercado sube como la espuma." },
          { prob: 45, efecto: { moral: -3, fisico: -1 }, texto: "La presión te juega una mala pasada y firmas uno de tus peores partidos del año." },
        ],
      },
      {
        texto: "Jugar con normalidad, sin obsesionarte",
        resultados: [
          { prob: 100, efecto: { moral: 1 }, texto: "Decides no darle más importancia de la cuenta y eso te ayuda a rendir con soltura." },
        ],
      },
    ],
  },
  {
    texto: (j) => `Un compañero de vestuario te propone salir de fiesta la noche antes de un partido importante.`,
    opciones: [
      {
        texto: "Salir un rato y desconectar",
        resultados: [
          { prob: 40, efecto: { moral: 3 }, texto: "La noche te sienta bien: desconectas y llegas al partido con la cabeza despejada." },
          { prob: 60, efecto: { fisico: -2, moral: -1 }, texto: "Te acuestas más tarde de lo debido y se nota en tus piernas al día siguiente." },
        ],
      },
      {
        texto: "Quedarte a descansar",
        resultados: [
          { prob: 100, efecto: { fisico: 1 }, texto: "Prefieres cuidar tu descanso antes de un partido clave." },
        ],
      },
    ],
  },
  {
    texto: (j) => `El club atraviesa un bache de resultados y la directiva plantea cambios en el once inicial.`,
    opciones: [
      {
        texto: "Pedir explicaciones directamente al entrenador",
        resultados: [
          { prob: 50, efecto: { liderazgo: 2, moral: 1 }, texto: "La conversación sincera aclara las cosas y refuerza tu papel en el equipo." },
          { prob: 50, efecto: { moral: -3 }, texto: "La charla se tensa y notas que tu relación con el entrenador se resiente." },
        ],
      },
      {
        texto: "Callar y demostrarlo en la pista",
        resultados: [
          { prob: 70, efecto: { moral: 2, reputacion: 2 }, texto: "Tu actitud profesional en los entrenamientos no pasa desapercibida." },
          { prob: 30, efecto: { moral: -1 }, texto: "Guardarte la frustración empieza a pesarte con el paso de las semanas." },
        ],
      },
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

/* ---------------- Imprevistos económicos de fin de temporada ----------------
   Se suman al sueldo de la temporada: factor = variación sobre el ingreso bruto. */
const EVENTOS_ECONOMICOS = [
  { prob: 12, factor: 0.30, texto: "Un patrocinador te sorprende con una prima por objetivos cumplidos." },
  { prob: 10, factor: 0.20, texto: "Cierras un pequeño acuerdo publicitario que te deja un ingreso extra." },
  { prob: 8,  factor: 0.15, texto: "Recibes una prima de fidelidad de tu club por el compromiso mostrado." },
  { prob: 8,  factor: 0.12, texto: "Una inversión que hiciste tiempo atrás empieza por fin a dar beneficios." },
  { prob: 14, factor: -0.25, texto: "Hacienda te reclama una regularización de impuestos atrasados." },
  { prob: 12, factor: -0.20, texto: "Una mala inversión inmobiliaria te cuesta más de lo esperado." },
  { prob: 10, factor: -0.18, texto: "Ayudas económicamente a tu familia en un momento complicado." },
  { prob: 8,  factor: -0.15, texto: "Un imprevisto en tu domicilio te obliga a afrontar gastos inesperados." },
  { prob: 6,  factor: -0.30, texto: "Tu agente desaparece con parte de tus ahorros tras una gestión turbia." },
  { prob: 12, factor: 0.10, texto: "Un evento benéfico en el que participas te reporta una pequeña compensación." },
];

export {
  ATRIBUTOS, POSICIONES, PUNTOS_CREACION, TOPE_CREACION,
  PAISES,
  EVENTOS_PRETEMPORADA, EVENTOS_TEMPORADA, EVENTOS_ECONOMICOS, TORNEOS,
  FRASES_CAMPEON, FRASES_TEMPORADA_DIFICIL,
};

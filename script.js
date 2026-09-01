

(function () {
  "use strict";

  /* ------------------------------------------------------------------
   * CONFIGURACIÓN FÁCIL DE EDITAR
   * ------------------------------------------------------------------ */

  // true  -> siempre reproduce la animación completa al entrar (Modo A)
  // false -> si ya se abrió antes, muestra el prólogo directamente (Modo B)
  const REPETIR_ANIMACION = true;

  // true  -> antes del sobre, reproduce la intro cinematográfica nueva
  //          (habitación oscura → luz → mesa → acercamiento → carta levantada)
  // false -> comportamiento anterior: arranca directo en "sealed", con el
  //          sobre ya centrado en pantalla (útil para comparar o depurar)
  const MOSTRAR_INTRO_CINEMATICA = true;

  // Frase sutil que aparece justo antes de romper el sello.
  const FRASE_APERTURA = "Hay historias que esperan años para ser contadas.";

  // Clave usada en localStorage para recordar que la carta ya fue abierta.
  const STORAGE_KEY = "rainbowland_prologo_abierto";

  // ------------------------------------------------------------------
  // MODO DEBUG DE LA INTRO: dejar en `true` para que cada fase dure varios
  // segundos y sea imposible no percibirla mientras se ajusta la secuencia.
  // Para ESTA prueba lo dejamos en `false`: TIEMPOS ya tiene los valores
  // pedidos (2s de oscuridad, ~2s de encendido, 1,5s observando la mesa,
  // 2,5s de acercamiento), que son los tiempos que hay que evaluar.
  // ------------------------------------------------------------------
  const MODO_DEBUG_INTRO = false;

  const INTRO_DEBUG = {
    darkHold: 1500,
    lightingRise: 2500,
    deskHold: 2500,
    approaching: 3000,
    lifting: 2000,
  };

  // Tiempos de la secuencia, en milisegundos. Ajustar acá para cambiar el
  // ritmo de la animación sin tocar el resto del código.
  const TIEMPOS = {
    // --- Intro cinematográfica (antes del sobre) ---
    darkHold: 2000,          // ESTADO 1 — oscuridad total: 2 segundos
    lightingRise: 2000,      // ESTADO 2 — encendido de la vela / revelado de la mesa: ~2 segundos
    deskHold: 2500,          // ESTADO 3 — observar la mesa completa: ~1,5 segundos
    approaching: 4500,       // ESTADO 4 — acercamiento de la cámara hacia la carta: ~2,5 segundos
    liftingDelay: 150,       // (sin usar en esta prueba: pausa antes de despegar la carta)
    lifting: 1300,           // (sin usar en esta prueba: duración de la carta levantándose)
    toSealedDelay: 300,      // (sin usar en esta prueba: pausa final antes de habilitar el sello)

    // --- Secuencia original: sello → sobre → hoja (sin cambios) ---
    whisperFadeIn: 120,      // demora antes de mostrar la frase susurrada
    whisperHold: 1000,       // cuánto se mantiene visible la frase
    crackAppear: 520,        // duración de la grieta apareciendo
    sealDetach: 560,         // duración del desprendimiento del sello
    flapOpenDelay: 120,      // pausa breve antes de que la solapa empiece a abrirse
    flapOpen: 1150,          // duración de la apertura de la solapa
    letterRiseDelay: 250,    // pausa antes de que la hoja empiece a salir/crecer
    letterRise: 1300,        // duración de la hoja creciendo hacia el lector
    toReadingDelay: 250,     // pausa final antes de quedar en modo lectura
  };

  if (MODO_DEBUG_INTRO) {
    Object.assign(TIEMPOS, INTRO_DEBUG);
  }

  /* ------------------------------------------------------------------
   * ESTADO Y REFERENCIAS DEL DOM
   * ------------------------------------------------------------------ */

  const body = document.body;
  const sealBtn = document.getElementById("sealBtn");
  const sealEmblem = document.getElementById("sealEmblem");
  const whisper = document.getElementById("whisper");
  const scene = document.getElementById("scene");
  const sceneReveal = document.getElementById("sceneReveal");
  const reading = document.getElementById("reading");
  const titleMain = document.getElementById("titleMain");
  const musicaFondo = document.getElementById("musicaFondo");
  const sndSello = document.getElementById("sndSello");
  const sndPapel = document.getElementById("sndPapel");

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let hasOpened = false; // evita reactivar la secuencia con toques repetidos

  const ESTADOS = [
    // Intro cinematográfica
    "dark",
    "lighting",
    "desk",
    "approaching",
    "lifting",
    // Secuencia original (sin cambios)
    "sealed",
    "breaking",
    "opening",
    "revealing",
    "reading",
  ];

  function setState(nombre) {
    if (ESTADOS.indexOf(nombre) === -1) {
      console.warn("[Rainbowland] Estado desconocido, ignorado:", nombre);
      return;
    }
    body.setAttribute("data-state", nombre);
    // Log de depuración pedido explícitamente: permite comprobar en la
    // consola que la secuencia pasa por TODOS los estados, sin saltearse
    // ninguno, hasta llegar a "reading".
    console.log("ESTADO:", nombre);
  }

  /* ------------------------------------------------------------------
   * PERSISTENCIA (localStorage)
   * ------------------------------------------------------------------ */

  function marcarComoAbierto() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      /* localStorage puede fallar en navegación privada; no es crítico */
    }
  }

  function yaFueAbiertoAntes() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  // Utilidad de prueba: borra el estado guardado para volver a experimentar
  // la apertura completa. Disponible en consola como resetRainbowland().
  window.resetRainbowland = function resetRainbowland() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* noop */
    }
    console.info(
      "[Rainbowland] Estado reiniciado. Recargá la página para ver la carta sellada nuevamente."
    );
  };

  /* ------------------------------------------------------------------
   * EMBLEMA DEL SELLO (assets/sello.png)
   * sello.png es el recurso DEFINITIVO (zorro y ardilla): no hay ningún
   * fallback de texto/letra si por algún motivo no cargara (a pedido
   * explícito, se eliminó por completo la "R" y cualquier símbolo
   * genérico que la reemplazara) — el botón simplemente se queda sin
   * emblema visible en ese caso.
   * ------------------------------------------------------------------ */

  function initSealEmblem() {
    if (!sealEmblem) return;
    // El listener de error se ata ANTES de asignar el src (que viene de
    // data-src) para no perder el evento cuando la imagen todavía no
    // existe: si el navegador empezara a cargarla desde el HTML original,
    // el 404 podría resolverse antes de que este script llegue a ejecutarse.
    sealEmblem.addEventListener("error", function () {
      sealEmblem.style.display = "none";
    });
    const src = sealEmblem.getAttribute("data-src");
    if (src) sealEmblem.src = src;
  }

  /* ------------------------------------------------------------------
   * SONIDO OPCIONAL
   * Los navegadores móviles bloquean el audio automático: por eso solo
   * se intenta reproducir dentro del propio gesto de toque del usuario.
   * Si el archivo no existe o el navegador bloquea la reproducción, se
   * ignora silenciosamente y la experiencia sigue funcionando igual.
   * ------------------------------------------------------------------ */

  // Música ambiental de prueba. Se intenta iniciar apenas carga la página,
  // para que acompañe también la pantalla negra inicial. Si el navegador
  // bloquea autoplay con sonido, queda armado un fallback que la inicia
  // con la primera interacción del usuario (clic, toque o tecla).
  function iniciarMusicaFondo() {
  if (!musicaFondo) return;

  musicaFondo.loop = true;
  musicaFondo.volume = 0.28;

  function intentarReproducir() {
    if (!musicaFondo.paused) {
      quitarDesbloqueo();
      return;
    }

    try {
      const promesa = musicaFondo.play();

      if (promesa && typeof promesa.then === "function") {
        promesa
          .then(function () {
            quitarDesbloqueo();
          })
          .catch(function () {
            // El navegador todavía no permitió reproducir.
            // Dejamos los listeners activos para el próximo gesto.
          });
      }
    } catch (e) {
      // Seguimos esperando otra interacción.
    }
  }

  function quitarDesbloqueo() {
    document.removeEventListener("touchend", intentarReproducir, true);
    document.removeEventListener("pointerup", intentarReproducir, true);
    document.removeEventListener("click", intentarReproducir, true);
    document.removeEventListener("keydown", intentarReproducir, true);
  }

  // Intento inicial: funcionará en escritorio si autoplay está permitido.
  intentarReproducir();

  // En móvil permanecen activos hasta que REALMENTE comience la música.
  document.addEventListener("touchend", intentarReproducir, true);
  document.addEventListener("pointerup", intentarReproducir, true);
  document.addEventListener("click", intentarReproducir, true);
  document.addEventListener("keydown", intentarReproducir, true);
}
  function reproducirSonido(elementoAudio) {
    if (!elementoAudio) return;
    try {
      elementoAudio.currentTime = 0;
      const promesa = elementoAudio.play();
      if (promesa && typeof promesa.catch === "function") {
        promesa.catch(function () {
          /* archivo ausente o reproducción bloqueada: sin problema */
        });
      }
    } catch (e) {
      /* noop */
    }
  }

  /* ------------------------------------------------------------------
   * REVELADO DE LUZ (estado "lighting")
   * Abre #sceneReveal como un iris: un círculo de radio creciente,
   * centrado en la vela ya encendida de assets/mesa.png (--candle-x/
   * --candle-y en styles.css), que deja ver la mesa real progresivamente
   * en vez de un simple opacity 0→1 de toda la imagen. El radio se anima
   * a mano con requestAnimationFrame porque el degradado en sí (con sus
   * paradas de color) no se puede animar de forma confiable con una
   * transición CSS de "background".
   * ------------------------------------------------------------------ */

  // Lee --candle-x/--candle-y desde styles.css para no duplicar esas
  // coordenadas acá: si el punto de la vela cambia, alcanza con tocar el
  // CSS.
  function leerPorcentajeCSS(nombreVariable, valorPorDefecto) {
    try {
      const crudo = getComputedStyle(document.documentElement)
        .getPropertyValue(nombreVariable)
        .trim();
      const numero = parseFloat(crudo);
      return Number.isFinite(numero) ? numero : valorPorDefecto;
    } catch (e) {
      return valorPorDefecto;
    }
  }

  const VELA_X = leerPorcentajeCSS("--candle-x", 19);
  const VELA_Y = leerPorcentajeCSS("--candle-y", 14);

  let revelacionRAF = null;

  // Ease-in marcado (t³): como la vela está cerca de una esquina de la
  // pantalla, un radio relativamente chico ya alcanza a cubrir la carta y
  // la mayor parte de la mesa (todo eso está más cerca de la vela que la
  // esquina opuesta). Para que la expansión se siga viendo ocurrir durante
  // los ~2 segundos completos —en vez de "terminar" a los pocos cientos de
  // milisegundos— el radio crece muy despacio al principio y recién se
  // acelera hacia el final del recorrido.
  function easeInCubic(t) {
    return t * t * t;
  }

  function iniciarRevelacionDeLuz(duracionMs) {
    if (!sceneReveal) return;
    if (revelacionRAF) cancelAnimationFrame(revelacionRAF);

    // El radio final excede la diagonal de la pantalla con margen, para
    // que al terminar quede TODA la mesa revelada, sin bordes oscuros
    // residuales en las esquinas.
    const radioMaximo = Math.hypot(window.innerWidth, window.innerHeight) * 1.05;
    const radioInicial = Math.max(4, radioMaximo * 0.006);
    const inicio = Date.now();

    sceneReveal.style.opacity = "1";

    function cuadro() {
      const transcurrido = Date.now() - inicio;
      const t = Math.min(1, duracionMs > 0 ? transcurrido / duracionMs : 1);
      const avance = easeInCubic(t);
      const radio = radioInicial + (radioMaximo - radioInicial) * avance;
      // El borde de la luz (rgba intermedio) y el negro opaco se calculan
      // como un margen PROPORCIONAL al radio ya revelado (con un mínimo muy
      // chico), para que el halo sea diminuto cuando la luz recién nace y
      // se ensanche naturalmente a medida que crece — en vez de arrancar
      // ya con un halo ancho fijo, que haría ver "grande" a la llama desde
      // el primer cuadro.
      const borde = radio + Math.max(16, radio * 0.4);
      const opaco = radio + Math.max(46, radio * 1.05);

      sceneReveal.style.background =
        "radial-gradient(circle at " + VELA_X + "% " + VELA_Y + "%, " +
        "transparent 0px, transparent " + radio.toFixed(1) + "px, " +
        "rgba(4,2,1,.55) " + borde.toFixed(1) + "px, " +
        "#030201 " + opaco.toFixed(1) + "px)";

      if (t < 1) {
        revelacionRAF = requestAnimationFrame(cuadro);
      } else {
        revelacionRAF = null;
        // Totalmente revelado: se retira del todo (ver también la red de
        // seguridad puramente en CSS para body[data-state] != dark/lighting).
        window.setTimeout(function () {
          sceneReveal.style.opacity = "0";
        }, 60);
      }
    }

    revelacionRAF = requestAnimationFrame(cuadro);
  }

  /* ------------------------------------------------------------------
   * INTRO CINEMATOGRÁFICA (antes del sobre)
   * VERSIÓN DE PRUEBA: dark → lighting → desk → approaching, y ahí se
   * congela (ver más abajo). Puramente secuencial y basada en estados:
   * cada paso solo mueve body[data-state] hacia adelante; las animaciones
   * en sí (revelado de luz, cámara acercándose) viven en styles.css,
   * salvo el iris de #sceneReveal que anima iniciarRevelacionDeLuz().
   * ------------------------------------------------------------------ */

  function habilitarSello() {
    if (!sealBtn) {
      // Si esto llegara a imprimirse, sealBtn no existía cuando se pidió
      // el getElementById de más arriba (ver referencias del DOM): el
      // click nunca podría funcionar. No debería pasar (el <script> está
      // al final del <body>, después del botón), pero se deja el chequeo
      // explícito en vez de fallar en silencio.
      console.warn("[Rainbowland] habilitarSello(): #sealBtn no existe en el DOM");
      return;
    }
    // Basta con esto: la visibilidad de #tapHint depende únicamente de
    // body[data-state="sealed"] en styles.css, no de estilos puestos a
    // mano desde JS (eso solo agrega otro lugar donde algo puede quedar
    // desincronizado).
    sealBtn.disabled = false;
    console.log("SELLO HABILITADO");
  }

  // prefers-reduced-motion NUNCA saltea la intro cinematográfica: la persona
  // sigue viendo oscuridad → luz → mesa → acercamiento → carta levantándose,
  // en ese orden. Lo único que cambia es que cada fase dura menos (los
  // movimientos grandes de cámara y de la carta también se acortan en
  // styles.css, dentro de @media (prefers-reduced-motion: reduce)).
  const FACTOR_REDUCIDO = 0.45;
  const ESPERA_MINIMA = 150;

  function espera(ms) {
    if (!prefersReducedMotion) return ms;
    return Math.max(ESPERA_MINIMA, Math.round(ms * FACTOR_REDUCIDO));
  }

  function iniciarEscenaCinematica() {
    if (!MOSTRAR_INTRO_CINEMATICA) {
      // Solo para comparar/depurar: se omite toda la intro y se arranca
      // directo en "sealed", como en la versión anterior del proyecto.
      setState("sealed");
      habilitarSello();
      return;
    }

    setState("dark"); // ESTADO 1 — pantalla completamente negra (2s)

    window.setTimeout(function () {
      setState("lighting"); // ESTADO 2 — se enciende la vela: la luz revela la mesa
      iniciarRevelacionDeLuz(espera(TIEMPOS.lightingRise));

      window.setTimeout(function () {
        setState("desk"); // ESTADO 3 — se observa la mesa completa, con la carta apoyada

        window.setTimeout(function () {
          setState("approaching"); // ESTADO 4 — la cámara se acerca a la carta

          // BUG que impedía que funcionara todo lo que sigue: esta versión
          // se quedaba "congelada" acá a propósito (era una prueba visual
          // de solo la intro) y el resto de la secuencia — pasar a
          // "sealed", habilitar el sello, etc. — quedaba comentado más
          // abajo, sin ejecutarse NUNCA. Por eso sealBtn.disabled nunca
          // pasaba a false (seguía true por default, como en el HTML) y
          // #tapHint nunca aparecía: no es que algo fallara al hacer
          // click, es que la cadena de setTimeout ni siquiera llegaba a
          // "sealed". Se saltea "lifting" a propósito (no se pidió ninguna
          // animación de mano levantando la carta): al terminar
          // "approaching" se pasa directo a "sealed".
          window.setTimeout(function () {
            setState("sealed"); // ESTADO 5 — la carta espera, sello habilitado
            habilitarSello();
          }, espera(TIEMPOS.approaching));
        }, espera(TIEMPOS.deskHold));
      }, espera(TIEMPOS.lightingRise));
    }, espera(TIEMPOS.darkHold));
  }

  /* ------------------------------------------------------------------
   * SECUENCIA DE APERTURA
   * ------------------------------------------------------------------ */

  function mostrarSusurro() {
    whisper.textContent = FRASE_APERTURA;
    requestAnimationFrame(function () {
      whisper.classList.add("is-visible");
    });
  }

  function ocultarSusurro() {
    whisper.classList.remove("is-visible");
  }

  function prepararLecturaParaAsistivos() {
    reading.removeAttribute("aria-hidden");
    scene.setAttribute("aria-hidden", "true");
  }

  function enfocarTitulo() {
    if (!titleMain) return;
    titleMain.setAttribute("tabindex", "-1");
    try {
      titleMain.focus({ preventScroll: true });
    } catch (e) {
      titleMain.focus();
    }
  }

  function iniciarSecuenciaCompleta() {
    // Log de depuración pedido explícitamente: se imprime SIEMPRE que se
    // hace click/Enter/Espacio sobre el sello, incluso si el guard de
    // abajo corta la ejecución — así se puede distinguir "el click no
    // llega" de "el click llega pero el sello todavía está deshabilitado".
    console.log("CLICK SELLO", "(hasOpened=" + hasOpened + ", disabled=" + sealBtn.disabled + ")");

    // sealBtn.disabled cubre tanto los toques repetidos como cualquier
    // intento de abrir el sello mientras todavía corre la intro
    // cinematográfica (dark/lighting/desk/approaching/lifting).
    if (hasOpened || sealBtn.disabled) return;
    hasOpened = true;
    sealBtn.disabled = true;
    sealBtn.setAttribute("aria-label", "Abriendo la carta");

    if (prefersReducedMotion) {
      // Movimiento mínimo: vamos directo a lectura con una transición corta.
      reproducirSonido(sndSello);
      setState("revealing");
      prepararLecturaParaAsistivos();
      window.setTimeout(function () {
        setState("reading");
        marcarComoAbierto();
        enfocarTitulo();
      }, 250);
      return;
    }

    // Fase 0 — susurro
    mostrarSusurro();

    window.setTimeout(function () {
      // Fase 1 — el sello se agrieta
      setState("breaking");
      sealBtn.classList.add("is-cracking");
      reproducirSonido(sndSello);

      window.setTimeout(function () {
        ocultarSusurro();
        // el sello se desprende
        sealBtn.classList.add("is-detaching");

        window.setTimeout(function () {
          // Fase 2 — se abre la solapa
          setState("opening");

          window.setTimeout(function () {
            // Fase 3 — la hoja sale y crece hacia el lector
            reproducirSonido(sndPapel);
            setState("revealing");
            prepararLecturaParaAsistivos();

            window.setTimeout(function () {
              setState("reading");
              marcarComoAbierto();
              enfocarTitulo();
            }, TIEMPOS.letterRise + TIEMPOS.toReadingDelay);
          }, TIEMPOS.flapOpenDelay);
        }, TIEMPOS.sealDetach);
      }, TIEMPOS.whisperHold);
    }, TIEMPOS.whisperFadeIn);
  }

  /* ------------------------------------------------------------------
   * MODO DIRECTO (visita repetida, REPETIR_ANIMACION = false)
   * ------------------------------------------------------------------ */

  function mostrarPrologoDirectamente() {
    hasOpened = true;
    scene.style.display = "none";
    scene.setAttribute("aria-hidden", "true");
    reading.removeAttribute("aria-hidden");
    body.setAttribute("data-state", "reading");
  }

  /* ------------------------------------------------------------------
   * INTERACCIÓN TÁCTIL: evitar doble-tap-zoom accidental sobre el sello
   * mientras se dispara la secuencia, sin desactivar el zoom del resto
   * de la página (importante para accesibilidad).
   * ------------------------------------------------------------------ */

  function initTapProtegido() {
    let ultimoToque = 0;

    sealBtn.addEventListener(
      "touchend",
      function (evento) {
        const ahora = Date.now();
        if (ahora - ultimoToque < 350) {
          evento.preventDefault();
        }
        ultimoToque = ahora;
      },
      { passive: false }
    );

    sealBtn.addEventListener("touchstart", function () {
      sealBtn.classList.add("is-pressed");
    });
    sealBtn.addEventListener("touchend", function () {
      sealBtn.classList.remove("is-pressed");
    });
    sealBtn.addEventListener("touchcancel", function () {
      sealBtn.classList.remove("is-pressed");
    });
    sealBtn.addEventListener("mousedown", function () {
      sealBtn.classList.add("is-pressed");
    });
    window.addEventListener("mouseup", function () {
      sealBtn.classList.remove("is-pressed");
    });
  }

  

  /* ------------------------------------------------------------------
   * INICIALIZACIÓN
   * ------------------------------------------------------------------ */

  function init() {
    iniciarMusicaFondo();
    initSealEmblem();
    initTapProtegido();

    sealBtn.addEventListener("click", iniciarSecuenciaCompleta);
    sealBtn.addEventListener(
      "keydown",
      function (evento) {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          iniciarSecuenciaCompleta();
        }
      }
    );

    if (!REPETIR_ANIMACION && yaFueAbiertoAntes()) {
      // Modo B con visita repetida: se salta tanto la intro cinematográfica
      // como la apertura del sobre, directo al prólogo.
      mostrarPrologoDirectamente();
    } else {
      iniciarEscenaCinematica();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


(function () {
  "use strict";


  const REPETIR_ANIMACION = true;

  const MOSTRAR_INTRO_CINEMATICA = true;

  const FRASE_APERTURA = "Hay historias que esperan años para ser contadas.";

  const STORAGE_KEY = "rainbowland_prologo_abierto";

  const MODO_DEBUG_INTRO = false;

  const INTRO_DEBUG = {
    darkHold: 1500,
    lightingRise: 2500,
    deskHold: 2500,
    approaching: 3000,
    lifting: 2000,
  };

  const TIEMPOS = {
    darkHold: 2000,
    lightingRise: 2000,
    deskHold: 2500,
    approaching: 4500,
    boxApproaching: 4500,
    liftingDelay: 150,
    lifting: 1300,
    toSealedDelay: 300,

    whisperFadeIn: 120,
    whisperHold: 1000,
    crackAppear: 520,
    sealDetach: 560,
    flapOpenDelay: 120,
    flapOpen: 1150,
    letterRiseDelay: 250,
    letterRise: 1300,
    toReadingDelay: 250,
  };

  if (MODO_DEBUG_INTRO) {
    Object.assign(TIEMPOS, INTRO_DEBUG);
  }


  const body = document.body;
  const sealBtn = document.getElementById("sealBtn");
  const sealEmblem = document.getElementById("sealEmblem");
  const whisper = document.getElementById("whisper");
  const scene = document.getElementById("scene");
  const sceneReveal = document.getElementById("sceneReveal");
  const reading = document.getElementById("reading");
  const titleMain = document.getElementById("titleMain");
  const musicaFondo = document.getElementById("musicaFondo");
  const musicaCapitulos = document.getElementById("musicaCapitulos");
  const sndSello = document.getElementById("sndSello");
  const sndPapel = document.getElementById("sndPapel");

  const envelopeStage = document.getElementById("envelopeStage");
  const boxStage = document.getElementById("boxStage");
  const boxArt = document.getElementById("boxArt");

  const boxCardsHotspot = document.getElementById("boxCardsHotspot");
  const boxBackToDesk = document.getElementById("boxBackToDesk");
  const boxIndex = document.getElementById("boxIndex");
  const boxIndexBack = document.getElementById("boxIndexBack");
  const boxIndexPages = document.getElementById("boxIndexPages");
  const boxIndexPrev = document.getElementById("boxIndexPrev");
  const boxIndexNext = document.getElementById("boxIndexNext");
  const boxIndexPagerLabel = document.getElementById("boxIndexPagerLabel");
  const chapterReading = document.getElementById("chapterReading");
  const chapterReadingBack = document.getElementById("chapterReadingBack");
  const chapterPages = document.getElementById("chapterPages");
  const prologueBackToDesk = document.getElementById("prologueBackToDesk");

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let hasOpened = false;

  const ESTADOS = [
    "dark",
    "lighting",
    "desk",
    "approaching",
    "lifting",
    "sealed",
    "breaking",
    "opening",
    "revealing",
    "reading",
    "boxApproaching",
    "boxOpen",
    "chapterReading",
  ];

  function setState(nombre) {
    if (ESTADOS.indexOf(nombre) === -1) {
      console.warn("[Rainbowland] Estado desconocido, ignorado:", nombre);
      return;
    }
    body.setAttribute("data-state", nombre);
    console.log("ESTADO:", nombre);
  }

  function registrarEvento(evento, datosExtra) {
    try {
      if (window.PRTracking && typeof window.PRTracking.track === "function") {
        window.PRTracking.track(evento, datosExtra);
      }
    } catch (e) {
    }
  }


  function marcarComoAbierto() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
    }
  }

  function yaFueAbiertoAntes() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  window.resetRainbowland = function resetRainbowland() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
    }
    console.info(
      "[Rainbowland] Estado reiniciado. Recargá la página para ver la carta sellada nuevamente."
    );
  };


  function initSealEmblem() {
    if (!sealEmblem) return;
    sealEmblem.addEventListener("error", function () {
      sealEmblem.style.display = "none";
    });
    const src = sealEmblem.getAttribute("data-src");
    if (src) sealEmblem.src = src;
  }


  const VOLUMEN_MUSICA = 0.28;
  const DURACION_CROSSFADE = 2200;
  const fadesMusica = new WeakMap();

  function reproducirAudioSeguro(audio) {
    if (!audio) return;
    try {
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
        });
      }
    } catch (e) {
    }
  }

  function cancelarFade(audio) {
    if (!audio) return;
    const id = fadesMusica.get(audio);
    if (id) {
      cancelAnimationFrame(id);
      fadesMusica.delete(audio);
    }
  }

  function fadeMusica(audio, volumenDestino, duracion, pausarAlFinal) {
    if (!audio) return;
    cancelarFade(audio);

    const inicio = performance.now();
    const volumenInicial = Number.isFinite(audio.volume) ? audio.volume : 0;
    const destino = Math.max(0, Math.min(1, volumenDestino));

    if (destino > 0 && audio.paused) reproducirAudioSeguro(audio);

    function cuadro(ahora) {
      const t = Math.min(1, (ahora - inicio) / Math.max(1, duracion));
      const suavizado = t * t * (3 - 2 * t);
      audio.volume = volumenInicial + (destino - volumenInicial) * suavizado;

      if (t < 1) {
        const id = requestAnimationFrame(cuadro);
        fadesMusica.set(audio, id);
      } else {
        fadesMusica.delete(audio);
        audio.volume = destino;
        if (pausarAlFinal && destino === 0) {
          try { audio.pause(); } catch (e) {  }
        }
      }
    }

    const id = requestAnimationFrame(cuadro);
    fadesMusica.set(audio, id);
  }

  function usarMusicaFondo() {
    if (musicaFondo) {
      musicaFondo.loop = true;
      if (musicaFondo.paused) reproducirAudioSeguro(musicaFondo);
      fadeMusica(musicaFondo, VOLUMEN_MUSICA, DURACION_CROSSFADE, false);
    }
    if (musicaCapitulos) {
      musicaCapitulos.loop = true;
      fadeMusica(musicaCapitulos, 0, DURACION_CROSSFADE, true);
    }
  }

  function usarMusicaCapitulos() {
    if (musicaCapitulos) {
      musicaCapitulos.loop = true;
      if (musicaCapitulos.paused) reproducirAudioSeguro(musicaCapitulos);
      fadeMusica(musicaCapitulos, VOLUMEN_MUSICA, DURACION_CROSSFADE, false);
    }
    if (musicaFondo) {
      fadeMusica(musicaFondo, 0, DURACION_CROSSFADE, true);
    }
  }

  function iniciarMusicaFondo() {
    if (musicaFondo) {
      musicaFondo.loop = true;
      musicaFondo.volume = VOLUMEN_MUSICA;
    }
    if (musicaCapitulos) {
      musicaCapitulos.loop = true;
      musicaCapitulos.volume = 0;
    }

    function musicaCorrespondiente() {
      const estado = body.getAttribute("data-state");
      if (estado === "boxApproaching" || estado === "boxOpen" || estado === "chapterReading") {
        return musicaCapitulos;
      }
      return musicaFondo;
    }

    function quitarDesbloqueo() {
      document.removeEventListener("touchend", intentarReproducir, true);
      document.removeEventListener("pointerup", intentarReproducir, true);
      document.removeEventListener("click", intentarReproducir, true);
      document.removeEventListener("keydown", intentarReproducir, true);
    }

    function intentarReproducir() {
      const estado = body.getAttribute("data-state");

      if (estado === "boxApproaching" || estado === "boxOpen" || estado === "chapterReading") {
        usarMusicaCapitulos();
      } else {
        usarMusicaFondo();
      }

      const audioObjetivo = musicaCorrespondiente();
      if (!audioObjetivo) {
        quitarDesbloqueo();
        return;
      }

      window.setTimeout(function () {
        if (!audioObjetivo.paused) quitarDesbloqueo();
      }, 0);
    }

    intentarReproducir();

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
        });
      }
    } catch (e) {
    }
  }


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

  function easeInCubic(t) {
    return t * t * t;
  }

  function iniciarRevelacionDeLuz(duracionMs) {
    if (!sceneReveal) return;
    if (revelacionRAF) cancelAnimationFrame(revelacionRAF);

    const radioMaximo = Math.hypot(window.innerWidth, window.innerHeight) * 1.05;
    const radioInicial = Math.max(4, radioMaximo * 0.006);
    const inicio = Date.now();

    sceneReveal.style.opacity = "1";

    function cuadro() {
      const transcurrido = Date.now() - inicio;
      const t = Math.min(1, duracionMs > 0 ? transcurrido / duracionMs : 1);
      const avance = easeInCubic(t);
      const radio = radioInicial + (radioMaximo - radioInicial) * avance;
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
        window.setTimeout(function () {
          sceneReveal.style.opacity = "0";
        }, 60);
      }
    }

    revelacionRAF = requestAnimationFrame(cuadro);
  }


  function habilitarSello() {
    if (!sealBtn) {
      console.warn("[Rainbowland] habilitarSello(): #sealBtn no existe en el DOM");
      return;
    }
    sealBtn.disabled = false;
    console.log("SELLO HABILITADO");
  }

  const FACTOR_REDUCIDO = 0.45;
  const ESPERA_MINIMA = 150;

  function espera(ms) {
    if (!prefersReducedMotion) return ms;
    return Math.max(ESPERA_MINIMA, Math.round(ms * FACTOR_REDUCIDO));
  }

  function iniciarEscenaCinematica() {
    if (!MOSTRAR_INTRO_CINEMATICA) {
      setState("desk");
      habilitarInteraccionMesa();
      return;
    }

    setState("dark");

    window.setTimeout(function () {
      setState("lighting");
      iniciarRevelacionDeLuz(espera(TIEMPOS.lightingRise));

      window.setTimeout(function () {
        setState("desk");

        habilitarInteraccionMesa();
      }, espera(TIEMPOS.lightingRise));
    }, espera(TIEMPOS.darkHold));
  }


  let mesaResuelta = false;

  function habilitarInteraccionMesa() {
    mesaResuelta = false;
    if (envelopeStage) envelopeStage.setAttribute("aria-disabled", "false");
    if (boxStage) boxStage.setAttribute("aria-disabled", "false");
  }

  function deshabilitarInteraccionMesa() {
    if (envelopeStage) envelopeStage.setAttribute("aria-disabled", "true");
    if (boxStage) boxStage.setAttribute("aria-disabled", "true");
  }

  function iniciarZoomCarta() {
    if (mesaResuelta || body.getAttribute("data-state") !== "desk") return;
    mesaResuelta = true;
    deshabilitarInteraccionMesa();
    usarMusicaFondo();

    setState("approaching");

    window.setTimeout(function () {
      setState("sealed");
      habilitarSello();
    }, espera(TIEMPOS.approaching));
  }

  function iniciarZoomCaja() {
    if (mesaResuelta || body.getAttribute("data-state") !== "desk") return;
    mesaResuelta = true;
    deshabilitarInteraccionMesa();

    if (musicaCapitulos) {
      cancelarFade(musicaCapitulos);
      musicaCapitulos.loop = true;
      musicaCapitulos.volume = 0;
      reproducirAudioSeguro(musicaCapitulos);
    }

    setState("boxApproaching");

    window.setTimeout(function () {
      setState("boxOpen");
      if (boxArt) {
        boxArt.src = "assets/caja-abierta.png";
      }

      usarMusicaCapitulos();

      habilitarCartasDeLaCaja();
      registrarEvento("box_open");
    }, espera(TIEMPOS.boxApproaching));
  }

  function initInteraccionMesa() {
    if (envelopeStage) {
      envelopeStage.addEventListener("click", iniciarZoomCarta);
      envelopeStage.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          iniciarZoomCarta();
        }
      });
    }

    if (boxStage) {
      boxStage.addEventListener("click", iniciarZoomCaja);
      boxStage.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          iniciarZoomCaja();
        }
      });
    }
  }




  function ahoraCapitulos() {
    return Date.now();
  }

  const ROMANOS_CAPITULOS = [
    "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
    "IX", "X", "XI", "XII", "XIII", "XIV", "XV",
  ];

  const ORDINALES_CAPITULOS = [
    "PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO",
    "SEXTO", "SÉPTIMO", "OCTAVO", "NOVENO", "DÉCIMO",
    "UNDÉCIMO", "DUODÉCIMO", "DECIMOTERCERO", "DECIMOCUARTO", "DECIMOQUINTO",
  ];


  const CAPITULOS_BACKEND_URL = "https://script.google.com/macros/s/AKfycbxNkP8OKmKx8dBGTPItqtMR2ICWiWSjtvshlAI5L1Cs-OWExIvAcA0Y7_GDOO1bPO17/exec";

  const capitulos = [
    { numero: 1, fecha: "2026-09-12T15:00:00-03:00" },
    { numero: 2, fecha: "2026-09-19T15:00:00-03:00" },
    { numero: 3, fecha: "2026-09-26T15:00:00-03:00" },
    { numero: 4, fecha: "2026-10-03T15:00:00-03:00" },
    { numero: 5, fecha: "2026-10-10T15:00:00-03:00" },
    { numero: 6, fecha: "2026-10-17T15:00:00-03:00" },
    { numero: 7, fecha: "2026-10-24T15:00:00-03:00" },
    { numero: 8, fecha: "2026-10-31T15:00:00-03:00" },
    { numero: 9, fecha: "2026-11-07T15:00:00-03:00" },
    { numero: 10, fecha: "2026-11-14T15:00:00-03:00" },
    { numero: 11, fecha: "2026-11-21T15:00:00-03:00" },
    { numero: 12, fecha: "2026-11-28T15:00:00-03:00" },
    { numero: 13, fecha: "2026-12-05T15:00:00-03:00" },
    { numero: 14, fecha: "2026-12-12T15:00:00-03:00" },
    { numero: 15, fecha: "2026-12-19T15:00:00-03:00" },
  ];

  function calcularEstadoCapitulos() {
    const ahora = ahoraCapitulos();
    let proximoYaAsignado = false;
    return capitulos.map(function (cap) {
      const fechaMs = new Date(cap.fecha).getTime();
      let estado;
      if (fechaMs <= ahora) {
        estado = "disponible";
      } else if (!proximoYaAsignado) {
        estado = "proximo";
        proximoYaAsignado = true;
      } else {
        estado = "sellado";
      }
      return {
        numero: cap.numero,
        fecha: cap.fecha,
        fechaMs: fechaMs,
        estado: estado,
      };
    });
  }

  function formatoContadorCapitulo(diferenciaMs) {
    if (diferenciaMs <= 0) return "";
    const segundosTotales = Math.floor(diferenciaMs / 1000);
    const dias = Math.floor(segundosTotales / 86400);
    const horas = Math.floor((segundosTotales % 86400) / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;
    return (
      dias + " días · " +
      String(horas).padStart(2, "0") + " horas · " +
      String(minutos).padStart(2, "0") + " minutos · " +
      String(segundos).padStart(2, "0") + " segundos"
    );
  }


  const CAPITULOS_POR_PAGINA = 5;
  let boxIndexPaginaActual = 0;
  let ultimoResumenEstados = null;

  function resumenEstados(estados) {
    return estados.map(function (c) { return c.numero + ":" + c.estado; }).join(",");
  }

  function crearChapterTile(cap) {
    const romano = ROMANOS_CAPITULOS[cap.numero - 1] || String(cap.numero);
    const ordinal = ORDINALES_CAPITULOS[cap.numero - 1] || "";

    const article = document.createElement("article");
    article.className = "chapter-tile chapter-tile--" + cap.estado;
    article.setAttribute("data-numero", String(cap.numero));

    let interior =
      '<span class="chapter-tile-seal" aria-hidden="true">' +
        '<span class="chapter-tile-numero">' + romano + "</span>" +
      "</span>" +
      '<h3 class="chapter-tile-heading">Capítulo ' + ordinal + "</h3>";

    if (cap.estado === "disponible") {
      interior += '<p class="chapter-tile-estado">Disponible</p>';
      article.tabIndex = 0;
      article.setAttribute("role", "button");
      article.setAttribute("aria-label", "Leer capítulo " + romano);
    } else if (cap.estado === "proximo") {
      interior +=
        '<p class="chapter-tile-mensaje">Esta carta llegará en…</p>' +
        '<p class="chapter-tile-contador" data-numero="' + cap.numero + '">' +
          formatoContadorCapitulo(cap.fechaMs - ahoraCapitulos()) +
        "</p>";
      article.setAttribute("aria-label", "Capítulo " + romano + ", todavía sellado, en camino");
    } else {
      interior += '<p class="chapter-tile-mensaje">Esta carta aún permanece sellada.</p>';
      article.setAttribute("aria-label", "Capítulo " + romano + ", sellado");
    }

    article.innerHTML = interior;

    if (cap.estado === "disponible") {
      const abrir = function () { abrirCapitulo(cap.numero); };
      article.addEventListener("click", abrir);
      article.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          abrir();
        }
      });
    }

    return article;
  }

  function renderBoxIndex() {
    if (!boxIndexPages) return;
    const estados = calcularEstadoCapitulos();
    ultimoResumenEstados = resumenEstados(estados);

    const totalPaginas = Math.ceil(capitulos.length / CAPITULOS_POR_PAGINA);
    if (boxIndexPaginaActual >= totalPaginas) boxIndexPaginaActual = totalPaginas - 1;
    if (boxIndexPaginaActual < 0) boxIndexPaginaActual = 0;

    boxIndexPages.innerHTML = "";
    for (let p = 0; p < totalPaginas; p++) {
      const pagina = document.createElement("div");
      pagina.className = "box-index-page";
      pagina.setAttribute("data-pagina", String(p));
      if (p !== boxIndexPaginaActual) pagina.hidden = true;

      const inicio = p * CAPITULOS_POR_PAGINA;
      estados.slice(inicio, inicio + CAPITULOS_POR_PAGINA).forEach(function (cap) {
        pagina.appendChild(crearChapterTile(cap));
      });
      boxIndexPages.appendChild(pagina);
    }

    if (boxIndexPagerLabel) {
      const romanoPagina = ROMANOS_CAPITULOS[boxIndexPaginaActual] || String(boxIndexPaginaActual + 1);
      const romanoTotal = ROMANOS_CAPITULOS[totalPaginas - 1] || String(totalPaginas);
      boxIndexPagerLabel.textContent = "Página " + romanoPagina + " de " + romanoTotal;
    }
    if (boxIndexPrev) boxIndexPrev.disabled = boxIndexPaginaActual === 0;
    if (boxIndexNext) boxIndexNext.disabled = boxIndexPaginaActual >= totalPaginas - 1;
  }

  function mostrarPaginaIndice(numeroPagina) {
    boxIndexPaginaActual = numeroPagina;
    renderBoxIndex();
  }

  function tickBoxIndex() {
    if (!boxIndex || !boxIndex.classList.contains("is-open")) return;
    const estados = calcularEstadoCapitulos();
    const resumen = resumenEstados(estados);
    if (resumen !== ultimoResumenEstados) {
      renderBoxIndex();
      return;
    }
    const proximo = estados.find(function (c) { return c.estado === "proximo"; });
    if (!proximo || !boxIndexPages) return;
    const contadorEl = boxIndexPages.querySelector(
      '.chapter-tile-contador[data-numero="' + proximo.numero + '"]'
    );
    if (contadorEl) {
      contadorEl.textContent = formatoContadorCapitulo(proximo.fechaMs - ahoraCapitulos());
    }
  }

  window.setInterval(tickBoxIndex, 1000);


  function habilitarCartasDeLaCaja() {
    if (boxCardsHotspot) boxCardsHotspot.disabled = false;
  }

  function deshabilitarCartasDeLaCaja() {
    if (boxCardsHotspot) boxCardsHotspot.disabled = true;
  }

  function abrirBoxIndex(paginaInicial) {
    if (body.getAttribute("data-state") !== "boxOpen") return;
    boxIndexPaginaActual = typeof paginaInicial === "number" ? paginaInicial : 0;
    renderBoxIndex();
    if (boxIndex) {
      boxIndex.classList.add("is-open");
      boxIndex.removeAttribute("aria-hidden");
    }
    if (boxStage) boxStage.classList.add("is-dimmed");
    deshabilitarCartasDeLaCaja();
  }

  function cerrarBoxIndex() {
    if (boxIndex) {
      boxIndex.classList.remove("is-open");
      boxIndex.setAttribute("aria-hidden", "true");
    }
    if (boxStage) boxStage.classList.remove("is-dimmed");
    if (body.getAttribute("data-state") === "boxOpen") {
      habilitarCartasDeLaCaja();
    }
  }

  function volverALaMesaDesdeCaja() {
    if (body.getAttribute("data-state") !== "boxOpen") return;
    registrarEvento("return_desk");
    cerrarBoxIndex();
    if (boxArt) boxArt.src = "assets/caja-cerrada.png";
    deshabilitarCartasDeLaCaja();
    usarMusicaFondo();
    setState("desk");
    habilitarInteraccionMesa();
  }


  function crearHojaCapitulo(numero) {
    const page = document.createElement("article");
    page.className = "page";
    page.setAttribute("data-page", String(numero));
    page.innerHTML =
      '<div class="page-corner page-corner--tl" aria-hidden="true">❦</div>' +
      '<div class="page-corner page-corner--tr" aria-hidden="true">❦</div>' +
      '<div class="page-corner page-corner--bl" aria-hidden="true">❦</div>' +
      '<div class="page-corner page-corner--br" aria-hidden="true">❦</div>' +
      '<div class="page-content"></div>' +
      '<div class="page-number" aria-hidden="true">' + numero + "</div>";
    return page;
  }

  function paginarHojaCapitulo(fuenteHTML) {
    if (!chapterPages) return;
    chapterPages.innerHTML = "";

    const fuente = document.createElement("div");
    fuente.innerHTML = fuenteHTML;
    const elementos = Array.from(fuente.children);

    let numeroPagina = 1;
    let page = crearHojaCapitulo(numeroPagina);
    chapterPages.appendChild(page);
    let contenido = page.querySelector(".page-content");

    elementos.forEach(function (elemento) {
      contenido.appendChild(elemento);
      if (contenido.scrollHeight > contenido.clientHeight + 1) {
        contenido.removeChild(elemento);
        numeroPagina += 1;
        page = crearHojaCapitulo(numeroPagina);
        chapterPages.appendChild(page);
        contenido = page.querySelector(".page-content");
        contenido.appendChild(elemento);
      }
    });
  }

  function repaginarCapituloConEspera(fuenteHTML) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        paginarHojaCapitulo(fuenteHTML);
      });
    });
  }

  function construirHTMLCapitulo(cap) {
    const romano = ROMANOS_CAPITULOS[cap.numero - 1] || String(cap.numero);
    const tituloHTML = cap.titulo
      ? '<p class="chapter-reading-titulo">' + cap.titulo + "</p>"
      : "";
    return (
      '<h1 class="chapter-reading-numero">' + romano + "</h1>" +
      tituloHTML +
      '<div class="story-divider" aria-hidden="true">❦</div>' +
      cap.contenido
    );
  }

  let boxIndexPaginaDeRetorno = 0;
  let capituloActualHTML = "";

  function pedirCapituloAlBackend(numero) {
    const url = CAPITULOS_BACKEND_URL + "?action=chapter&n=" + encodeURIComponent(numero);
    return fetch(url)
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (data && data.ok && typeof data.contenido === "string" && data.contenido) {
          return { numero: data.numero || numero, titulo: data.titulo || "", contenido: data.contenido };
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function abrirCapitulo(numero) {
    const cap = calcularEstadoCapitulos().find(function (c) { return c.numero === numero; });
    if (!cap || cap.estado !== "disponible") return;

    registrarEvento("chapter_open", { capitulo: numero });

    boxIndexPaginaDeRetorno = boxIndexPaginaActual;

    cerrarBoxIndex();

    capituloActualHTML = construirHTMLCapitulo({ numero: numero, titulo: "", contenido: "<p>Cargando…</p>" });
    repaginarCapituloConEspera(capituloActualHTML);
    setState("chapterReading");

    if (chapterReading) {
      chapterReading.removeAttribute("aria-hidden");
      chapterReading.setAttribute("tabindex", "-1");
      try {
        chapterReading.focus({ preventScroll: true });
      } catch (e) {
        chapterReading.focus();
      }
    }
    if (scene) scene.setAttribute("aria-hidden", "true");

    pedirCapituloAlBackend(numero).then(function (capReal) {
      if (body.getAttribute("data-state") !== "chapterReading") return;

      if (capReal) {
        capituloActualHTML = construirHTMLCapitulo(capReal);
      } else {
        capituloActualHTML = construirHTMLCapitulo({
          numero: numero,
          titulo: "",
          contenido: "<p>No se pudo abrir este capítulo en este momento. Volvé a intentarlo en un rato.</p>",
        });
      }
      repaginarCapituloConEspera(capituloActualHTML);
    });
  }

  function cerrarLecturaCapitulo() {
    if (body.getAttribute("data-state") !== "chapterReading") return;
    if (chapterReading) chapterReading.setAttribute("aria-hidden", "true");
    if (scene) scene.removeAttribute("aria-hidden");
    setState("boxOpen");
    abrirBoxIndex(boxIndexPaginaDeRetorno);
  }

  function volverALaMesaDesdePrologo() {
    if (body.getAttribute("data-state") !== "reading") return;
    registrarEvento("return_desk");

    if (reading) reading.setAttribute("aria-hidden", "true");
    if (scene) {
      scene.style.display = "";
      scene.removeAttribute("aria-hidden");
    }

    hasOpened = false;
    if (sealBtn) {
      sealBtn.disabled = true;
      sealBtn.setAttribute("aria-label", "Abrir la carta");
      sealBtn.classList.remove("is-cracking", "is-detaching");
    }
    if (whisper) whisper.classList.remove("is-visible");
    if (boxArt) boxArt.src = "assets/caja-cerrada.png";
    deshabilitarCartasDeLaCaja();
    usarMusicaFondo();

    setState("desk");
    habilitarInteraccionMesa();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function initCapitulos() {
    if (boxCardsHotspot) {
      boxCardsHotspot.addEventListener("click", function () {
        abrirBoxIndex(0);
      });
    }
    if (boxBackToDesk) {
      boxBackToDesk.addEventListener("click", volverALaMesaDesdeCaja);
    }
    if (boxIndexBack) {
      boxIndexBack.addEventListener("click", cerrarBoxIndex);
    }
    if (boxIndexPrev) {
      boxIndexPrev.addEventListener("click", function () {
        if (boxIndexPaginaActual > 0) mostrarPaginaIndice(boxIndexPaginaActual - 1);
      });
    }
    if (boxIndexNext) {
      boxIndexNext.addEventListener("click", function () {
        const totalPaginas = Math.ceil(capitulos.length / CAPITULOS_POR_PAGINA);
        if (boxIndexPaginaActual < totalPaginas - 1) mostrarPaginaIndice(boxIndexPaginaActual + 1);
      });
    }
    if (chapterReadingBack) {
      chapterReadingBack.addEventListener("click", cerrarLecturaCapitulo);
    }
    if (prologueBackToDesk) {
      prologueBackToDesk.addEventListener("click", volverALaMesaDesdePrologo);
    }

    let resizeTimerCapitulo;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimerCapitulo);
      resizeTimerCapitulo = setTimeout(function () {
        if (body.getAttribute("data-state") === "chapterReading" && capituloActualHTML) {
          paginarHojaCapitulo(capituloActualHTML);
        }
      }, 180);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (body.getAttribute("data-state") === "chapterReading" && capituloActualHTML) {
          paginarHojaCapitulo(capituloActualHTML);
        }
      });
    }
  }


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
    console.log("CLICK SELLO", "(hasOpened=" + hasOpened + ", disabled=" + sealBtn.disabled + ")");

    if (hasOpened || sealBtn.disabled) return;
    hasOpened = true;
    sealBtn.disabled = true;
    sealBtn.setAttribute("aria-label", "Abriendo la carta");

    if (prefersReducedMotion) {
      reproducirSonido(sndSello);
      setState("revealing");
      prepararLecturaParaAsistivos();
      window.setTimeout(function () {
        setState("reading");
        marcarComoAbierto();
        enfocarTitulo();
        registrarEvento("prologue_open");
      }, 250);
      return;
    }

    mostrarSusurro();

    window.setTimeout(function () {
      setState("breaking");
      sealBtn.classList.add("is-cracking");
      reproducirSonido(sndSello);

      window.setTimeout(function () {
        ocultarSusurro();
        sealBtn.classList.add("is-detaching");

        window.setTimeout(function () {
          setState("opening");

          window.setTimeout(function () {
            reproducirSonido(sndPapel);
            setState("revealing");
            prepararLecturaParaAsistivos();

            window.setTimeout(function () {
              setState("reading");
              marcarComoAbierto();
              enfocarTitulo();
              registrarEvento("prologue_open");
            }, TIEMPOS.letterRise + TIEMPOS.toReadingDelay);
          }, TIEMPOS.flapOpenDelay);
        }, TIEMPOS.sealDetach);
      }, TIEMPOS.whisperHold);
    }, TIEMPOS.whisperFadeIn);
  }


  function mostrarPrologoDirectamente() {
    hasOpened = true;
    scene.style.display = "none";
    scene.setAttribute("aria-hidden", "true");
    reading.removeAttribute("aria-hidden");
    body.setAttribute("data-state", "reading");
    registrarEvento("prologue_open");
  }


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




  function init() {
    iniciarMusicaFondo();
    initSealEmblem();
    initTapProtegido();
    initInteraccionMesa();
    initCapitulos();

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

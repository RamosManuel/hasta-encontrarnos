(function () {
  "use strict";

  var TRACKING_ENDPOINT = "https://script.google.com/macros/s/AKfycbxNkP8OKmKx8dBGTPItqtMR2ICWiWSjtvshlAI5L1Cs-OWExIvAcA0Y7_GDOO1bPO17/exec";

  var MARCA_STORAGE_KEY = "pr_v";

  function capturarMarcaSiCorresponde() {
    try {
      var params = new URLSearchParams(window.location.search);
      var valor = params.get("v");
      if (valor) {
        localStorage.setItem(MARCA_STORAGE_KEY, valor);
        params.delete("v");
        var queryRestante = params.toString();
        var nuevaUrl =
          window.location.pathname +
          (queryRestante ? "?" + queryRestante : "") +
          window.location.hash;
        window.history.replaceState({}, document.title, nuevaUrl);
      }
    } catch (e) {
    }
  }

  function obtenerMarca() {
    try {
      return localStorage.getItem(MARCA_STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  capturarMarcaSiCorresponde();

  var SESSION_STORAGE_KEY = "pr_session_id";

  function generarSessionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
    } catch (e) {
    }
    return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function obtenerSessionId() {
    try {
      var id = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!id) {
        id = generarSessionId();
        sessionStorage.setItem(SESSION_STORAGE_KEY, id);
      }
      return id;
    } catch (e) {
      return generarSessionId();
    }
  }

  var sessionId = obtenerSessionId();

  function detectarDispositivo() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua)) return "Tablet";
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return "Móvil";
    return "Escritorio";
  }

  function detectarNavegador() {
    var ua = navigator.userAgent || "";
    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\//.test(ua) || /Opera/.test(ua)) return "Opera";
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    return "Otro";
  }

  var VENTANA_ANTIDUPLICADOS_MS = 1500;
  var ultimoEnvio = { firma: "", cuando: 0 };

  function esDuplicadoReciente(firma) {
    var ahora = Date.now();
    if (firma === ultimoEnvio.firma && (ahora - ultimoEnvio.cuando) < VENTANA_ANTIDUPLICADOS_MS) {
      return true;
    }
    ultimoEnvio = { firma: firma, cuando: ahora };
    return false;
  }

  function enviar(evento, datosExtra) {
    try {
      if (!TRACKING_ENDPOINT || TRACKING_ENDPOINT.indexOf("REEMPLAZAR_CON_TU_ID_DE_IMPLEMENTACION") !== -1 || TRACKING_ENDPOINT.indexOf("REEMPLAZAR") !== -1) {
        return;
      }

      var firma = evento + "|" + JSON.stringify(datosExtra || {});
      if (esDuplicadoReciente(firma)) return;

      var payload = {
        evento: evento,
        marca: obtenerMarca(),
        sessionId: sessionId,
        dispositivo: detectarDispositivo(),
        navegador: detectarNavegador(),
        pagina: window.location.pathname,
        fechaHoraCliente: new Date().toISOString(),
        userAgent: navigator.userAgent || "",
      };
      if (datosExtra) {
        for (var clave in datosExtra) {
          if (Object.prototype.hasOwnProperty.call(datosExtra, clave)) {
            payload[clave] = datosExtra[clave];
          }
        }
      }

      if (typeof fetch !== "function") return;

      fetch(TRACKING_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {
      });
    } catch (e) {
    }
  }

  window.PRTracking = {
    track: enviar,
  };

  var SITE_ENTER_STORAGE_KEY = "pr_site_enter_sent";

  function yaSeEnvioSiteEnterEnEstaSesion() {
    try {
      return sessionStorage.getItem(SITE_ENTER_STORAGE_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function marcarSiteEnterComoEnviado() {
    try {
      sessionStorage.setItem(SITE_ENTER_STORAGE_KEY, "true");
    } catch (e) {
    }
  }

  if (!yaSeEnvioSiteEnterEnEstaSesion()) {
    marcarSiteEnterComoEnviado();
    enviar("site_enter", {});
  }
})();

/**
 * El arranque: pide los horarios, arma el estado, engancha los eventos y manda
 * a pintar. Es el unico modulo que corre solo al cargarse.
 */

import { guardar, recordado } from "./almacen.ts";
import { esDiaElegido, leerHorarios, ultimaEstacion } from "./datos.ts";
import { buscarElementos } from "./elementos.ts";
import { DIAS_SEMANA, horaDe } from "./tiempo.ts";
import { crearVista } from "./vista.ts";
import type { Estado, Horarios, Modo, Opcion } from "./tipos.ts";

/** Relativo a index.html, asi la pagina anda en cualquier subcarpeta. */
const ARCHIVO = "horarios.json";

async function pedirHorarios(): Promise<Horarios> {
  // no-cache no quiere decir "no guardes": revalida contra el servidor y usa
  // la copia local si sigue vigente. Es lo que evita que alguien se quede con
  // los horarios viejos despues de una actualizacion.
  const respuesta = await fetch(ARCHIVO, { cache: "no-cache" });
  if (!respuesta.ok) {
    throw new Error("no se pudieron cargar los horarios (" +
                    respuesta.status + " al pedir " + ARCHIVO + ")");
  }
  return leerHorarios(await respuesta.json());
}

function iniciar(datos: Horarios): void {
  const el = buscarElementos();
  const vista = crearVista(datos, el);

  const estado: Estado = {
    origen: 0,
    destino: ultimaEstacion(datos),
    modo: "salida",
    hora: null,
    dia: "auto",
  };

  function repintar(): void {
    vista.pintar(estado, new Date());
    guardar(estado);
  }

  function opciones(select: HTMLSelectElement, items: readonly Opcion[]): void {
    select.innerHTML = items
      .map((i) => '<option value="' + i.valor + '">' + i.texto + "</option>")
      .join("");
  }

  /** El valor de un <select> de estaciones, o null si no nombra ninguna. */
  function indiceDe(valor: string): number | null {
    const i = Number(valor);
    return Number.isInteger(i) && datos.stations[i] ? i : null;
  }

  function modo(cual: Modo): void {
    estado.modo = cual;
    el.modoSalida.setAttribute("aria-pressed", String(cual === "salida"));
    el.modoLlegada.setAttribute("aria-pressed", String(cual === "llegada"));
    // Al buscar por llegada hace falta una hora concreta: se propone la actual
    // para que el resultado no quede vacio.
    if (cual === "llegada" && estado.hora === null) {
      estado.hora = horaDe(new Date());
      el.hora.value = estado.hora;
    }
    repintar();
  }

  const previo = recordado(datos);
  if (previo.origen !== undefined && previo.destino !== undefined) {
    estado.origen = previo.origen;
    estado.destino = previo.destino;
  }
  if (previo.dia !== undefined) {
    estado.dia = previo.dia;
  }

  const paradas: Opcion[] = datos.stations.map((e, i) => ({
    valor: String(i), texto: e.name,
  }));
  opciones(el.origen, paradas);
  opciones(el.destino, paradas);
  el.origen.value = String(estado.origen);
  el.destino.value = String(estado.destino);

  const hoy = DIAS_SEMANA[new Date().getDay()] ?? "hoy";
  opciones(el.dia, [{ valor: "auto", texto: "Hoy (" + hoy + ")" }].concat(
    datos.dayTypes.map((d) => ({ valor: d.id, texto: d.label })),
  ));
  el.dia.value = estado.dia;

  el.vigencia.textContent = datos.vigencia;
  el.pieFuente.textContent =
    "Datos tomados de " + datos.source + ". Actualizado el " +
    datos.generated + ".";

  el.origen.addEventListener("change", () => {
    const i = indiceDe(el.origen.value);
    if (i === null) { return; }
    estado.origen = i;
    repintar();
  });
  el.destino.addEventListener("change", () => {
    const i = indiceDe(el.destino.value);
    if (i === null) { return; }
    estado.destino = i;
    repintar();
  });
  el.dia.addEventListener("change", () => {
    const elegido = el.dia.value;
    if (esDiaElegido(datos, elegido)) {
      estado.dia = elegido;
      repintar();
    }
  });
  el.hora.addEventListener("change", () => {
    estado.hora = el.hora.value || null;
    repintar();
  });

  el.invertir.addEventListener("click", () => {
    const v = estado.origen;
    estado.origen = estado.destino;
    estado.destino = v;
    el.origen.value = String(estado.origen);
    el.destino.value = String(estado.destino);
    repintar();
  });

  el.ahora.addEventListener("click", () => {
    estado.hora = null;
    el.hora.value = "";
    repintar();
  });

  // Tocar cualquiera de los trenes en pantalla abre sus paradas.
  el.salidas.addEventListener("click", (ev) => {
    if (!(ev.target instanceof Element)) { return; }
    const tarjeta = ev.target.closest(".salida");
    if (!(tarjeta instanceof HTMLElement)) { return; }
    const i = Number(tarjeta.dataset["i"]);
    if (!Number.isInteger(i)) { return; }
    vista.elegir(estado, i);
  });

  el.modoSalida.addEventListener("click", () => { modo("salida"); });
  el.modoLlegada.addEventListener("click", () => { modo("llegada"); });

  repintar();

  // Con la hora en vivo la cuenta regresiva se queda vieja enseguida.
  setInterval(() => {
    if (estado.hora === null) { repintar(); }
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && estado.hora === null) { repintar(); }
  });
}

// Sin catch a proposito: si esto falla, la promesa rechazada llega al
// "unhandledrejection" que index.html engancha antes que este bundle, y el
// cartel de #aviso-js muestra el motivo. Aca no hay nada mejor que hacer.
void pedirHorarios().then(iniciar);

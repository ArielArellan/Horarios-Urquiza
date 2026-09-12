/**
 * Volcar los resultados al documento. Lo unico que guarda de por si es cual
 * de los trenes en pantalla tiene las paradas abiertas.
 */

import { buscar, claveServicio } from "./busqueda.ts";
import { estacion, etiquetaDia, ultimaEstacion } from "./datos.ts";
import { filaParada, tarjetaSalida, vacio } from "./plantillas.ts";
import { hhmm, tipoDeDia } from "./tiempo.ts";
import type { Elementos } from "./elementos.ts";
import type { Estado, Horarios, Resultado, Servicio } from "./tipos.ts";

export interface Vista {
  pintar(estado: Estado, ahora: Date): void;
  elegir(estado: Estado, indice: number): void;
}

export function crearVista(datos: Horarios, el: Elementos): Vista {
  /* Cual de los trenes en pantalla tiene las paradas abiertas. Se recuerda
     por sus horarios y no por su posicion: asi el repintado de la cuenta
     regresiva no le mueve la eleccion al que este mirando. */
  let mostrados: readonly Servicio[] = [];
  let elegido: string | null = null;

  function pintarRecorrido(estado: Estado, servicio: Servicio): void {
    el.recorrido.hidden = false;
    const paso = estado.destino > estado.origen ? 1 : -1;
    const filas: string[] = [];

    for (let i = estado.origen; ; i += paso) {
      const t = servicio.tren[i];
      if (t !== null && t !== undefined) {
        const propia = i === estado.origen || i === estado.destino;
        filas.push(filaParada(
          estacion(datos, i).name, servicio.desp * 1440 + t, propia));
      }
      if (i === estado.destino) { break; }
    }

    el.paradas.innerHTML = filas.join("");
    el.resumen.textContent =
      "Ver las " + filas.length + " paradas del tren de las " +
      hhmm(servicio.sale);
  }

  function pintarSalidas(estado: Estado, resultado: Resultado): void {
    const elegidos = resultado.elegidos;

    if (estado.origen === estado.destino) {
      el.salidas.innerHTML = vacio("Elegí dos estaciones distintas.");
      el.recorrido.hidden = true;
      return;
    }
    if (!elegidos.length) {
      el.salidas.innerHTML = vacio(estado.modo === "llegada"
        ? "No hay trenes que lleguen antes de esa hora."
        : "No hay más trenes en el horario cargado.");
      el.recorrido.hidden = true;
      return;
    }

    // Si el tren que se estaba mirando sigue en la lista, se lo mantiene.
    mostrados = elegidos;
    let sel = 0;
    for (let k = 0; k < elegidos.length; k++) {
      const s = elegidos[k];
      if (s && claveServicio(s) === elegido) { sel = k; break; }
    }
    const actual = elegidos[sel];
    if (!actual) { return; }
    elegido = claveServicio(actual);

    el.salidas.innerHTML = elegidos
      .map((s, i) => tarjetaSalida(s, i, sel, resultado.ref, datos.noteLabel))
      .join("");

    pintarRecorrido(estado, actual);
  }

  function pintar(estado: Estado, ahora: Date): void {
    const haciaLemos = estado.destino > estado.origen;
    el.sentido.textContent = "Sentido " + (haciaLemos
      ? estacion(datos, ultimaEstacion(datos)).name
      : estacion(datos, 0).name);

    const saltos = Math.abs(estado.destino - estado.origen);
    el.detalle.textContent = estado.origen === estado.destino ? "" :
      saltos + (saltos === 1 ? " parada" : " paradas") + " · " +
      etiquetaDia(datos, estado.dia === "auto" ? tipoDeDia(ahora) : estado.dia);

    el.ahora.hidden = estado.hora === null;
    pintarSalidas(estado, buscar(datos, estado, ahora));
  }

  function elegir(estado: Estado, indice: number): void {
    const servicio = mostrados[indice];
    if (!servicio) { return; }
    elegido = claveServicio(servicio);

    const tarjetas = el.salidas.children;
    for (let j = 0; j < tarjetas.length; j++) {
      const tarjeta = tarjetas[j];
      if (!tarjeta) { continue; }
      tarjeta.classList.toggle("salida--elegida", j === indice);
      tarjeta.setAttribute("aria-pressed", String(j === indice));
    }

    pintarRecorrido(estado, servicio);
    el.recorrido.open = true;
  }

  return { pintar: pintar, elegir: elegir };
}

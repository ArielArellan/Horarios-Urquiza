/**
 * Recordar el viaje entre visitas. Todo va envuelto en try/catch porque en
 * modo privado localStorage tira en vez de devolver null.
 */

import { esDiaElegido } from "./datos.ts";
import type { Estado, Horarios, Recordado } from "./tipos.ts";

const CLAVE = "urquiza.viaje";

export function guardar(estado: Estado): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      origen: estado.origen,
      destino: estado.destino,
      dia: estado.dia,
    }));
  } catch {
    /* modo privado: se sigue sin recordar nada */
  }
}

/**
 * Lo guardado, ya validado contra los datos de esta version. Validar el dia
 * no es decorativo: un id que quedo de un build viejo hacia explotar la
 * busqueda, y como se reescribia en cada pintado la pagina quedaba trabada.
 */
export function recordado(datos: Horarios): Partial<Recordado> {
  try {
    const crudo: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    if (typeof crudo !== "object" || crudo === null) { return {}; }

    const guardado = crudo as Record<string, unknown>;
    const salida: Partial<Recordado> = {};

    const origen = guardado["origen"];
    const destino = guardado["destino"];
    if (typeof origen === "number" && datos.stations[origen] &&
        typeof destino === "number" && datos.stations[destino]) {
      salida.origen = origen;
      salida.destino = destino;
    }

    const dia = guardado["dia"];
    if (typeof dia === "string" && esDiaElegido(datos, dia)) {
      salida.dia = dia;
    }

    return salida;
  } catch {
    /* dato invalido: se usan los valores por defecto */
    return {};
  }
}

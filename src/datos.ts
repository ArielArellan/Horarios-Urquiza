/**
 * Acceso a los horarios inyectados. Todo chequeo de clave faltante o indice
 * fuera de rango vive aca, para que el resto del codigo indexe tranquilo.
 */

import type {
  Bloque, DiaElegido, Estacion, Horarios, Sentido, TipoDeDia,
} from "./tipos.ts";

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Valida la forma del horarios.json y lo tipa. Es el unico cast del proyecto.
 *
 * El chequeo es de forma, no campo por campo: la validacion profunda vive en
 * tests/estructura.test.ts, que corre contra el archivo de verdad antes de
 * publicar. Lo que si hace falta en runtime es un error con nombre, porque
 * ahora el JSON llega por la red y puede faltar o venir cortado: el cartel de
 * #aviso-js muestra este mensaje, y es mejor que un "undefined" a mitad de
 * camino.
 */
export function leerHorarios(bruto: unknown): Horarios {
  if (!esObjeto(bruto)) {
    throw new Error("el archivo de horarios llegó vacío");
  }
  const stations = bruto["stations"];
  const dayTypes = bruto["dayTypes"];
  const services = bruto["services"];
  if (!Array.isArray(stations) || stations.length === 0 ||
      !Array.isArray(dayTypes) || dayTypes.length === 0 ||
      !esObjeto(services)) {
    throw new Error("los horarios cargados no tienen la forma esperada");
  }
  return bruto as unknown as Horarios;
}

export function bloqueDe(
  datos: Horarios, tipo: TipoDeDia, sentido: Sentido,
): Bloque {
  const sentidos = datos.services[tipo];
  if (!sentidos) {
    throw new Error("no hay horarios cargados para " + tipo);
  }
  return sentidos[sentido];
}

export function estacion(datos: Horarios, indice: number): Estacion {
  const e = datos.stations[indice];
  if (!e) {
    throw new Error("no existe la estación " + indice);
  }
  return e;
}

export function ultimaEstacion(datos: Horarios): number {
  return datos.stations.length - 1;
}

/** El nombre humano de un tipo de dia. Si no esta, devuelve el id. */
export function etiquetaDia(datos: Horarios, id: DiaElegido): string {
  for (const dia of datos.dayTypes) {
    if (dia.id === id) { return dia.label; }
  }
  return id;
}

export function esTipoDeDia(datos: Horarios, valor: string): valor is TipoDeDia {
  for (const dia of datos.dayTypes) {
    if (dia.id === valor) { return true; }
  }
  return false;
}

/** Valida lo que salio de localStorage o de un <select>. */
export function esDiaElegido(datos: Horarios, valor: string): valor is DiaElegido {
  return valor === "auto" || esTipoDeDia(datos, valor);
}

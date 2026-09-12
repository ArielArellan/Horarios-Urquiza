/** Formato y aritmetica de horarios. Sin DOM y sin reloj propio. */

import type { TipoDeDia } from "./tipos.ts";

export const DIA_MS = 86400000;

/** Empieza en domingo, para indexar directo con Date#getDay(). */
export const DIAS_SEMANA: readonly string[] = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

/** Minutos a "HH:MM". Acepta negativos y valores de mas de un dia. */
export function hhmm(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" +
         String(m % 60).padStart(2, "0");
}

/** Una duracion en minutos, como "1 h 35 min" o "45 min". */
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h ? h + " h " + String(m).padStart(2, "0") + " min" : m + " min";
}

export function tipoDeDia(fecha: Date): TipoDeDia {
  const d = fecha.getDay();
  return d === 0 ? "sunday" : d === 6 ? "saturday" : "weekday";
}

/**
 * "HH:MM" a minutos desde la medianoche, o null si no se entiende. Devolver
 * null en vez de NaN importa: si <input type=time> degrada a texto libre, el
 * llamador se cae a la hora en vivo en lugar de calcular con NaN.
 */
export function minutosDeHora(hora: string): number | null {
  // slice y no split: devuelve string, no string | undefined. Sirve tanto
  // para "HH:MM" como para el "HH:MM:SS" que dan algunos navegadores.
  if (hora.length < 5 || hora.charAt(2) !== ":") { return null; }
  const hh = hora.slice(0, 2);
  const mm = hora.slice(3, 5);
  // Number("") es 0 y Number(" 7") es 7: hay que mirar los digitos.
  if (!esDosDigitos(hh) || !esDosDigitos(mm)) { return null; }
  const h = Number(hh);
  const m = Number(mm);
  if (h > 23 || m > 59) { return null; }
  return h * 60 + m;
}

function esDigito(c: string): boolean {
  return c >= "0" && c <= "9";
}

function esDosDigitos(texto: string): boolean {
  return texto.length === 2 && esDigito(texto.charAt(0)) &&
         esDigito(texto.charAt(1));
}

/** El reloj de una fecha como "HH:MM", para escribir en el <input type=time>. */
export function horaDe(fecha: Date): string {
  return String(fecha.getHours()).padStart(2, "0") + ":" +
         String(fecha.getMinutes()).padStart(2, "0");
}

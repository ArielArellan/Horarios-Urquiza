/**
 * Los pedazos de HTML que se arman por string. Puras: devuelven texto y no
 * tocan el documento, asi se pueden probar sin navegador.
 */

import { duracion, hhmm } from "./tiempo.ts";
import type { Referencia, Servicio } from "./tipos.ts";

export function marbete(clase: "dia" | "nota", texto: string): string {
  return '<span class="marbete marbete--' + clase + '">' + texto + "</span>";
}

/** La cuenta regresiva. Solo tiene sentido con la hora en vivo. */
export function textoCuenta(faltan: number, enVivo: boolean): string {
  if (!enVivo) { return ""; }
  if (faltan <= 0) { return "sale ya"; }
  if (faltan < 60) { return "en " + faltan + " min"; }
  return "en " + duracion(faltan);
}

/**
 * Una tarjeta de salida. `data-i`, `salida--proxima` y `aria-pressed` son el
 * contrato con la delegacion de click y con el CSS.
 */
export function tarjetaSalida(
  s: Servicio, i: number, sel: number, ref: Referencia, notaLabel: string,
): string {
  const cuenta = textoCuenta(s.sale - ref.minutos, ref.enVivo);
  const extras = (s.etiqueta ? marbete("dia", s.etiqueta) : "") +
                 (s.nota ? marbete("nota", notaLabel) : "");

  return '<button type="button" class="salida' +
           (i === 0 ? " salida--proxima" : "") +
           (i === sel ? " salida--elegida" : "") +
         '" data-i="' + i + '" aria-pressed="' + (i === sel) + '">' +
           '<div class="salida__hora">' + hhmm(s.sale) + "</div>" +
           '<div class="salida__tramo">' +
             '<div class="salida__llegada">llega <b>' + hhmm(s.llega) +
               "</b>" + extras + "</div>" +
             '<div class="salida__meta">' +
               duracion(s.llega - s.sale) + " de viaje" +
             "</div>" +
           "</div>" +
           '<div class="cuenta">' + cuenta + "</div>" +
         "</button>";
}

/** Una parada del recorrido. Las puntas del viaje van en negrita. */
export function filaParada(
  nombre: string, minutos: number, propia: boolean,
): string {
  return "<li>" + (propia ? "<b>" + nombre + "</b>" : nombre) +
         "<time>" + hhmm(minutos) + "</time></li>";
}

export function vacio(texto: string): string {
  return '<p class="vacio">' + texto + "</p>";
}

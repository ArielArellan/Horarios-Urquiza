/**
 * Encontrar los trenes que sirven un tramo. Todo puro: la hora entra por
 * parametro (`ahora`) en vez de leerse del reloj, asi se puede probar.
 */

import { bloqueDe } from "./datos.ts";
import { DIA_MS, DIAS_SEMANA, minutosDeHora, tipoDeDia } from "./tiempo.ts";
import type {
  DiaResuelto, Estado, Fila, Horarios, Referencia, Resultado, Sentido, Servicio,
} from "./tipos.ts";

/** Cuantos dias antes y despues del elegido entran en la linea de tiempo. */
const DESDE = -1;
const HASTA = 2;

/**
 * El tipo de dia y una etiqueta corta para un desplazamiento en dias respecto
 * del dia elegido. Con "auto" se usa el calendario real; con un dia fijo se
 * repite ese mismo horario.
 */
export function diaEn(
  estado: Estado, desplazamiento: number, ahora: Date,
): DiaResuelto {
  if (estado.dia === "auto") {
    const fecha = new Date(ahora.getTime() + desplazamiento * DIA_MS);
    return {
      tipo: tipoDeDia(fecha),
      etiqueta: desplazamiento === 0 ? "" :
                desplazamiento === 1 ? "mañana" :
                desplazamiento === -1 ? "ayer" :
                DIAS_SEMANA[fecha.getDay()] ?? "",
    };
  }
  return {
    tipo: estado.dia,
    etiqueta: desplazamiento === 0 ? "" :
              desplazamiento > 0 ? "día siguiente" : "día anterior",
  };
}

/** El minuto de un tren en una estacion. Fuera de rango = no para ahi. */
function minutoEn(tren: Fila, indice: number): number | null {
  const v = tren[indice];
  return v === undefined ? null : v;
}

export function sentidoDe(estado: Estado): Sentido {
  return estado.destino > estado.origen ? "to_lemos" : "to_lacroze";
}

/**
 * Todos los servicios que sirven el tramo, en una linea de tiempo continua que
 * abarca desde el dia anterior hasta dos dias despues. Asi los trenes que
 * cruzan la medianoche y los primeros del dia siguiente entran en la misma
 * comparacion.
 */
export function servicios(
  datos: Horarios, estado: Estado, ahora: Date,
): Servicio[] {
  const sentido = sentidoDe(estado);
  const lista: Servicio[] = [];

  for (let desp = DESDE; desp <= HASTA; desp++) {
    const dia = diaEn(estado, desp, ahora);
    const bloque = bloqueDe(datos, dia.tipo, sentido);
    const anotados = new Set<number>(bloque.noted);

    let i = 0;
    for (const tren of bloque.trains) {
      const sale = minutoEn(tren, estado.origen);
      const llega = minutoEn(tren, estado.destino);
      if (sale !== null && llega !== null) {
        lista.push({
          sale: desp * 1440 + sale,
          llega: desp * 1440 + llega,
          etiqueta: dia.etiqueta,
          nota: anotados.has(i),
          tren: tren,
          desp: desp,
        });
      }
      i++;
    }
  }

  lista.sort((a, b) => a.sale - b.sale);
  return lista;
}

export function referencia(estado: Estado, ahora: Date): Referencia {
  if (estado.hora !== null) {
    const minutos = minutosDeHora(estado.hora);
    if (minutos !== null) {
      return { minutos: minutos, enVivo: false };
    }
    // Hora ilegible (por ejemplo un <input type=time> degradado a texto):
    // mejor el reloj que calcular con NaN.
  }
  return {
    minutos: ahora.getHours() * 60 + ahora.getMinutes(),
    enVivo: true,
  };
}

export function buscar(
  datos: Horarios, estado: Estado, ahora: Date,
): Resultado {
  const ref = referencia(estado, ahora);
  const lista = servicios(datos, estado, ahora);

  if (estado.modo === "llegada") {
    const llegan = lista.filter((s) => s.llega <= ref.minutos);
    // Todos llegan antes de la hora pedida: primero el más justo y después
    // hacia atrás, hasta el que deja con más tiempo de sobra.
    llegan.sort((a, b) => b.llega - a.llega);
    return { ref: ref, elegidos: llegan.slice(0, 3) };
  }

  const salen = lista.filter((s) => s.sale >= ref.minutos);
  return { ref: ref, elegidos: salen.slice(0, 3) };
}

/**
 * Identidad estable de un servicio, para recordar cual esta abierto cuando la
 * cuenta regresiva repinta la lista.
 */
export function claveServicio(s: Servicio): string {
  return s.desp + "-" + s.sale + "-" + s.llega;
}

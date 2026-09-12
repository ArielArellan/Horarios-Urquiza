/**
 * Horarios de juguete: cinco estaciones A..E de "Lacroze" a "Lemos".
 *
 * Esta tipado como Horarios a proposito, asi el fixture mismo se chequea
 * contra el esquema. Las filas estan elegidas para pegarle a cada rama:
 *   0: tren normal, para en todas
 *   1: no para en C (null)
 *   2: cruza la medianoche (valores > 1440)
 *   3: primer tren de la manana, y es el que lleva la nota
 * Cada tipo de dia usa minutos distintos para que una busqueda en el bloque
 * equivocado salte a la vista.
 */

import type { Horarios } from "../../src/tipos.ts";

export const mini: Horarios = {
  source: "fixture.pdf",
  vigencia: "Vigencia de prueba",
  generated: "2026-01-01 00:00",
  noteLabel: "No circula los feriados",
  stations: [
    { name: "A", alias: "a" },
    { name: "B", alias: "b" },
    { name: "C", alias: "c" },
    { name: "D", alias: "d" },
    { name: "E", alias: "e" },
  ],
  dayTypes: [
    { id: "weekday", label: "Lunes a viernes" },
    { id: "saturday", label: "Sabados" },
    { id: "sunday", label: "Domingos y feriados" },
  ],
  services: {
    weekday: {
      to_lemos: {
        //         A     B     C     D     E
        trains: [
          [600, 610, 620, 630, 640],
          [700, 710, null, 730, 740],
          [1420, 1430, 1440, 1450, 1460],
          [300, 310, 320, 330, 340],
        ],
        noted: [3],
      },
      to_lacroze: {
        // Ojo: como en el JSON real, las columnas van en orden de `stations`,
        // asi que hacia Lacroze los minutos bajan de E a A: el tren sale de
        // la ultima estacion y llega a la primera.
        trains: [
          [645, 635, 625, 615, 605],
          [745, 735, null, 715, 705],
          [1465, 1455, 1445, 1435, 1425],
          [345, 335, 325, 315, 305],
        ],
        noted: [3],
      },
    },
    saturday: {
      to_lemos: {
        trains: [
          [800, 810, 820, 830, 840],
          [900, 910, null, 930, 940],
          [1400, 1410, 1420, 1430, 1440],
        ],
        noted: [],
      },
      to_lacroze: {
        trains: [
          [845, 835, 825, 815, 805],
          [945, 935, null, 915, 905],
          [1445, 1435, 1425, 1415, 1405],
        ],
        noted: [],
      },
    },
    sunday: {
      to_lemos: {
        trains: [
          [1000, 1010, 1020, 1030, 1040],
        ],
        noted: [],
      },
      to_lacroze: {
        trains: [
          [1045, 1035, 1025, 1015, 1005],
        ],
        noted: [],
      },
    },
  },
  warnings: [],
};

/** Miercoles 2026-01-07. Los tests fijan la hora sobre esta base. */
export function miercoles(hora: number, minuto: number): Date {
  return new Date(2026, 0, 7, hora, minuto, 0, 0);
}

/** Sabado 2026-01-10. */
export function sabado(hora: number, minuto: number): Date {
  return new Date(2026, 0, 10, hora, minuto, 0, 0);
}

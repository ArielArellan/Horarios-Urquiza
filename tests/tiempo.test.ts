import { test } from "node:test";
import assert from "node:assert/strict";

import {
  duracion, hhmm, horaDe, minutosDeHora, tipoDeDia,
} from "../src/tiempo.ts";
import { miercoles } from "./fixtures/mini.ts";

test("hhmm da vuelta el reloj en las dos direcciones", () => {
  assert.equal(hhmm(0), "00:00");
  assert.equal(hhmm(1439), "23:59");
  // Pasada la medianoche: los trenes del PDF llegan a pasar de 1440.
  assert.equal(hhmm(1445), "00:05");
  assert.equal(hhmm(1440), "00:00");
  // Negativo: pasa con los servicios del dia anterior (desp === -1).
  assert.equal(hhmm(-10), "23:50");
  assert.equal(hhmm(-1440), "00:00");
});

test("duracion pone el cero a la izquierda en los minutos", () => {
  assert.equal(duracion(45), "45 min");
  assert.equal(duracion(0), "0 min");
  assert.equal(duracion(60), "1 h 00 min");
  assert.equal(duracion(95), "1 h 35 min");
  assert.equal(duracion(125), "2 h 05 min");
});

test("tipoDeDia separa domingo y sabado del resto", () => {
  assert.equal(tipoDeDia(new Date(2026, 0, 4)), "sunday");
  assert.equal(tipoDeDia(new Date(2026, 0, 10)), "saturday");
  assert.equal(tipoDeDia(new Date(2026, 0, 7)), "weekday");
  assert.equal(tipoDeDia(new Date(2026, 0, 5)), "weekday");
  assert.equal(tipoDeDia(new Date(2026, 0, 9)), "weekday");
});

test("minutosDeHora devuelve null en vez de NaN con basura", () => {
  assert.equal(minutosDeHora("07:05"), 425);
  assert.equal(minutosDeHora("00:00"), 0);
  assert.equal(minutosDeHora("23:59"), 1439);
  // Algunos navegadores agregan los segundos.
  assert.equal(minutosDeHora("07:05:30"), 425);

  // El caso que importa: <input type=time> degradado a texto libre.
  assert.equal(minutosDeHora(""), null);
  assert.equal(minutosDeHora("abc"), null);
  assert.equal(minutosDeHora("7:5"), null);
  assert.equal(minutosDeHora("25:00"), null);
  assert.equal(minutosDeHora("07:60"), null);
  assert.equal(minutosDeHora(" 7:05"), null);
});

test("horaDe escribe la hora como la espera el <input type=time>", () => {
  assert.equal(horaDe(miercoles(7, 5)), "07:05");
  assert.equal(horaDe(miercoles(0, 0)), "00:00");
  assert.equal(horaDe(miercoles(23, 59)), "23:59");
});

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buscar, claveServicio, diaEn, referencia, sentidoDe, servicios,
} from "../src/busqueda.ts";
import { bloqueDe } from "../src/datos.ts";
import type { Estado, TipoDeDia } from "../src/tipos.ts";
import { mini, miercoles, sabado } from "./fixtures/mini.ts";

/** Estado por defecto: A -> E, hora en vivo, dia segun calendario. */
function estado(cambios: Partial<Estado> = {}): Estado {
  return {
    origen: 0, destino: 4, modo: "salida", hora: null, dia: "auto",
    ...cambios,
  };
}

test("el sentido sale de comparar los indices", () => {
  assert.equal(sentidoDe(estado({ origen: 0, destino: 4 })), "to_lemos");
  assert.equal(sentidoDe(estado({ origen: 4, destino: 0 })), "to_lacroze");

  // Los minutos de cada bloque son distintos a proposito: si se leyera el
  // bloque equivocado, los horarios no coincidirian.
  const haciaLemos = buscar(mini, estado(), miercoles(5, 0));
  assert.equal(haciaLemos.elegidos[0]?.sale, 300);

  const haciaLacroze = buscar(
    mini, estado({ origen: 4, destino: 0 }), miercoles(5, 0));
  assert.equal(haciaLacroze.elegidos[0]?.sale, 305);
});

test("un tren que no para en la estacion queda afuera", () => {
  // La fila 1 tiene null en C: sirve A->B pero no A->C.
  const hastaC = servicios(mini, estado({ destino: 2 }), miercoles(7, 0));
  assert.equal(hastaC.some((s) => s.sale === 700), false);

  const hastaB = servicios(mini, estado({ destino: 1 }), miercoles(7, 0));
  assert.equal(hastaB.some((s) => s.sale === 700), true);
});

test("noted marca exactamente el tren anotado", () => {
  // La fila 3 (sale 300) es la unica con nota en dias de semana.
  const lista = servicios(mini, estado(), miercoles(7, 0));
  const delDia = lista.filter((s) => s.desp === 0);
  for (const s of delDia) {
    assert.equal(s.nota, s.sale === 300, "nota mal puesta en " + s.sale);
  }
});

test("la linea de tiempo va de ayer a pasado manana, ordenada", () => {
  const lista = servicios(mini, estado(), miercoles(7, 0));

  const desps = [...new Set(lista.map((s) => s.desp))].sort((a, b) => a - b);
  assert.deepEqual(desps, [-1, 0, 1, 2]);

  for (let i = 1; i < lista.length; i++) {
    assert.ok((lista[i]?.sale ?? 0) >= (lista[i - 1]?.sale ?? 0),
              "la lista no quedo ordenada por hora de salida");
  }

  // El desplazamiento se aplica en bloques de 1440 minutos.
  const manana = lista.find((s) => s.desp === 1 && s.sale === 600 + 1440);
  assert.ok(manana, "falta el tren de las 06:00 de manana");
  assert.equal(manana.etiqueta, "mañana");
});

test("a las 00:20 del sabado los trenes del viernes siguen en la linea", () => {
  // El sabado a las 00:20 el dia anterior es viernes: horario de semana.
  const lista = servicios(mini, estado(), sabado(0, 20));

  const ayer = lista.filter((s) => s.desp === -1);
  assert.ok(ayer.length > 0, "no entro ningun tren del viernes");
  for (const s of ayer) {
    assert.equal(s.etiqueta, "ayer");
  }

  // El que salio 23:40 del viernes y llega 00:20 del sabado.
  const cruza = ayer.find((s) => s.sale === -20);
  assert.ok(cruza, "falta el tren que cruza la medianoche");
  assert.equal(cruza.llega, 20);

  // Buscando salidas ya no sirve (se fue), y los elegidos son de hoy.
  const salidas = buscar(mini, estado(), sabado(0, 20));
  for (const s of salidas.elegidos) {
    assert.equal(s.desp, 0);
    assert.equal(s.etiqueta, "");
  }
  assert.deepEqual(salidas.elegidos.map((s) => s.sale), [800, 900, 1400]);
});

test("buscando por llegada si aparece el tren del viernes", () => {
  // Este es el caso que promete el README: a las 00:30 del sabado, el tren
  // que llego 00:20 salio el viernes a la noche y tiene que contar.
  const r = buscar(mini, estado({ modo: "llegada", hora: "00:30" }),
                   sabado(0, 30));
  const primero = r.elegidos[0];
  assert.ok(primero);
  assert.equal(primero.llega, 20);
  assert.equal(primero.desp, -1);
  assert.equal(primero.etiqueta, "ayer");
});

test("modo salida: tres trenes, ascendentes, desde la hora pedida", () => {
  const r = buscar(mini, estado({ hora: "07:00" }), miercoles(7, 0));
  assert.equal(r.elegidos.length, 3);
  for (const s of r.elegidos) {
    assert.ok(s.sale >= r.ref.minutos);
  }
  assert.deepEqual(r.elegidos.map((s) => s.sale), [600, 700, 1420]);
});

test("modo llegada: ordenados de mas justo a mas holgado", () => {
  const r = buscar(mini, estado({ modo: "llegada", hora: "12:00" }),
                   miercoles(12, 0));
  assert.equal(r.ref.minutos, 720);
  for (const s of r.elegidos) {
    assert.ok(s.llega <= r.ref.minutos);
  }
  // Descendente: el primero es el que deja con menos tiempo de sobra.
  for (let i = 1; i < r.elegidos.length; i++) {
    assert.ok((r.elegidos[i]?.llega ?? 0) < (r.elegidos[i - 1]?.llega ?? 0),
              "las llegadas no quedaron en orden descendente");
  }
  assert.deepEqual(r.elegidos.map((s) => s.llega), [640, 340, 20]);
});

test("referencia distingue el reloj de una hora escrita", () => {
  const enVivo = referencia(estado(), miercoles(9, 15));
  assert.equal(enVivo.enVivo, true);
  assert.equal(enVivo.minutos, 9 * 60 + 15);

  const fija = referencia(estado({ hora: "07:30" }), miercoles(9, 15));
  assert.equal(fija.enVivo, false);
  assert.equal(fija.minutos, 450);

  // Hora ilegible: se cae al reloj en lugar de calcular con NaN.
  const rota = referencia(estado({ hora: "no es una hora" }), miercoles(9, 15));
  assert.equal(rota.enVivo, true);
  assert.equal(rota.minutos, 9 * 60 + 15);
});

test("con un dia fijo se repite ese horario y no se nombran dias", () => {
  // Miercoles, pero pidiendo sabados.
  const lista = servicios(mini, estado({ dia: "saturday" }), miercoles(7, 0));

  // Todos los minutos tienen que salir del bloque de sabado.
  const deSabado = new Set([800, 900, 1400]);
  for (const s of lista) {
    assert.ok(deSabado.has(s.sale - s.desp * 1440),
              "se colo un horario que no es de sabado: " + s.sale);
  }

  const etiquetas = new Set(lista.map((s) => s.etiqueta));
  assert.deepEqual([...etiquetas].sort(),
                   ["", "día anterior", "día siguiente"]);
});

test("diaEn nombra los desplazamientos en modo auto", () => {
  const e = estado();
  assert.equal(diaEn(e, 0, miercoles(7, 0)).etiqueta, "");
  assert.equal(diaEn(e, 1, miercoles(7, 0)).etiqueta, "mañana");
  assert.equal(diaEn(e, -1, miercoles(7, 0)).etiqueta, "ayer");
  // Mas lejos ya conviene el nombre del dia: miercoles + 2 = viernes.
  assert.equal(diaEn(e, 2, miercoles(7, 0)).etiqueta, "viernes");

  assert.equal(diaEn(e, 0, miercoles(7, 0)).tipo, "weekday");
  assert.equal(diaEn(e, 3, miercoles(7, 0)).tipo, "saturday");
  assert.equal(diaEn(e, 4, miercoles(7, 0)).tipo, "sunday");
});

test("casos degenerados: menos de tres, o ida y vuelta a la misma estacion", () => {
  // Los domingos del fixture tienen un solo tren por dia.
  const pocos = buscar(mini, estado({ dia: "sunday", hora: "23:59" }),
                       miercoles(23, 59));
  assert.equal(pocos.elegidos.length, 2);

  // El caso origen === destino lo corta la vista, pero buscar no debe romper.
  assert.doesNotThrow(() => buscar(mini, estado({ destino: 0 }),
                                   miercoles(7, 0)));
});

test("un tipo de dia desconocido falla con nombre", () => {
  assert.throws(
    () => bloqueDe(mini, "holiday" as TipoDeDia, "to_lemos"),
    /holiday/,
  );
});

test("claveServicio identifica al tren entre repintados", () => {
  const primera = servicios(mini, estado(), miercoles(7, 0));
  const segunda = servicios(mini, estado(), miercoles(7, 0));

  const claves = primera.map(claveServicio);
  assert.deepEqual(claves, segunda.map(claveServicio));

  // Y no se pisan entre si.
  assert.equal(new Set(claves).size, claves.length);
});

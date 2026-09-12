/**
 * El contrato entre el horarios.json y el codigo de la pagina.
 *
 * La web no sabe quien genera ese archivo —hoy el programa de parser/, manana
 * podria ser otra cosa—, asi que lo unico que puede hacer es verificar que lo
 * que llego tenga la forma que espera. Aca va esa validacion profunda, contra
 * el archivo de verdad y antes de publicar; en runtime solo se chequea la
 * forma general, que es lo que se puede pagar en cada visita.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { bloqueDe, leerHorarios } from "../src/datos.ts";
import type { Sentido, TipoDeDia } from "../src/tipos.ts";

const SENTIDOS: readonly Sentido[] = ["to_lemos", "to_lacroze"];

const bruto: unknown = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "horarios.json"), "utf8"));

test("leerHorarios acepta el horarios.json que genera Python", () => {
  assert.doesNotThrow(() => leerHorarios(bruto));
});

test("leerHorarios rechaza lo que no tiene la forma esperada", () => {
  // Importa mas que antes: el JSON ahora llega por la red y puede faltar,
  // venir cortado, o ser la pagina de error 404 del hosting.
  assert.throws(() => leerHorarios(undefined), /vac/);
  assert.throws(() => leerHorarios(null), /vac/);
  assert.throws(() => leerHorarios("<!doctype html>"), /vac/);
  assert.throws(() => leerHorarios({}), /forma esperada/);
  assert.throws(() => leerHorarios({ stations: [] }), /forma esperada/);
});

test("cada fila trae una columna por estacion", () => {
  const datos = leerHorarios(bruto);
  const columnas = datos.stations.length;
  assert.ok(columnas > 1, "tienen que ser varias estaciones");

  for (const dia of datos.dayTypes) {
    for (const sentido of SENTIDOS) {
      const bloque = bloqueDe(datos, dia.id, sentido);
      assert.ok(bloque.trains.length > 0,
                "no hay trenes en " + dia.id + "/" + sentido);

      for (const tren of bloque.trains) {
        assert.equal(tren.length, columnas,
                     "fila con " + tren.length + " columnas en " +
                     dia.id + "/" + sentido);
        for (const minuto of tren) {
          assert.ok(minuto === null || typeof minuto === "number",
                    "valor que no es number ni null en " + dia.id);
        }
      }
    }
  }
});

test("los indices de noted caen adentro de trains", () => {
  const datos = leerHorarios(bruto);
  for (const dia of datos.dayTypes) {
    for (const sentido of SENTIDOS) {
      const bloque = bloqueDe(datos, dia.id, sentido);
      for (const i of bloque.noted) {
        assert.ok(Number.isInteger(i) && i >= 0 && i < bloque.trains.length,
                  "noted apunta fuera de trains: " + i);
      }
    }
  }
});

test("las claves de services son exactamente los ids de dayTypes", () => {
  const datos = leerHorarios(bruto);
  const declarados = datos.dayTypes.map((d) => d.id).sort();
  const presentes = Object.keys(datos.services).sort() as TipoDeDia[];
  assert.deepEqual(presentes, declarados);
});

test("las estaciones tienen nombre y alias", () => {
  const datos = leerHorarios(bruto);
  for (const e of datos.stations) {
    assert.equal(typeof e.name, "string");
    assert.ok(e.name.length > 0);
    assert.equal(typeof e.alias, "string");
  }
});

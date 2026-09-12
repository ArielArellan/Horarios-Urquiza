/**
 * Los nodos que usa la pagina, buscados una sola vez y con el tipo concreto.
 *
 * Si la plantilla y el codigo se desincronizan, esto falla al arrancar con el
 * nombre del id que falta —y el cartel de #aviso-js lo muestra— en lugar de
 * dar `undefined` a mitad del primer pintado.
 */

function pedir<T extends HTMLElement>(id: string, tipo: new () => T): T {
  const nodo = document.getElementById(id);
  if (!(nodo instanceof tipo)) {
    throw new Error("falta #" + id + " o no es un " + tipo.name);
  }
  return nodo;
}

export interface Elementos {
  origen: HTMLSelectElement;
  destino: HTMLSelectElement;
  dia: HTMLSelectElement;
  hora: HTMLInputElement;
  invertir: HTMLButtonElement;
  ahora: HTMLButtonElement;
  modoSalida: HTMLButtonElement;
  modoLlegada: HTMLButtonElement;
  sentido: HTMLElement;
  detalle: HTMLElement;
  salidas: HTMLElement;
  recorrido: HTMLDetailsElement;
  paradas: HTMLElement;
  resumen: HTMLElement;
  vigencia: HTMLElement;
  pieFuente: HTMLElement;
}

export function buscarElementos(): Elementos {
  return {
    origen: pedir("origen", HTMLSelectElement),
    destino: pedir("destino", HTMLSelectElement),
    dia: pedir("dia", HTMLSelectElement),
    hora: pedir("hora", HTMLInputElement),
    invertir: pedir("invertir", HTMLButtonElement),
    ahora: pedir("ahora", HTMLButtonElement),
    modoSalida: pedir("modo-salida", HTMLButtonElement),
    modoLlegada: pedir("modo-llegada", HTMLButtonElement),
    sentido: pedir("sentido", HTMLElement),
    detalle: pedir("detalle", HTMLElement),
    salidas: pedir("salidas", HTMLElement),
    recorrido: pedir("recorrido", HTMLDetailsElement),
    paradas: pedir("paradas", HTMLElement),
    resumen: pedir("resumen-recorrido", HTMLElement),
    vigencia: pedir("vigencia", HTMLElement),
    pieFuente: pedir("pie-fuente", HTMLElement),
  };
}

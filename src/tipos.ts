/**
 * El esquema del horarios.json que consume la pagina, mas los tipos que se
 * pasan entre modulos. Solo tipos: este archivo no deja nada en el bundle.
 *
 * De donde sale ese JSON no es asunto de la pagina. Hoy lo produce el
 * programa de parser/, pero lo unico que importa aca es que respete esta
 * forma; leerHorarios() en datos.ts es el que la verifica al cargar.
 */

export type Sentido = "to_lemos" | "to_lacroze";
export type TipoDeDia = "weekday" | "saturday" | "sunday";
export type DiaElegido = "auto" | TipoDeDia;
export type Modo = "salida" | "llegada";

export interface Estacion {
  readonly name: string;
  readonly alias: string;
}

export interface DiaInfo {
  readonly id: TipoDeDia;
  readonly label: string;
}

/**
 * Una fila de `trains`: una columna por estacion, en el mismo orden que
 * `stations`. El valor son minutos desde la medianoche y puede pasar de 1440
 * cuando el tren cruza al dia siguiente. `null` donde el tren no para.
 */
export type Fila = readonly (number | null)[];

export interface Bloque {
  readonly trains: readonly Fila[];
  /** Indices dentro de `trains` que llevan la nota del PDF (el "#"). */
  readonly noted: readonly number[];
}

export type Sentidos = { readonly [S in Sentido]: Bloque };

export interface Horarios {
  readonly source: string;
  readonly vigencia: string;
  readonly generated: string;
  readonly noteLabel: string;
  /** Ordenadas de Federico Lacroze (0) a General Lemos (ultima). */
  readonly stations: readonly Estacion[];
  readonly dayTypes: readonly DiaInfo[];
  /** Partial a proposito: el PDF podria no traer los tres tipos de dia. */
  readonly services: Readonly<Partial<Record<TipoDeDia, Sentidos>>>;
  /** Avisos de quien genero el archivo. La pagina no los usa. */
  readonly warnings: readonly string[];
}

export interface Estado {
  origen: number;
  destino: number;
  modo: Modo;
  /** "HH:MM", o null para usar el reloj del telefono. */
  hora: string | null;
  dia: DiaElegido;
}

export interface DiaResuelto {
  readonly tipo: TipoDeDia;
  /** Texto corto para el marbete ("manana", "ayer", ...). Vacio = hoy. */
  readonly etiqueta: string;
}

/** Un tren concreto sirviendo el tramo elegido, ya ubicado en la linea de tiempo. */
export interface Servicio {
  readonly sale: number;
  readonly llega: number;
  readonly etiqueta: string;
  readonly nota: boolean;
  readonly tren: Fila;
  /** Desplazamiento en dias respecto del dia de referencia. */
  readonly desp: number;
}

export interface Referencia {
  readonly minutos: number;
  /** true cuando los minutos salen del reloj y no de una hora escrita. */
  readonly enVivo: boolean;
}

export interface Resultado {
  readonly ref: Referencia;
  readonly elegidos: readonly Servicio[];
}

export interface Recordado {
  origen: number;
  destino: number;
  dia: DiaElegido;
}

export interface Opcion {
  readonly valor: string;
  readonly texto: string;
}


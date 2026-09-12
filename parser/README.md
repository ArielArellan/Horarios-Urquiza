# Parser de horarios del Urquiza

Programa que toma el PDF oficial de horarios de Metrovías y devuelve un JSON.

Es lo único que hace. No sabe nada de la página web que consume ese JSON, y la
página tampoco sabe que este programa existe: lo único que comparten es el
**formato del archivo**, documentado más abajo.

## Uso

```
pip install pymupdf          # solo la primera vez

python parse_horarios.py                  # el PDF más nuevo de esta carpeta,
                                          # escribe ../horarios.json
python parse_horarios.py horario.pdf      # un PDF concreto
python parse_horarios.py -o datos.json    # otra salida
python parse_horarios.py -o -             # por pantalla, para encadenar
```

Por defecto escribe `../horarios.json`, que es donde la página lo busca. Es la
única línea del programa que sabe algo de la web (la constante
`SALIDA_POR_DEFECTO`), y la dependencia va en esa dirección a propósito.

El resumen y los avisos van por **stderr**, así que `-o -` se puede redirigir
sin ensuciar el JSON:

```
python parse_horarios.py -o - > ../horarios.json
```

Al terminar imprime la vigencia y la cantidad de servicios por día y sentido.
Conviene mirarlo para confirmar que leyó lo que corresponde. Si el formato del
PDF cambió y no puede interpretarlo, aborta con un error que dice qué esperaba
encontrar, en lugar de generar datos silenciosamente mal.

## El formato de salida

Este es el contrato. Si cambia, hay que cambiar también `src/tipos.ts` en la
página, y `tests/estructura.test.ts` lo verifica contra el archivo real.

```jsonc
{
  "source":    "horario-invierno-2026.pdf",  // de qué PDF salió
  "vigencia":  "Vigencia a partir del 2 de marzo de 2026",
  "generated": "2026-09-12 17:13",           // cuándo se leyó
  "noteLabel": "No circula los feriados",    // qué significa el "#" del PDF

  // Ordenadas de Federico Lacroze (0) a General Lemos (la última).
  "stations": [ { "name": "Federico Lacroze", "alias": "lacroze" }, ... ],

  "dayTypes": [ { "id": "weekday",  "label": "Lunes a viernes" },
                { "id": "saturday", "label": "Sabados" },
                { "id": "sunday",   "label": "Domingos y feriados" } ],

  "services": {
    "weekday": {
      "to_lemos": {
        // Una fila por tren, una columna por estación, en el orden de
        // "stations". El valor son minutos desde la medianoche y puede pasar
        // de 1440 si el tren cruza al día siguiente. null = no para ahí.
        "trains": [ [360, 362, 365, null, 371, ...], ... ],
        // Índices de "trains" que llevan la nota del PDF (el "#").
        "noted": [ 42 ]
      },
      "to_lacroze": { "trains": [ ... ], "noted": [ ... ] }
    },
    "saturday": { ... },
    "sunday":   { ... }
  },

  // Avisos del parseo. Informativos; la página no los usa.
  "warnings": [ "..." ]
}
```

Dos detalles que no se ven a simple vista:

- En `to_lacroze` las columnas siguen el orden de `stations`, así que los
  minutos **bajan** de la última estación a la primera: el tren sale de General
  Lemos y llega a Lacroze.
- `noted` son índices, no horarios. Si se reordenan las filas hay que
  reordenarlos también.

## Cómo lee el PDF

El PDF tiene, por página, dos tablas —una por sentido— con las estaciones en
filas y cada servicio en una columna. Los horarios están en la capa de texto,
así que se leen por coordenadas: se agrupan las celdas en filas y columnas y se
arma la grilla.

Lo que **no** está como texto son los nombres de las estaciones, los títulos
("Lunes a viernes", "A Gral. Lemos") y la referencia al pie: todo eso viene
dibujado como vectores. Por eso:

- La lista de estaciones vive en la constante `STATIONS`, en el sentido a
  General Lemos. Si el ramal cambia, hay que editarla ahí.
- El sentido de cada tabla se deduce del rótulo "A Federico Lacroze", que es el
  único que el PDF sí deja como texto.
- El tipo de día se deduce de los horarios: cada vez que vuelven a empezar de
  cero en una página nueva, arranca un tipo de día nuevo. Los tres grupos se
  asignan en el orden de `DAY_TYPES`.
- El `#` que marca "FERIADOS NO CORRE" se detecta por su geometría, pero el
  texto de la referencia no se puede leer: está en `NOTE_LABEL`. El programa
  avisa cuántos servicios lo llevan para poder verificarlo contra el PDF.

## Un dato conocido con errata

El PDF vigente desde marzo de 2026 tiene un error de tipeo: en el horario de
lunes a viernes hacia Federico Lacroze, el tren que sale de General Lemos a las
09:49 figura pasando por Fernández Moreno a las 10:13, antes que por Lourdes
(10:21). Debería decir 10:23.

El programa deja el dato tal como está en el PDF —no inventa correcciones— y lo
reporta como aviso. Solo afecta a los viajes que empiezan o terminan en
Fernández Moreno con ese tren.

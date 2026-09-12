#!/usr/bin/env python3
"""
Convierte el PDF oficial de horarios del Urquiza (Metrovias) en un JSON.

Es lo unico que hace. No sabe nada de la pagina web que despues consume ese
JSON: la unica atadura entre las dos partes es el formato del archivo, que
esta descripto en el README de esta carpeta.

Uso:
    python parse_horarios.py                  # el PDF mas reciente de aca,
                                              # escribe ../horarios.json
    python parse_horarios.py horario.pdf      # un PDF concreto
    python parse_horarios.py -o datos.json    # otra salida ("-" = pantalla)

El resumen y los avisos salen por stderr, asi que "-o -" se puede redirigir
sin que se ensucie el JSON.

Requiere: pip install pymupdf
"""

from __future__ import annotations

import collections
import datetime as dt
import glob
import json
import os
import re
import sys

import pymupdf

TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")
VIGENCIA_RE = re.compile(r"Vigencia[^\n]*", re.IGNORECASE)

# Adonde va el JSON si no se pide otra cosa: la carpeta de arriba, que es
# donde vive la pagina. Es la unica linea de este archivo que sabe algo de
# ella, y a proposito: el parser conoce a la web, la web no conoce al parser.
SALIDA_POR_DEFECTO = os.path.join("..", "horarios.json")

# El orden de las estaciones no viene en la capa de texto del PDF: los nombres
# estan dibujados como vectores. Se mantiene aca, en el sentido
# "A General Lemos" (que es el orden de las filas de la tabla superior).
# Si en el futuro cambia el ramal, hay que actualizar esta lista.
STATIONS = [
    {"name": "Federico Lacroze",    "alias": "lacroze"},
    {"name": "Jose Artigas",        "alias": "artigas"},
    {"name": "P. N. Arata",         "alias": "arata"},
    {"name": "Dr. Fco. Beiro",      "alias": "beiro francisco"},
    {"name": "El Libertador",       "alias": "libertador"},
    {"name": "Antonio Devoto",      "alias": "devoto"},
    {"name": "Cnel. Fco. Lynch",    "alias": "lynch coronel"},
    {"name": "Fernandez Moreno",    "alias": "fernandez moreno"},
    {"name": "Lourdes",             "alias": "lourdes"},
    {"name": "Tropezon",            "alias": "tropezon"},
    {"name": "Jose M. Bosch",       "alias": "bosch"},
    {"name": "Martin Coronado",     "alias": "martin coronado"},
    {"name": "Pablo Podesta",       "alias": "podesta"},
    {"name": "Jorge Newbery",       "alias": "newbery"},
    {"name": "Ruben Dario",         "alias": "ruben dario"},
    {"name": "E. De Los Andes",     "alias": "los andes"},
    {"name": "Juan B. De La Salle", "alias": "la salle"},
    {"name": "Sgto. Barruffaldi",   "alias": "barruffaldi sargento"},
    {"name": "Capitan Lozano",      "alias": "lozano capitan"},
    {"name": "Tnte. Agneta",        "alias": "agneta teniente"},
    {"name": "Campo De Mayo",       "alias": "campo de mayo"},
    {"name": "Sgto. Cabral",        "alias": "cabral sargento"},
    {"name": "General Lemos",       "alias": "lemos"},
]

# Tipos de dia, en el orden en que aparecen en el PDF.
DAY_TYPES = [
    {"id": "weekday",  "label": "Lunes a viernes"},
    {"id": "saturday", "label": "Sabados"},
    {"id": "sunday",   "label": "Domingos y feriados"},
]

# Algunos servicios llevan un "#" al lado del horario, que en la referencia al
# pie del PDF significa "FERIADOS NO CORRE". Ese simbolo tambien esta dibujado
# como vector, asi que se detecta por geometria y el texto se pone aca.
NOTE_LABEL = "No circula los feriados"

ROW_TOL = 3.0     # pt: tolerancia para agrupar celdas en una misma fila
COL_TOL = 6.0     # pt: tolerancia para agrupar celdas en una misma columna
BLOCK_GAP = 20.0  # pt: separacion vertical entre las dos tablas de una pagina
MARK_SIZE = 7.0   # pt: tamano maximo del simbolo "#" de la nota al pie


class ParseError(Exception):
    pass


def cluster(values, tol):
    """Agrupa valores en clusters separados por mas de `tol`."""
    groups = []
    for v in sorted(values):
        if groups and v - groups[-1][-1] <= tol:
            groups[-1].append(v)
        else:
            groups.append([v])
    return groups


def to_minutes(text):
    m = TIME_RE.match(text)
    return int(m.group(1)) * 60 + int(m.group(2))


def page_blocks(page):
    """Devuelve las tablas de la pagina como (y_de_la_primera_fila, grilla).

    grilla = lista de filas; cada fila es una lista de (x_centro, minutos).
    """
    cells = []
    for x0, y0, x1, y1, text, *_ in page.get_text("words"):
        if TIME_RE.match(text):
            cells.append(((x0 + x1) / 2, (y0 + y1) / 2, to_minutes(text)))
    if not cells:
        return []

    rows = {}
    for group in cluster([c[1] for c in cells], ROW_TOL):
        lo, hi = group[0] - 0.01, group[-1] + 0.01
        centre = round(sum(group) / len(group), 2)
        rows[centre] = [c for c in cells if lo <= c[1] <= hi]

    ordered = sorted(rows)
    blocks, current = [], [ordered[0]]
    for prev, nxt in zip(ordered, ordered[1:]):
        if nxt - prev > BLOCK_GAP:
            blocks.append(current)
            current = []
        current.append(nxt)
    blocks.append(current)

    return [(block[0],
             [[(c[0], c[2]) for c in sorted(rows[y], key=lambda c: c[0])]
              for y in block])
            for block in blocks]


def page_marks(page):
    """Posiciones (x_izq, y_centro) del simbolo "#" de la nota al pie.

    El simbolo es un vector, igual que los nombres de estacion. Se lo
    distingue porque es diminuto y cae dentro de la zona de horarios, a la
    derecha del horario que anota.
    """
    times = [w for w in page.get_text("words") if TIME_RE.match(w[4])]
    if not times:
        return []
    x_first = min(w[0] for w in times)
    row_ys = {round((w[1] + w[3]) / 2, 1) for w in times}

    marks = []
    for drawing in page.get_drawings():
        r = drawing["rect"]
        y = (r.y0 + r.y1) / 2
        if (r.x0 > x_first - 2
                and r.width < MARK_SIZE and r.height < MARK_SIZE
                and any(abs(y - ry) < ROW_TOL + 0.5 for ry in row_ys)):
            marks.append((r.x0, y))
    return marks


def grid_to_trains(grid, marks=()):
    """Convierte una tabla (filas = estaciones) en una lista de servicios.

    Devuelve (servicios, anotados). Cada servicio es una lista de minutos por
    estacion, o None si el tren no pasa por ahi; se resuelve por posicion
    horizontal, asi que tolera columnas incompletas. `anotados` son los
    indices de los servicios que llevan el "#" de la nota al pie.
    """
    n_rows = len(grid)
    if n_rows != len(STATIONS):
        raise ParseError(
            "la tabla tiene {} filas y se esperaban {} estaciones. "
            "Revisar la lista STATIONS en este script.".format(
                n_rows, len(STATIONS)))

    centres = [sum(g) / len(g)
               for g in cluster([x for row in grid for x, _ in row], COL_TOL)]

    trains = [[None] * n_rows for _ in centres]
    for r, row in enumerate(grid):
        for x, minutes in row:
            c = min(range(len(centres)), key=lambda i: abs(centres[i] - x))
            if trains[c][r] is not None:
                raise ParseError(
                    "dos horarios cayeron en la misma celda (fila {}): "
                    "las columnas no se separan bien.".format(r))
            trains[c][r] = minutes

    # El "#" se dibuja pegado a la derecha del horario que anota.
    flagged = set()
    for mark_x, _ in marks:
        left = [i for i, c in enumerate(centres) if c < mark_x]
        if left:
            flagged.add(left[-1])

    # Un servicio que arranca antes de medianoche y termina despues aparece con
    # horas que "vuelven a empezar": se normaliza sumando 24 h.
    for train in trains:
        offset, prev = 0, None
        for i, minutes in enumerate(train):
            if minutes is None:
                continue
            if prev is not None and minutes + offset < prev - 120:
                offset += 24 * 60
            train[i] = minutes + offset
            prev = train[i]
    return [(train, i in flagged) for i, train in enumerate(trains)]


def parse(pdf_path):
    doc = pymupdf.open(pdf_path)

    vigencia = ""
    for page in doc:
        m = VIGENCIA_RE.search(page.get_text())
        if m:
            vigencia = " ".join(m.group(0).split())
            break

    pages = []
    lacroze_slots = set()
    for index, page in enumerate(doc):
        blocks = page_blocks(page)
        if len(blocks) != 2:
            raise ParseError(
                "pagina {}: se encontraron {} tablas y se esperaban 2 "
                "(una por sentido).".format(index + 1, len(blocks)))

        # "A Federico Lacroze" es el unico rotulo que el PDF deja como texto
        # (el resto son vectores): rotula la tabla que tiene justo debajo.
        label_y = None
        for x0, y0, x1, y1, text, *_ in page.get_text("words"):
            if text == "Federico":
                label_y = y1
                break

        # Sin rotulo se asume el orden habitual: arriba a Lemos, abajo a
        # Lacroze.
        slot = 1
        if label_y is not None:
            below = [i for i, (y, _) in enumerate(blocks) if y > label_y]
            if below:
                slot = below[0]
        lacroze_slots.add(slot)

        marks = page_marks(page)
        y_split = (blocks[0][0] + blocks[1][0]) / 2
        marks_by_slot = [[m for m in marks if (m[1] > y_split) == bool(i)]
                         for i in (0, 1)]

        lacroze = grid_to_trains(blocks[slot][1], marks_by_slot[slot])
        lemos = grid_to_trains(blocks[1 - slot][1], marks_by_slot[1 - slot])

        pages.append({
            "to_lemos": lemos,
            # Las filas de la tabla inversa van de Lemos a Lacroze: se dan
            # vuelta para que el indice sea siempre el de STATIONS.
            "to_lacroze": [(list(reversed(t)), note) for t, note in lacroze],
        })

    if len(lacroze_slots) > 1:
        raise ParseError(
            "el sentido de las tablas no es consistente entre paginas: en "
            "algunas 'A Federico Lacroze' esta arriba y en otras abajo.")

    # El PDF reparte cada tipo de dia en varias paginas por franja horaria.
    # Cada vez que los horarios "vuelven a cero" empieza un tipo de dia nuevo.
    groups, current, last_start = [], [], None
    for page in pages:
        first = min(min(t for t in train if t is not None)
                    for train, _ in page["to_lemos"])
        if last_start is not None and first < last_start:
            groups.append(current)
            current = []
        last_start = first
        current.append(page)
    groups.append(current)

    if len(groups) != len(DAY_TYPES):
        raise ParseError(
            "se detectaron {} tipos de dia y se esperaban {} ({}).".format(
                len(groups), len(DAY_TYPES),
                ", ".join(d["label"] for d in DAY_TYPES)))

    warnings = []
    services = {}
    for day, group in zip(DAY_TYPES, groups):
        entry = {}
        for direction in ("to_lemos", "to_lacroze"):
            unique = {}
            for page in group:
                for train, note in page[direction]:
                    unique[tuple(train)] = (train, note)
            ordered = sorted(unique.values(),
                             key=lambda item: min(x for x in item[0]
                                                  if x is not None))
            entry[direction] = {
                "trains": [t for t, _ in ordered],
                "noted": [i for i, (_, note) in enumerate(ordered) if note],
            }
            warnings.extend(check_order(ordered, day, direction))
        services[day["id"]] = entry

    return {
        "source": os.path.basename(pdf_path),
        "vigencia": vigencia,
        "generated": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "noteLabel": NOTE_LABEL,
        "stations": STATIONS,
        "dayTypes": DAY_TYPES,
        "services": services,
        "warnings": warnings,
    }


def check_order(services, day, direction):
    """Avisa si un servicio no avanza en el tiempo estacion tras estacion.

    Suele indicar una errata en el PDF oficial. Los horarios se dejan tal como
    figuran; el aviso es para que quien actualiza los datos lo revise.
    """
    step = 1 if direction == "to_lemos" else -1
    out = []
    for train, _ in services:
        stops = [(i, t) for i, t in enumerate(train) if t is not None][::step]
        for (i_prev, prev), (i, cur) in zip(stops, stops[1:]):
            if cur < prev:
                out.append(
                    "{} / {}: el tren de las {} figura pasando por {} a las "
                    "{}, antes que por {} ({}). Parece una errata del PDF; se "
                    "deja el dato tal cual.".format(
                        day["label"], direction, fmt(stops[0][1]),
                        STATIONS[i]["name"], fmt(cur),
                        STATIONS[i_prev]["name"], fmt(prev)))
    return out


def fmt(minutes):
    return "{:02d}:{:02d}".format((minutes // 60) % 24, minutes % 60)



def resumen(data, salida=sys.stderr):
    """Lo que conviene mirar para confirmar que se leyo lo que corresponde.

    Va por stderr para que "-o -" se pueda redirigir sin ensuciar el JSON.
    """
    def linea(texto):
        print(texto, file=salida)

    linea("  " + (data["vigencia"] or "(sin fecha de vigencia)"))
    noted = 0
    for day in DAY_TYPES:
        svc = data["services"][day["id"]]
        noted += len(svc["to_lemos"]["noted"]) + len(svc["to_lacroze"]["noted"])
        linea("  {}: {} servicios a Lemos, {} a Lacroze".format(
            day["label"], len(svc["to_lemos"]["trains"]),
            len(svc["to_lacroze"]["trains"])))
    if noted:
        linea('  {} servicio(s) con la nota "{}" (el "#" del PDF). Conviene '
              "verificar que la referencia al pie siga diciendo lo mismo."
              .format(noted, NOTE_LABEL))

    for warning in data["warnings"]:
        linea("  AVISO: " + warning)


def elegir_pdf(argumentos, aca):
    """El PDF que pidieron, o el mas reciente de esta carpeta."""
    if argumentos:
        return argumentos[0]
    candidatos = sorted(glob.glob(os.path.join(aca, "*.pdf")),
                        key=os.path.getmtime, reverse=True)
    if not candidatos:
        return None
    return candidatos[0]


def main(argv):
    aca = os.path.dirname(os.path.abspath(__file__))
    args = argv[1:]
    salida = os.path.join(aca, SALIDA_POR_DEFECTO)
    sueltos = []

    i = 0
    while i < len(args):
        a = args[i]
        if a in ("-o", "--salida"):
            if i + 1 >= len(args):
                print("Falta el archivo despues de {}.".format(a),
                      file=sys.stderr)
                return 1
            salida = args[i + 1]
            i += 2
        elif a.startswith("-") and a != "-":
            print("Opcion desconocida: {}".format(a), file=sys.stderr)
            return 1
        else:
            sueltos.append(a)
            i += 1

    pdf = elegir_pdf(sueltos, aca)
    if pdf is None:
        print("No hay ningun PDF en {}.".format(aca), file=sys.stderr)
        return 1

    print("Leyendo {} ...".format(os.path.basename(pdf)), file=sys.stderr)
    try:
        data = parse(pdf)
    except ParseError as exc:
        print("\nERROR: el PDF no tiene el formato esperado.\n  {}".format(exc),
              file=sys.stderr)
        return 1

    if salida == "-":
        json.dump(data, sys.stdout, ensure_ascii=False, indent=1)
        sys.stdout.write("\n")
        destino = "(pantalla)"
    else:
        try:
            with open(salida, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=1)
        except OSError as exc:
            print("\nERROR: no se pudo escribir {}.\n  {}".format(salida, exc),
                  file=sys.stderr)
            return 1
        destino = os.path.normpath(salida)

    resumen(data)
    print("\nListo: {}".format(destino), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

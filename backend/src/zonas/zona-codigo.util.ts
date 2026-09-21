const ARTICULOS = new Set(["EL", "LA", "LOS", "LAS", "DE", "DEL", "Y"]);
const DIACRITICOS_COMBINABLES = /[̀-ͯ]/g;

function quitarTildes(texto: string): string {
  return texto.normalize("NFD").replace(DIACRITICOS_COMBINABLES, "");
}

export function generarCodigoZona(nombre: string, codigosExistentes: Iterable<string>): string {
  const existentes = new Set(Array.from(codigosExistentes, (codigo) => codigo.toUpperCase()));

  const palabras = quitarTildes(nombre)
    .toUpperCase()
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0 && !ARTICULOS.has(palabra));

  const palabrasRelevantes = palabras.length > 0 ? palabras : [nombre.toUpperCase()];

  let base = palabrasRelevantes
    .slice(0, 3)
    .map((palabra) => palabra[0])
    .join("");

  if (base.length < 3) {
    const ultima = palabrasRelevantes[palabrasRelevantes.length - 1] ?? "";
    base += ultima.slice(1, 1 + (3 - base.length));
  }

  base = base.slice(0, 3).padEnd(3, "X");

  if (!existentes.has(base)) {
    return base;
  }

  for (let sufijo = 2; sufijo < 100; sufijo++) {
    const candidato = `${base}${sufijo}`;
    if (!existentes.has(candidato)) {
      return candidato;
    }
  }

  throw new Error(`No se pudo generar un código único de zona para "${nombre}"`);
}

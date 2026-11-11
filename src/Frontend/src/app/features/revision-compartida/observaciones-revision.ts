import { ArchivoDto, HojaDeVidaDto, MarcaObservacionDto, ObservacionDto } from '../../api-client';

export interface MarcaConRevision extends MarcaObservacionDto {
  revision?: Pick<ObservacionDto, 'ronda' | 'autor' | 'fechaUtc'>;
  estadoExpediente?: string;
}

export function ordenarObservaciones(observaciones: ObservacionDto[]): ObservacionDto[] {
  return [...observaciones].sort(
    (a, b) =>
      b.ronda - a.ronda ||
      (new Date(b.fechaUtc).getTime() || 0) - (new Date(a.fechaUtc).getTime() || 0),
  );
}

const normalizar = (valor: string) =>
  valor
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, '');
const tipos: Record<string, string[]> = {
  titulo: ['titulo', 'tituloacademico'],
  tituloencurso: ['tituloencurso', 'titulocurso'],
  capacitacion: ['capacitacion', 'capacitaciones', 'curso', 'cursos'],
  capacitacionobligatoria: ['capacitacionobligatoria', 'obligatoria'],
  experiencia: ['experiencia', 'experiencias', 'experiencialaboral'],
  referencia: ['referencia', 'referencias', 'referenciapersonal'],
  documento: ['documento', 'documentos', 'documentopersonal'],
};
const tipoCanonico = (tipo: string) =>
  Object.entries(tipos).find(([, alias]) => alias.includes(normalizar(tipo)))?.[0] ??
  normalizar(tipo);
const secciones: Record<string, string[]> = {
  ficha: [
    'ficha',
    'datospersonales',
    'primernombre',
    'segundonombre',
    'primerapellido',
    'segundoapellido',
    'sexoid',
    'fechanacimiento',
    'estadocivilid',
    'tiposangreid',
    'etniaid',
    'nacionalidadindigenaid',
    'paisnacionalidadid',
    'paisnacimientoid',
    'parroquianacimientoid',
    'parroquiaresidenciaid',
    'calleprincipal',
    'callesecundaria',
    'numerocasa',
    'referenciadomicilio',
    'codigopostal',
    'telefonoconvencional',
    'telefono',
    'celular',
    'correoinstitucional',
    'discapacidadid',
    'porcentajediscapacidad',
    'numerocarnetdiscapacidad',
    'fotoarchivoid',
  ],
  formacion: ['formacion', 'formacionacademica', 'titulos', 'titulosencurso'],
  capacitaciones: ['capacitaciones'],
  experiencia: ['experiencia', 'experiencialaboral'],
  referencias: ['referencias'],
  documentos: ['documentos', 'documentospersonales'],
};
const nombresSeccion: Record<string, string> = {
  ficha: 'Ficha personal',
  formacion: 'Formación académica',
  capacitaciones: 'Capacitaciones',
  experiencia: 'Experiencia laboral',
  referencias: 'Referencias',
  documentos: 'Documentos personales',
};

function destinoItem(clave: string): [string, string] {
  const prefijo = 'capacitaciones.obligatoria.';
  if (clave.toLowerCase().startsWith(prefijo))
    return ['capacitacionobligatoria', clave.slice(prefijo.length).toLowerCase()];
  const separador = clave.indexOf(':');
  return separador < 0
    ? ['', clave.toLowerCase()]
    : [
        tipoCanonico(clave.slice(0, separador)),
        clave
          .slice(separador + 1)
          .trim()
          .toLowerCase(),
      ];
}

export function coincideMarca(marca: MarcaObservacionDto, tipo: string, clave: string): boolean {
  const destino = marca.tipoDestino.toLowerCase();
  if (destino === tipo.toLowerCase() && marca.claveDestino.toLowerCase() === clave.toLowerCase())
    return true;
  if ((tipo === 'seccion' || tipo === 'ficha') && ['campo', 'seccion', 'ficha'].includes(destino)) {
    return (secciones[tipo === 'ficha' ? 'ficha' : clave] ?? []).includes(
      normalizar(marca.claveDestino),
    );
  }
  if (destino !== 'item') return false;
  const [tipoItem, id] = destinoItem(marca.claveDestino);
  return tipoItem === tipoCanonico(tipo) && id === clave.toLowerCase();
}

export function describirDestino(
  marca: { tipoDestino?: string | null; claveDestino?: string | null },
  hoja?: HojaDeVidaDto | null,
  archivos: ArchivoDto[] = [],
): string {
  const clave = marca.claveDestino || '';
  const destino = (marca.tipoDestino || '').toLowerCase();

  // Si la clave tiene formato "tipo:id" (ej: "titulo:3737b725-..."), resolverla como ítem directamente
  // independientemente de si tipoDestino vino como 'Archivo' o 'Item'
  if (clave.includes(':') || destino === 'item') {
    const [tipo, id] = destinoItem(clave);
    const buscar = <T extends { id: string }>(registros: T[] | undefined) =>
      registros?.find((r) => r.id.toLowerCase() === id.toLowerCase());

    switch (tipo) {
      case 'titulo': {
        const t = buscar(hoja?.titulos);
        return `Título: ${t?.nombreTitulo ?? id}`;
      }
      case 'tituloencurso': {
        const tc = buscar(hoja?.titulosEnCurso);
        return `Estudio en curso: ${tc?.nombrePrograma ?? id}`;
      }
      case 'capacitacion': {
        const c = buscar(hoja?.capacitaciones);
        return `Capacitación: ${c?.nombreEvento ?? id}`;
      }
      case 'experiencia': {
        const e = buscar(hoja?.experiencias);
        const detalle = e?.empleador ? `${e.cargo} (${e.empleador})` : e?.cargo;
        return `Experiencia laboral: ${detalle ?? id}`;
      }
      case 'referencia': {
        const r = buscar(hoja?.referencias);
        return `Referencia: ${r?.nombresApellidos ?? id}`;
      }
      case 'documento': {
        const arch = archivos.find((a) => a.id.toLowerCase() === id.toLowerCase());
        return `Documento personal: ${arch?.nombreOriginal ?? id}`;
      }
      case 'capacitacionobligatoria':
        return `Capacitación obligatoria: ${id}`;
      default:
        break;
    }
  }

  if (destino === 'archivo') {
    const archivo = archivos.find((a) => a.id.toLowerCase() === clave.toLowerCase());
    if (archivo) {
      return `Archivo: ${archivo.nombreOriginal}`;
    }
    const titConArchivo = hoja?.titulos?.find(
      (t) => t.archivoId?.toLowerCase() === clave.toLowerCase(),
    );
    if (titConArchivo) {
      return `Título: ${titConArchivo.nombreTitulo}`;
    }
    const capConArchivo = hoja?.capacitaciones?.find(
      (c) => c.archivoId?.toLowerCase() === clave.toLowerCase(),
    );
    if (capConArchivo) {
      return `Capacitación: ${capConArchivo.nombreEvento}`;
    }
    const expConArchivo = hoja?.experiencias?.find(
      (e) => e.archivoId?.toLowerCase() === clave.toLowerCase(),
    );
    if (expConArchivo) {
      return `Experiencia laboral: ${expConArchivo.cargo}`;
    }
    return `Archivo: ${clave}`;
  }

  if (['campo', 'seccion', 'ficha'].includes(destino)) {
    const seccion = Object.entries(secciones).find(([, claves]) =>
      claves.includes(normalizar(clave)),
    )?.[0];
    if (seccion && normalizar(clave) === 'datospersonales') return 'Ficha personal';
    return seccion
      ? `${nombresSeccion[seccion]} · ${clave.replace(/_/g, ' ')}`
      : `Campo o sección: ${clave}`;
  }

  return `Registro: ${clave}`;
}

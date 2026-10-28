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
  marca: MarcaObservacionDto,
  hoja?: HojaDeVidaDto | null,
  archivos: ArchivoDto[] = [],
): string {
  const destino = marca.tipoDestino.toLowerCase();
  if (destino === 'archivo') {
    const archivo = archivos.find((a) => a.id.toLowerCase() === marca.claveDestino.toLowerCase());
    return `Archivo: ${archivo?.nombreOriginal ?? marca.claveDestino}`;
  }
  if (['campo', 'seccion', 'ficha'].includes(destino)) {
    const seccion = Object.entries(secciones).find(([, claves]) =>
      claves.includes(normalizar(marca.claveDestino)),
    )?.[0];
    if (seccion && normalizar(marca.claveDestino) === 'datospersonales') return 'Ficha personal';
    return seccion
      ? `${nombresSeccion[seccion]} · ${marca.claveDestino.replace(/_/g, ' ')}`
      : `Campo o sección: ${marca.claveDestino}`;
  }
  const [tipo, id] = destinoItem(marca.claveDestino);
  const buscar = <T extends { id: string }>(registros: T[] | undefined) =>
    registros?.find((r) => r.id.toLowerCase() === id);
  switch (tipo) {
    case 'titulo':
      return `Título: ${buscar(hoja?.titulos)?.nombreTitulo ?? id}`;
    case 'tituloencurso':
      return `Estudio en curso: ${buscar(hoja?.titulosEnCurso)?.nombrePrograma ?? id}`;
    case 'capacitacion':
      return `Capacitación: ${buscar(hoja?.capacitaciones)?.nombreEvento ?? id}`;
    case 'experiencia':
      return `Experiencia laboral: ${buscar(hoja?.experiencias)?.cargo ?? id}`;
    case 'referencia':
      return `Referencia: ${buscar(hoja?.referencias)?.nombresApellidos ?? id}`;
    case 'documento':
      return `Documento personal: ${id}`;
    case 'capacitacionobligatoria':
      return `Capacitación obligatoria: ${id}`;
    default:
      return `Registro: ${marca.claveDestino}`;
  }
}

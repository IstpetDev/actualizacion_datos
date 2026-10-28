import { ObservacionDto } from '../../api-client';

export const observacionesFicticias: ObservacionDto[] = [1, 2].map((ronda) => ({
  id: `devolucion-ficticia-${ronda}`,
  ronda,
  autor: `Supervisor Ficticio ${ronda}`,
  fechaUtc: new Date(`2026-10-${20 + ronda}T15:00:00Z`),
  texto: `Indicación general ficticia ${ronda}`,
  marcas: [
    {
      id: `marca-ficha-${ronda}`,
      tipoDestino: 'campo',
      claveDestino: 'datos_personales',
      texto: `Corregir ficha ficticia ${ronda}`,
    },
    {
      id: `marca-titulo-${ronda}`,
      tipoDestino: 'item',
      claveDestino: 'titulo:tit-001',
      texto: `Corregir título ficticio ${ronda}`,
    },
  ],
}));

import { reportFormSchema } from '@fieldreport/shared';
import { describe, expect, it } from 'vitest';

const valid = {
  customerName: 'Granja El Sol',
  serviceType: 'REPAIR',
  description: 'Bomba de agua sin presión',
  status: 'OPEN',
} as const;

const firstError = (over: object) => {
  const r = reportFormSchema.safeParse({ ...valid, ...over });
  return r.success ? undefined : r.error.issues[0].message;
};

describe('mensajes de validación del formulario', () => {
  it('las coordenadas fuera de rango se explican en español, sin símbolos', () => {
    expect(firstError({ latitude: 91 })).toBe(
      'La latitud debe estar entre -90 y 90',
    );
    expect(firstError({ latitude: -91 })).toBe(
      'La latitud debe estar entre -90 y 90',
    );
    expect(firstError({ longitude: 181 })).toBe(
      'La longitud debe estar entre -180 y 180',
    );
  });

  it('un valor que no es número también', () => {
    expect(firstError({ latitude: NaN })).toBe(
      'Escribe la latitud como número',
    );
  });

  it('las coordenadas válidas o vacías pasan', () => {
    expect(firstError({ latitude: 19.4326, longitude: -99.1332 })).toBeUndefined();
    expect(firstError({})).toBeUndefined();
  });
});

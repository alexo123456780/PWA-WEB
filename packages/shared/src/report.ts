import { z } from 'zod';

export const SERVICE_TYPES = [
  'INSTALLATION',
  'MAINTENANCE',
  'REPAIR',
  'INSPECTION',
] as const;
export const REPORT_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'] as const;
// Estado de sincronización: solo existe en el cliente (IndexedDB).
export const SYNC_STATES = ['pending', 'syncing', 'synced', 'error'] as const;

// Mensajes propios: los de Zod salen en inglés y con símbolos (">=-90").
const coordinate = (name: string, limit: number) => {
  const range = `La ${name} debe estar entre -${limit} y ${limit}`;
  return z
    .number({ error: `Escribe la ${name} como número` })
    .min(-limit, range)
    .max(limit, range)
    .nullish();
};

// Lo que captura el técnico en el formulario; la API lo valida con las mismas reglas.
export const reportFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre del cliente')
    .max(120, 'Máximo 120 caracteres'),
  serviceType: z.enum(SERVICE_TYPES),
  description: z
    .string()
    .trim()
    .min(5, 'Describe el trabajo realizado (mínimo 5 caracteres)')
    .max(2000, 'Máximo 2000 caracteres'),
  status: z.enum(REPORT_STATUSES),
  latitude: coordinate('latitud', 90),
  longitude: coordinate('longitud', 180),
});

export const reportInputSchema = reportFormSchema.extend({
  clientId: z.uuid(),
  status: z.enum(REPORT_STATUSES).default('OPEN'),
  createdAtClient: z.iso.datetime(),
});

// El clientId y la hora de captura no cambian después de crear el reporte.
export const reportUpdateSchema = reportFormSchema.partial();

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type SyncState = (typeof SYNC_STATES)[number];
export type ReportForm = z.infer<typeof reportFormSchema>;
export type ReportInput = z.input<typeof reportInputSchema>;
export type ReportUpdate = z.input<typeof reportUpdateSchema>;

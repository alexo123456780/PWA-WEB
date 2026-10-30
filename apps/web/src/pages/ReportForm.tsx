import { zodResolver } from '@hookform/resolvers/zod';
import {
  REPORT_STATUSES,
  SERVICE_TYPES,
  reportFormSchema,
  type ReportForm as ReportFormValues,
} from '@fieldreport/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { requestSync } from '../autosync';
import type { LocalReport } from '../db';
import { SERVICE_LABELS, STATUS_LABELS } from '../labels';
import { go } from '../router';
import { ReportLockedError, createReport, updateReport } from '../reports';

const input = 'min-h-11 rounded-lg border border-slate-400 px-3 text-base';
// Un campo numérico vacío es "sin dato", no 0 ni NaN.
const optionalNumber = {
  setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
};

export function ReportForm({ initial }: { initial?: LocalReport }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: initial ?? { serviceType: 'MAINTENANCE', status: 'OPEN' },
  });
  const [formError, setFormError] = useState('');
  const [geoError, setGeoError] = useState('');

  function locate() {
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setValue('latitude', Number(coords.latitude.toFixed(6)));
        setValue('longitude', Number(coords.longitude.toFixed(6)));
      },
      () => setGeoError('No se pudo obtener la ubicación. Escríbela a mano.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function onSubmit(values: ReportFormValues) {
    setFormError('');
    try {
      if (initial) await updateReport(initial.clientId, values);
      else await createReport(values);
      void requestSync();
      go(initial ? `/r/${initial.clientId}` : '/');
    } catch (e) {
      setFormError(
        e instanceof ReportLockedError
          ? e.message
          : e instanceof Error && e.name === 'QuotaExceededError'
            ? 'No hay espacio en el teléfono. Libera espacio o sincroniza y elimina reportes viejos.'
            : 'No se pudo guardar el reporte.',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 p-4"
    >
      <h2 className="text-xl font-bold">
        {initial ? 'Editar reporte' : 'Nuevo reporte'}
      </h2>

      <label className="flex flex-col gap-1">
        Cliente
        <input
          {...register('customerName')}
          className={input}
          autoComplete="off"
        />
        {errors.customerName && (
          <small className="text-red-700">{errors.customerName.message}</small>
        )}
      </label>

      <label className="flex flex-col gap-1">
        Tipo de servicio
        <select {...register('serviceType')} className={input}>
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SERVICE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Estatus
        <select {...register('status')} className={input}>
          {REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Descripción
        <textarea
          {...register('description')}
          rows={5}
          className={`${input} py-2`}
        />
        {errors.description && (
          <small className="text-red-700">{errors.description.message}</small>
        )}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">Ubicación (opcional)</legend>
        <button
          type="button"
          onClick={locate}
          className="min-h-11 rounded-lg border border-teal-700 px-4 font-semibold text-teal-800"
        >
          Usar mi ubicación
        </button>
        {geoError && <small className="text-red-700">{geoError}</small>}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            Latitud
            <input
              {...register('latitude', optionalNumber)}
              type="number"
              step="any"
              inputMode="decimal"
              className={input}
            />
            {errors.latitude && (
              <small className="text-red-700">{errors.latitude.message}</small>
            )}
          </label>
          <label className="flex flex-col gap-1">
            Longitud
            <input
              {...register('longitude', optionalNumber)}
              type="number"
              step="any"
              inputMode="decimal"
              className={input}
            />
            {errors.longitude && (
              <small className="text-red-700">{errors.longitude.message}</small>
            )}
          </label>
        </div>
      </fieldset>

      {formError && (
        <p role="alert" className="text-red-700">
          {formError}
        </p>
      )}
      <div className="flex gap-3">
        <a
          href={initial ? `#/r/${initial.clientId}` : '#/'}
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-400 font-semibold"
        >
          Cancelar
        </a>
        <button
          disabled={isSubmitting}
          className="min-h-11 flex-1 rounded-lg bg-teal-700 font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}

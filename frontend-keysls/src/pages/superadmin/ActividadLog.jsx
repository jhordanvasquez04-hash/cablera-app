import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History, Building2, PlusCircle, Pencil, ShieldAlert, CircleDollarSign, KeyRound,
  Trash2, ShieldPlus, DatabaseBackup, Download,
} from 'lucide-react';
import { superadminApi } from '../../services/api';
import { Table, Tr, Td, Spinner } from '../../components/ui';

const ACCION_META = {
  EMPRESA_CREADA:      { label: 'Empresa creada',      icon: PlusCircle,       color: '#16A34A', bg: '#F0FDF4' },
  EMPRESA_ACTUALIZADA: { label: 'Empresa actualizada',  icon: Pencil,           color: '#2563EB', bg: '#EFF6FF' },
  ESTADO_CAMBIADO:     { label: 'Estado cambiado',      icon: ShieldAlert,      color: '#D97706', bg: '#FFFBEB' },
  PAGO_REGISTRADO:     { label: 'Pago registrado',      icon: CircleDollarSign, color: '#16A34A', bg: '#F0FDF4' },
  PAGO_ELIMINADO:      { label: 'Pago eliminado',       icon: Trash2,           color: '#DC2626', bg: '#FEF2F2' },
  PASSWORD_RESETEADA:  { label: 'Contraseña reseteada', icon: KeyRound,         color: '#DC2626', bg: '#FEF2F2' },
  SUPER_ADMIN_CREADO:  { label: 'Super-admin creado',   icon: ShieldPlus,       color: '#DC2626', bg: '#FEF2F2' },
  BACKUP_GENERADO:     { label: 'Backup generado',      icon: DatabaseBackup,   color: '#2563EB', bg: '#EFF6FF' },
  BACKUP_DESCARGADO:   { label: 'Backup descargado',    icon: Download,         color: '#2563EB', bg: '#EFF6FF' },
  BACKUP_ELIMINADO:    { label: 'Backup eliminado',     icon: Trash2,           color: '#D97706', bg: '#FFFBEB' },
};

function fmtFechaHora(f) {
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ActividadLog() {
  const actividadQ = useQuery({
    queryKey: ['superadmin', 'actividad'],
    queryFn: () => superadminApi.listarActividad().then((r) => r.data),
  });

  const actividades = actividadQ.data || [];

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
          <History size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Actividad</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Últimas 200 acciones sobre las empresas del sistema</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {actividadQ.isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner /></div>
        ) : (
          <Table headers={['Acción', 'Detalle', 'Empresa', 'IP', 'Fecha']}>
            {actividades.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin actividad registrada todavía</td></tr>
            ) : actividades.map((a) => {
              const meta = ACCION_META[a.accion] || { label: a.accion, icon: History, color: '#64748B', bg: '#F1F5F9' };
              const Icon = meta.icon;
              return (
                <Tr key={a.id}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: meta.bg, flexShrink: 0 }}>
                        <Icon size={13} color={meta.color} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{meta.label}</span>
                    </div>
                  </Td>
                  <Td style={{ color: 'var(--txt-3)' }}>{a.detalle || '—'}</Td>
                  <Td>
                    {a.empresa ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Building2 size={12} style={{ color: 'var(--txt-3)' }} /> {a.empresa.nombre || '(sin nombre)'}
                      </span>
                    ) : '—'}
                  </Td>
                  <Td style={{ color: 'var(--txt-3)', fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{a.ip || '—'}</Td>
                  <Td style={{ color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>{fmtFechaHora(a.createdAt)}</Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </div>
    </div>
  );
}

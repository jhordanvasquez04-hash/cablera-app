import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Database, RefreshCw, Download, Trash2, HardDrive } from 'lucide-react';
import { superadminApi } from '../../services/api';
import { Btn, Table, Tr, Td } from '../../components/ui';

function fmtTamano(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtFechaHora(f) {
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function descargar(nombre) {
  try {
    const res = await superadminApi.descargarBackup(nombre);
    const blob = new Blob([res.data], { type: 'application/sql' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre.replace(/\.enc$/, '');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error('Error al descargar el backup:', err);
    toast.error(err.response?.data?.error || 'No se pudo descargar el backup');
  }
}

export default function BaseDatos() {
  const qc = useQueryClient();
  const [borrando, setBorrando] = useState(null);

  const backupsQ = useQuery({
    queryKey: ['superadmin', 'backups'],
    queryFn: () => superadminApi.listarBackups().then((r) => r.data),
  });

  const crearM = useMutation({
    mutationFn: () => superadminApi.crearBackup(),
    onSuccess: () => { toast.success('Backup generado'); qc.invalidateQueries({ queryKey: ['superadmin', 'backups'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo generar el backup — revisá que pg_dump esté disponible en el servidor'),
  });

  const eliminarM = useMutation({
    mutationFn: (nombre) => superadminApi.eliminarBackup(nombre),
    onSuccess: () => { toast.success('Backup eliminado'); qc.invalidateQueries({ queryKey: ['superadmin', 'backups'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo eliminar el backup'),
    onSettled: () => setBorrando(null),
  });

  const backups = backupsQ.data || [];

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Database size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Base de datos</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Backups cifrados (AES-256) de toda la base de datos</p>
          </div>
        </div>
        <Btn variant="primary" icon={<RefreshCw size={14} />} loading={crearM.isPending} onClick={() => crearM.mutate()}>Generar backup ahora</Btn>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <HardDrive size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: '#92400E' }}>
          Se conservan como máximo los últimos 14 backups — los más viejos se borran solos al generar uno nuevo. Los archivos quedan cifrados en el servidor; se descifran recién al descargarlos.
        </p>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table headers={['Archivo', 'Tamaño', 'Creado', '']} loading={backupsQ.isLoading}>
          {backups.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin backups generados todavía</td></tr>
          ) : backups.map((b) => (
            <Tr key={b.nombre}>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.nombre}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{fmtTamano(b.tamanoBytes)}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{fmtFechaHora(b.creadoEn)}</Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => descargar(b.nombre)} />
                  <Btn
                    size="sm" variant="ghost" icon={<Trash2 size={13} />}
                    loading={eliminarM.isPending && borrando === b.nombre}
                    onClick={() => {
                      if (confirm(`¿Eliminar el backup ${b.nombre}? No se puede deshacer.`)) {
                        setBorrando(b.nombre);
                        eliminarM.mutate(b.nombre);
                      }
                    }}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

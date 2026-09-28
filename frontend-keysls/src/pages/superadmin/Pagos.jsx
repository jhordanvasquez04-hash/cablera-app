import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wallet, Plus, Trash2, TrendingUp, AlertTriangle, CircleDollarSign } from 'lucide-react';
import { superadminApi } from '../../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../../components/ui';

const fmt = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n ?? 0);

function periodoActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function haceTiempo(fecha) {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses > 1 ? 'es' : ''}`;
}

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}{required && <span> *</span>}</label>
      {children}
    </div>
  );
}

export default function Pagos() {
  const qc = useQueryClient();
  const periodo = periodoActual();
  const [modal, setModal] = useState(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');

  const tenantsQ = useQuery({ queryKey: ['superadmin', 'tenants'], queryFn: () => superadminApi.listarTenants().then((r) => r.data) });
  const pagosQ = useQuery({ queryKey: ['superadmin', 'pagos'], queryFn: () => superadminApi.listarPagos().then((r) => r.data) });

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['superadmin', 'pagos'] });
    qc.invalidateQueries({ queryKey: ['superadmin', 'tenants'] });
    qc.invalidateQueries({ queryKey: ['superadmin', 'resumen'] });
  };

  const registrarM = useMutation({
    mutationFn: () => superadminApi.registrarPago({
      empresaId: modal.empresaId, monto: Number(modal.monto), periodo: modal.periodo, notas: modal.notas.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Pago registrado'); setModal(null); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo registrar el pago'),
  });

  const eliminarM = useMutation({
    mutationFn: (id) => superadminApi.eliminarPago(id),
    onSuccess: () => { toast.success('Pago eliminado'); invalidar(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo eliminar el pago'),
  });

  const tenants = tenantsQ.data || [];
  const pagos = pagosQ.data || [];

  const abrirModal = (empresa) => setModal({
    empresaId: empresa ? empresa.id : '',
    monto: empresa?.montoMensual ? String(empresa.montoMensual) : '',
    periodo,
    notas: '',
  });

  const pagosPorEmpresa = useMemo(() => {
    const map = new Map();
    for (const p of pagos) if (!map.has(p.empresaId)) map.set(p.empresaId, p);
    return map;
  }, [pagos]);

  const activas = tenants.filter((t) => t.estado === 'ACTIVO');
  const recaudadoEsteMes = pagos.filter((p) => p.periodo === periodo).reduce((acc, p) => acc + Number(p.monto), 0);
  const pendienteEsteMes = activas.filter((t) => !t.alDia).reduce((acc, t) => acc + Number(t.montoMensual || 0), 0);
  const alDiaCount = activas.filter((t) => t.alDia).length;

  const pagosFiltrados = filtroEmpresa ? pagos.filter((p) => p.empresaId === filtroEmpresa) : pagos;

  const kpis = [
    { label: 'Recaudado este mes', valor: fmt(recaudadoEsteMes), icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-bg)' },
    { label: 'Pendiente este mes', valor: fmt(pendienteEsteMes), icon: AlertTriangle, color: 'var(--red)', bg: 'var(--red-bg)' },
    { label: 'Empresas al día', valor: `${alDiaCount} / ${activas.length}`, icon: CircleDollarSign, color: 'var(--blue)', bg: 'var(--blue-bg)' },
  ];

  const formValido = modal?.empresaId && Number(modal?.monto) > 0 && /^\d{4}-\d{2}$/.test(modal?.periodo || '');

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Wallet size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Pagos</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Registro manual de las cuotas mensuales — período {periodo}</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={() => abrirModal(null)} disabled={tenants.length === 0}>Registrar pago</Btn>
      </div>

      <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', padding: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <k.icon size={16} color={k.color} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)' }}>{k.valor}</div>
            <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Estado por empresa</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
        {activas.length === 0 && <p style={{ fontSize: 13, color: 'var(--txt-3)' }}>No hay empresas activas.</p>}
        {activas.map((t) => {
          const ultimo = pagosPorEmpresa.get(t.id);
          return (
            <div key={t.id} style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{t.nombre || '(sin nombre)'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>{t.montoMensual ? `Cuota: ${fmt(t.montoMensual)}/mes` : 'Sin cuota fijada'}</div>
                </div>
                <Badge color={t.alDia ? 'green' : 'yellow'}>{t.alDia ? 'Al día' : 'Pendiente'}</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-3)', marginBottom: 12 }}>
                {ultimo ? <>Último pago: <strong>{fmt(ultimo.monto)}</strong> · {ultimo.periodo} · {haceTiempo(ultimo.fechaPago)}</> : 'Sin pagos registrados'}
              </div>
              <Btn size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => abrirModal(t)} style={{ width: '100%' }}>Registrar pago</Btn>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Historial completo</h2>
        <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)} style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 12.5, outline: 'none' }}>
          <option value="">Todas las empresas</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.nombre || '(sin nombre)'}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table headers={['Empresa', 'Período', 'Monto', 'Fecha', 'Notas', '']} loading={pagosQ.isLoading}>
          {pagosFiltrados.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin pagos registrados todavía</td></tr>
          ) : pagosFiltrados.map((p) => (
            <Tr key={p.id}>
              <Td style={{ fontWeight: 700 }}>{p.empresa?.nombre || '(sin nombre)'}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{p.periodo}</Td>
              <Td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(p.monto)}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{new Date(p.fechaPago).toLocaleDateString('es-PE')} · {haceTiempo(p.fechaPago)}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{p.notas || '—'}</Td>
              <Td>
                <Btn
                  size="sm" variant="ghost" icon={<Trash2 size={13} />}
                  onClick={() => { if (confirm('¿Eliminar este pago?')) eliminarM.mutate(p.id); }}
                />
              </Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title="Registrar pago" subtitle="Anota la cuota mensual que te pagó una empresa" width={420}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Campo label="Empresa" required>
                <select
                  style={campoInputStyle} value={modal.empresaId}
                  onChange={(e) => {
                    const t = tenants.find((x) => x.id === e.target.value);
                    setModal({ ...modal, empresaId: e.target.value, monto: t?.montoMensual ? String(t.montoMensual) : modal.monto });
                  }}
                >
                  <option value="">Selecciona una empresa</option>
                  {tenants.map((t) => <option key={t.id} value={t.id}>{t.nombre || '(sin nombre)'}</option>)}
                </select>
              </Campo>
              <Campo label="Período (año-mes)" required>
                <input type="month" style={campoInputStyle} value={modal.periodo} onChange={(e) => setModal({ ...modal, periodo: e.target.value })} />
              </Campo>
              <Campo label="Monto" required>
                <input type="number" min="0" step="0.10" style={campoInputStyle} placeholder="150.00" value={modal.monto} onChange={(e) => setModal({ ...modal, monto: e.target.value })} />
              </Campo>
              <Campo label="Notas (opcional)">
                <input style={campoInputStyle} placeholder="Yape, transferencia..." value={modal.notas} onChange={(e) => setModal({ ...modal, notas: e.target.value })} />
              </Campo>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formValido || registrarM.isPending} loading={registrarM.isPending} onClick={() => registrarM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>Registrar</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

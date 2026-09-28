import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, TrendingUp, CircleDollarSign, AlertTriangle } from 'lucide-react';
import { superadminApi } from '../../services/api';
import { Btn, Spinner } from '../../components/ui';

const fmt = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n ?? 0);

function KpiCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', padding: 18 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const resumenQ = useQuery({
    queryKey: ['superadmin', 'resumen'],
    queryFn: () => superadminApi.resumen().then((r) => r.data),
  });
  const r = resumenQ.data;

  const kpis = [
    { label: 'Empresas activas', valor: r ? `${r.empresasActivas} / ${r.totalEmpresas}` : '—', icon: Building2, color: 'var(--blue)', bg: 'var(--blue-bg)' },
    { label: 'Ingreso este mes', valor: r ? fmt(r.ingresoDelMes) : '—', icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-bg)' },
    { label: 'Ingreso histórico', valor: r ? fmt(r.ingresoHistorico) : '—', icon: CircleDollarSign, color: '#7C3AED', bg: '#F3E8FF' },
    { label: 'Empresas vencidas', valor: r ? r.empresasVencidas.length : '—', icon: AlertTriangle, color: 'var(--red)', bg: 'var(--red-bg)' },
  ];

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Dashboard</h1>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--txt-3)' }}>Resumen del negocio — período {r?.periodo || '—'}</p>

      {resumenQ.isLoading ? (
        <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <>
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {kpis.map((k) => <KpiCard key={k.label} label={k.label} value={k.valor} icon={k.icon} color={k.color} bg={k.bg} />)}
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--txt)' }}>Empresas pendientes de pago este mes</span>
              <Btn variant="ghost" size="sm" onClick={() => navigate('/admin/empresas')}>Ver todas</Btn>
            </div>
            {r.empresasVencidas.length === 0 ? (
              <p style={{ padding: 18, fontSize: 13, color: 'var(--txt-3)' }}>Todas las empresas activas están al día.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {r.empresasVencidas.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{e.nombre || '(sin nombre)'}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>{e.montoMensual ? fmt(e.montoMensual) : 'sin cuota fijada'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

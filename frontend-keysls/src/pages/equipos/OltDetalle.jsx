import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Router, RefreshCw, ShieldCheck } from 'lucide-react';
import { oltApi, onuApi } from '../../services/api';
import { Btn, Badge, Input, Table, Tr, Td } from '../../components/ui';

const emptyForm = {
  numeroSerie: '', puerto: '', onuId: '', nombre: '', vlan: '', perfilServicio: '', onuType: '',
};

function fmtFechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OltDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const oltQ = useQuery({ queryKey: ['olt', id], queryFn: () => oltApi.obtener(id).then(r => r.data) });

  const pendientesQ = useQuery({
    queryKey: ['onu-pendientes', id], enabled: false,
    queryFn: () => onuApi.pendientes(id).then(r => r.data),
  });
  const tcontQ = useQuery({
    queryKey: ['onu-tcont', id], enabled: false,
    queryFn: () => onuApi.tcontPerfiles(id).then(r => r.data),
  });
  const tiposQ = useQuery({
    queryKey: ['onu-tipos', id], enabled: false,
    queryFn: () => onuApi.onuTypes(id).then(r => r.data),
  });
  const historialQ = useQuery({
    queryKey: ['onu-historial', id],
    queryFn: () => onuApi.historial(id).then(r => r.data),
  });

  const consultando = pendientesQ.isFetching || tcontQ.isFetching || tiposQ.isFetching;

  const consultarOlt = async () => {
    const [p, t, ty] = await Promise.allSettled([pendientesQ.refetch(), tcontQ.refetch(), tiposQ.refetch()]);
    if (p.status === 'rejected' || t.status === 'rejected' || ty.status === 'rejected') {
      toast.error('No se pudo consultar el OLT — revisa la conexión');
    } else {
      toast.success('OLT consultado');
    }
  };

  const nextIdM = useMutation({
    mutationFn: () => onuApi.nextId(id, form.puerto),
    onSuccess: (r) => setForm(f => ({ ...f, onuId: String(r.data.nextId) })),
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo calcular el próximo ID'),
  });

  const autorizarM = useMutation({
    mutationFn: () => onuApi.autorizar({
      oltId: id,
      numeroSerie: form.numeroSerie, puerto: form.puerto, onuId: Number(form.onuId),
      nombre: form.nombre, vlan: form.vlan, perfilServicio: form.perfilServicio, onuType: form.onuType,
    }),
    onSuccess: (r) => {
      const onu = r.data;
      if (onu.estado === 'AUTORIZADA') {
        toast.success(`ONU ${onu.numeroSerie} autorizada correctamente`);
        setForm(emptyForm);
      } else {
        toast.error(`No se pudo autorizar: ${onu.mensajeError}`);
      }
      qc.invalidateQueries({ queryKey: ['onu-historial', id] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo autorizar la ONU'),
  });

  const elegirPendiente = (p) => {
    setForm(f => ({ ...f, numeroSerie: p.numeroSerie, puerto: p.puertoCompleto, onuId: '' }));
  };

  const olt = oltQ.data;
  const pendientes = pendientesQ.data || [];
  const perfiles = tcontQ.data || [];
  const tipos = tiposQ.data || [];
  const historial = historialQ.data || [];

  const formValido = form.numeroSerie.trim() && form.puerto.trim() && form.onuId
    && form.nombre.trim() && form.vlan.trim() && form.perfilServicio.trim() && form.onuType.trim();

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <button onClick={() => navigate('/equipos/olts')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={15} /> Volver a OLTs
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
          <Router size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>{olt?.nombre || 'Cargando...'}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>
            {olt && `${olt.ip}:${olt.puerto} · ${olt.fabricante} ${olt.modelo}`}
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>Autorizar ONU</h2>
          <Btn variant="ghost" size="sm" icon={<RefreshCw size={13} />} loading={consultando} onClick={consultarOlt}>
            Consultar OLT en vivo
          </Btn>
        </div>

        {pendientesQ.data && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 8 }}>ONUs pendientes detectadas</div>
            {pendientes.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--txt-3)' }}>Ninguna ONU pendiente de autorización en este OLT</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pendientes.map((p, i) => (
                  <button
                    key={i} onClick={() => elegirPendiente(p)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-2)',
                      background: form.numeroSerie === p.numeroSerie ? 'var(--blue-bg)' : 'var(--bg-3)',
                      color: 'var(--txt)', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {p.numeroSerie} · puerto {p.puertoCompleto}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <datalist id="perfiles-tcont">
          {perfiles.map(p => <option key={p.id} value={p.nombre} />)}
        </datalist>
        <datalist id="tipos-onu">
          {tipos.map(t => <option key={t.id} value={t.nombre} />)}
        </datalist>

        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Input label="N° de serie" required value={form.numeroSerie} onChange={e => setForm({ ...form, numeroSerie: e.target.value })} placeholder="ZTEGC1234567" />
          <Input label="Puerto (slot/pon)" required value={form.puerto} onChange={e => setForm({ ...form, puerto: e.target.value })} placeholder="1/3" />
        </div>

        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
          <Input label="Nombre / descripción" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Cliente - Contrato" />
          <Input label="VLAN" required value={form.vlan} onChange={e => setForm({ ...form, vlan: e.target.value })} placeholder="100" />
        </div>

        <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="ID de ONU" required value={form.onuId} onChange={e => setForm({ ...form, onuId: e.target.value })} placeholder="1-128" />
            </div>
            <Btn variant="ghost" size="sm" loading={nextIdM.isPending} disabled={!form.puerto.trim()} onClick={() => nextIdM.mutate()}>
              Calcular
            </Btn>
          </div>
          <Input label="Perfil de servicio" required list="perfiles-tcont" value={form.perfilServicio} onChange={e => setForm({ ...form, perfilServicio: e.target.value })} placeholder="1GB-SIMETRICO" />
          <Input label="Tipo de ONU" required list="tipos-onu" value={form.onuType} onChange={e => setForm({ ...form, onuType: e.target.value })} placeholder="ZTE-F601" />
        </div>

        <Btn icon={<ShieldCheck size={14} />} disabled={!formValido || autorizarM.isPending} loading={autorizarM.isPending} onClick={() => autorizarM.mutate()}>
          Autorizar ONU
        </Btn>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>
          Historial de autorizaciones
        </div>
        <Table loading={historialQ.isLoading} headers={['Fecha', 'Serie', 'Puerto', 'ID', 'Autorizado por', 'Estado']}>
          {historial.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin autorizaciones registradas</td></tr>
          ) : historial.map(o => (
            <Tr key={o.id}>
              <Td style={{ color: 'var(--txt-3)' }}>{fmtFechaHora(o.createdAt)}</Td>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.numeroSerie}</Td>
              <Td>{o.puerto}</Td>
              <Td>{o.onuId}</Td>
              <Td>
                {o.autorizadoPorUsuario ? `${o.autorizadoPorUsuario.nombre} ${o.autorizadoPorUsuario.apellido}`
                  : o.autorizadoPorTecnico ? `${o.autorizadoPorTecnico.nombre} ${o.autorizadoPorTecnico.apellido} (técnico)`
                  : '—'}
              </Td>
              <Td>
                <Badge color={o.estado === 'AUTORIZADA' ? 'green' : 'red'} title={o.mensajeError || ''}>
                  {o.estado === 'AUTORIZADA' ? 'Autorizada' : 'Fallida'}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Table>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Router, Plus, Pencil, Search, Eye, EyeOff, Terminal, Power, PowerOff, PlugZap } from 'lucide-react';
import { oltApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { Btn, Badge, Modal, Table, Tr, Td, Input, Select } from '../../components/ui';

const MODELOS_POR_FABRICANTE = {
  ZTE: ['C300', 'C320', 'C600', 'C610', 'C620'],
};

const inputStyle = {
  width: '100%', height: 36, padding: '0 12px', background: 'var(--bg-3)',
  border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)',
  fontSize: 13, outline: 'none',
};

function SeccionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 700, color: '#2563EB',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 2,
    }}>
      {children}
    </div>
  );
}

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const emptyForm = {
  id: null, nombre: '', ip: '', puerto: '22', puertoTelnet: '23', puertoSnmp: '161', comunidadSnmp: 'public',
  fabricante: 'ZTE', modelo: '', usuario: '', password: '', notas: '',
};

export default function Olts() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const esAdmin = useAuthStore((s) => s.usuario)?.rol === 'ADMIN';

  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const oltsQ = useQuery({
    queryKey: ['olts', q],
    queryFn: () => oltApi.listar({ q: q || undefined }).then(r => r.data),
  });

  const guardarM = useMutation({
    mutationFn: () => {
      const payload = {
        nombre: modal.nombre.trim(),
        ip: modal.ip.trim(),
        puerto: modal.puerto || 22,
        puertoTelnet: modal.puertoTelnet || 23,
        puertoSnmp: modal.puertoSnmp || 161,
        comunidadSnmp: modal.comunidadSnmp || 'public',
        fabricante: modal.fabricante,
        modelo: modal.modelo,
        usuario: modal.usuario.trim(),
        notas: modal.notas || null,
        ...(modal.password ? { password: modal.password } : {}),
      };
      return modal.id
        ? oltApi.actualizar(modal.id, payload)
        : oltApi.crear(payload);
    },
    onSuccess: () => {
      toast.success(modal.id ? 'OLT actualizado' : 'OLT creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['olts'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar el OLT'),
  });

  const toggleActivoM = useMutation({
    mutationFn: (o) => oltApi.actualizar(o.id, {
      nombre: o.nombre, ip: o.ip, puerto: o.puerto, puertoTelnet: o.puertoTelnet,
      puertoSnmp: o.puertoSnmp, comunidadSnmp: o.comunidadSnmp,
      fabricante: o.fabricante, modelo: o.modelo, usuario: o.usuario, notas: o.notas,
      activo: !o.activo,
    }),
    onSuccess: (_, o) => {
      toast.success(o.activo ? 'OLT desactivado' : 'OLT activado');
      qc.invalidateQueries({ queryKey: ['olts'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo actualizar el estado'),
  });

  const testConexionM = useMutation({
    mutationFn: (id) => oltApi.testConexion(id),
    onSuccess: (r) => toast.success(`Conexión exitosa por ${r.data.protocolo} (${r.data.latenciaMs}ms)`),
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo conectar al OLT'),
  });

  const olts = oltsQ.data || [];

  const abrirNuevo = () => { setVerPassword(false); setModal(emptyForm); };
  const abrirEditar = (o) => {
    setVerPassword(false);
    setModal({
      id: o.id, nombre: o.nombre, ip: o.ip, puerto: String(o.puerto), puertoTelnet: String(o.puertoTelnet),
      puertoSnmp: String(o.puertoSnmp), comunidadSnmp: o.comunidadSnmp,
      fabricante: o.fabricante, modelo: o.modelo,
      usuario: o.usuario, password: '', notas: o.notas || '',
    });
  };

  const formValido = modal?.nombre?.trim() && modal?.ip?.trim() && modal?.fabricante
    && modal?.modelo && modal?.usuario?.trim() && (modal?.id || modal?.password?.trim());

  const modelosDisponibles = MODELOS_POR_FABRICANTE[modal?.fabricante] || [];

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <Router size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>OLTs</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Equipos de red — registro y consola SSH</p>
          </div>
        </div>
        <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Agregar OLT</Btn>
      </div>

      <div style={{ position: 'relative', marginBottom: 14, maxWidth: 340 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, IP o modelo..."
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table loading={oltsQ.isLoading} headers={['Nombre', 'IP', 'Modelo', 'Registrado', 'Estado', '']}>
          {olts.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin OLTs registrados</td></tr>
          ) : olts.map(o => (
            <Tr key={o.id} style={!o.activo ? { opacity: 0.55 } : undefined}>
              <Td style={{ fontWeight: 600 }}>
                <Link to={`/equipos/olts/${o.id}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{o.nombre}</Link>
              </Td>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.ip}:{o.puerto}</Td>
              <Td>{o.fabricante} {o.modelo}</Td>
              <Td style={{ color: 'var(--txt-3)' }}>{fmtFecha(o.createdAt)}</Td>
              <Td>
                <Badge color={o.activo ? 'green' : 'red'}>{o.activo ? 'Activo' : 'Inactivo'}</Badge>
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn
                    variant="ghost" size="sm" icon={<Terminal size={13} />}
                    disabled={!esAdmin}
                    title={esAdmin ? 'Consola SSH' : 'Solo un administrador puede abrir la consola'}
                    onClick={() => navigate(`/equipos/olts/${o.id}/terminal`)}
                  />
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(o)} />
                  <Btn
                    variant={o.activo ? 'danger' : 'ghost'}
                    size="sm"
                    icon={o.activo ? <PowerOff size={13} /> : <Power size={13} />}
                    disabled={toggleActivoM.isPending}
                    onClick={() => {
                      const accion = o.activo ? 'desactivar' : 'activar';
                      if (confirm(`¿Seguro que quieres ${accion} el OLT "${o.nombre}"?`)) {
                        toggleActivoM.mutate(o);
                      }
                    }}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.id ? 'Editar OLT' : 'Registrar OLT'}
        width={560}
      >
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <SeccionLabel>Información del dispositivo</SeccionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Nombre OLT" required placeholder="Ej: OLT-Norte" value={modal.nombre} onChange={e => setModal({ ...modal, nombre: e.target.value })} />
                <Input label="Dirección IP" required placeholder="192.168.1.1" value={modal.ip} onChange={e => setModal({ ...modal, ip: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Select
                  label="Fabricante" required value={modal.fabricante}
                  onChange={e => setModal({ ...modal, fabricante: e.target.value, modelo: '' })}
                >
                  <option value="">— Seleccionar —</option>
                  {Object.keys(MODELOS_POR_FABRICANTE).map(f => <option key={f} value={f}>{f}</option>)}
                </Select>
                <Select label="Modelo" required value={modal.modelo} onChange={e => setModal({ ...modal, modelo: e.target.value })}>
                  <option value="">— Seleccionar —</option>
                  {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </div>

              <SeccionLabel>Credenciales</SeccionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Input label="Usuario" required placeholder="admin" value={modal.usuario} onChange={e => setModal({ ...modal, usuario: e.target.value })} />
                <div style={{ position: 'relative' }}>
                  <Input
                    label="Contraseña" required={!modal.id}
                    type={verPassword ? 'text' : 'password'}
                    placeholder={modal.id ? 'Dejar en blanco para no cambiarla' : '••••••••'}
                    value={modal.password}
                    onChange={e => setModal({ ...modal, password: e.target.value })}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, bottom: 10, color: '#6B8FAE', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <SeccionLabel>Puertos de protocolo</SeccionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                <Input label="SNMP" value={modal.puertoSnmp} onChange={e => setModal({ ...modal, puertoSnmp: e.target.value })} />
                <Input label="SSH" value={modal.puerto} onChange={e => setModal({ ...modal, puerto: e.target.value })} />
                <Input label="Telnet" value={modal.puertoTelnet} onChange={e => setModal({ ...modal, puertoTelnet: e.target.value })} />
                <Input label="Comunidad SNMP" value={modal.comunidadSnmp} onChange={e => setModal({ ...modal, comunidadSnmp: e.target.value })} />
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--txt-3)' }}>
                Se intenta conectar por SSH primero; si falla, se reintenta automáticamente por Telnet.
              </p>

              {modal.id && (
                <Btn
                  variant="ghost" icon={<PlugZap size={14} />}
                  loading={testConexionM.isPending}
                  onClick={() => testConexionM.mutate(modal.id)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Probar conexión
                </Btn>
              )}

              <SeccionLabel>Notas</SeccionLabel>
              <textarea
                rows={2} placeholder="Notas (opcional)"
                style={{
                  width: '100%', padding: '10px 12px', background: '#F4F8FC', border: '1px solid #DCE6F0',
                  borderRadius: 8, color: '#0D1B2A', fontSize: 13.5, outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                value={modal.notas} onChange={e => setModal({ ...modal, notas: e.target.value })}
              />
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '18px 24px', borderTop: '1px solid #EEF2F6',
              marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22,
            }}>
              <Btn
                onClick={() => setModal(null)}
                style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}
              >
                Cancelar
              </Btn>
              <Btn
                disabled={!formValido || guardarM.isPending}
                loading={guardarM.isPending}
                onClick={() => guardarM.mutate()}
                style={{ background: '#16A34A', fontWeight: 700 }}
              >
                {modal.id ? 'Guardar cambios' : 'Registrar OLT'}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

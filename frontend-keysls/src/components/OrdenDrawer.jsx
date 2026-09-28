import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, Pencil, Calendar, Copy, UserCheck, Play, CheckCircle2, XCircle, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordenesApi, tecnicosApi, puntosRedApi, productosApi, cargosApi, clientesApi } from '../services/api';
import { Spinner, Badge, Btn, Modal } from './ui';
import { tipoLabel } from '../utils/tiposOrden';

const inputMini = {
  height: 34, padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)',
  borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none', boxSizing: 'border-box', width: '100%',
};

function FormNuevoClienteTitular({ nombreInicial, onCancelar, onCreado }) {
  const qc = useQueryClient();
  const [datos, setDatos] = useState({ nombres: nombreInicial || '', apellidos: '', dniRuc: '', telefono: '' });

  const crearM = useMutation({
    mutationFn: () => clientesApi.crear(datos).then(r => r.data),
    onSuccess: (cliente) => {
      toast.success('Cliente creado');
      qc.invalidateQueries({ queryKey: ['clientes-buscar-titular'] });
      onCreado(cliente);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear el cliente'),
  });

  const valido = datos.nombres.trim() && /^\d{8}(\d{3})?$/.test(datos.dniRuc.trim());

  return (
    <div style={{ border: '1px solid var(--border-2)', borderRadius: 8, marginTop: 6, padding: 10, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--txt)' }}>Crear nuevo cliente</span>
      <input style={inputMini} value={datos.nombres} onChange={e => setDatos({ ...datos, nombres: e.target.value })} placeholder="Nombres *" />
      <input style={inputMini} value={datos.apellidos} onChange={e => setDatos({ ...datos, apellidos: e.target.value })} placeholder="Apellidos" />
      <input style={inputMini} value={datos.dniRuc} onChange={e => setDatos({ ...datos, dniRuc: e.target.value })} placeholder="DNI (8 dígitos) o RUC (11 dígitos) *" />
      <input style={inputMini} value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} placeholder="Celular (opcional)" />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn type="button" variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Btn>
        <Btn type="button" size="sm" disabled={!valido || crearM.isPending} onClick={() => crearM.mutate()}>Crear y seleccionar</Btn>
      </div>
    </div>
  );
}

function useCerrarAlClickAfuera(abierto, setAbierto) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, [abierto, setAbierto]);
  return ref;
}

function SelectorPuntoRed({ puntos, value, onChange }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarAlClickAfuera(abierto, setAbierto);
  const seleccionado = (puntos || []).find(p => p.id === value) || null;

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    const lista = puntos || [];
    if (!term) return lista.slice(0, 50);
    return lista.filter(p =>
      p.codigo.toLowerCase().includes(term) || p.tipo.toLowerCase().includes(term) || (p.direccion || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }, [puntos, q]);

  const elegir = (id) => { onChange(id); setAbierto(false); setQ(''); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={inputMini}
        value={abierto ? q : (seleccionado ? `${seleccionado.codigo} (${seleccionado.tipo})` : '')}
        onFocus={() => { setAbierto(true); setQ(''); }}
        onChange={e => setQ(e.target.value)}
        placeholder="Punto de red (NAP/CTO)..."
      />
      {abierto && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 30, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <div onClick={() => elegir('')} style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--txt-3)', borderBottom: '1px solid var(--border)' }}>Sin asignar</div>
          {filtrados.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--txt-3)' }}>Sin resultados</div>}
          {filtrados.map(p => (
            <div key={p.id} onClick={() => elegir(p.id)} style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', color: p.id === value ? 'var(--accent, #1E3A8A)' : 'var(--txt)', fontWeight: p.id === value ? 700 : 400 }}>
              {p.codigo} <span style={{ color: 'var(--txt-3)' }}>({p.tipo})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectorEquipo({ productos, value, onChange }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarAlClickAfuera(abierto, setAbierto);
  const seleccionado = (productos || []).find(p => p.id === value) || null;

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    const lista = productos || [];
    // Sin búsqueda todavía: se muestran de entrada los equipos tipo ONU
    // (lo más probable en una instalación), pero al escribir se busca en todo el catálogo.
    if (!term) return lista.filter(p => p.categoria === 'Onu');
    return lista.filter(p => p.nombre.toLowerCase().includes(term) || (p.codigo || '').toLowerCase().includes(term)).slice(0, 50);
  }, [productos, q]);

  const elegir = (id) => { onChange(id); setAbierto(false); setQ(''); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={inputMini}
        value={abierto ? q : (seleccionado ? seleccionado.nombre : '')}
        onFocus={() => { setAbierto(true); setQ(''); }}
        onChange={e => setQ(e.target.value)}
        placeholder="Equipo instalado (ONU)..."
      />
      {abierto && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 30, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <div onClick={() => elegir('')} style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--txt-3)', borderBottom: '1px solid var(--border)' }}>Sin especificar</div>
          {!q.trim() && <div style={{ padding: '5px 10px 2px', fontSize: 10, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Onu</div>}
          {filtrados.length === 0 && <div style={{ padding: 10, fontSize: 12, color: 'var(--txt-3)' }}>Sin resultados</div>}
          {filtrados.map(p => (
            <div key={p.id} onClick={() => elegir(p.id)} style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', color: p.id === value ? 'var(--accent, #1E3A8A)' : 'var(--txt)', fontWeight: p.id === value ? 700 : 400 }}>
              {p.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BuscadorNuevoTitular({ clienteId, clienteLabel, onSeleccionar }) {
  const [q, setQ] = useState('');
  const [creando, setCreando] = useState(false);
  const clientesQ = useQuery({
    queryKey: ['clientes-buscar-titular', q],
    queryFn: () => clientesApi.listar({ q: q || undefined }).then(r => r.data),
    enabled: q.trim().length > 0,
  });
  const sinResultados = q.trim() && !clientesQ.isLoading && (clientesQ.data || []).length === 0;

  if (clienteId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{clienteLabel}</span>
        <button type="button" onClick={() => onSeleccionar(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={14} /></button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 34, border: '1px solid var(--border-2)', borderRadius: 8, background: 'var(--bg-3)' }}>
        <Search size={13} color="var(--txt-3)" />
        <input value={q} onChange={e => { setQ(e.target.value); setCreando(false); }} placeholder="Buscar por nombre o DNI/RUC..."
          style={{ border: 0, outline: 0, flex: 1, fontSize: 12, background: 'transparent', color: 'var(--txt)' }} />
      </div>
      {q.trim() && (clientesQ.data || []).length > 0 && (
        <div style={{ border: '1px solid var(--border-2)', borderRadius: 8, marginTop: 6, maxHeight: 160, overflowY: 'auto', background: 'var(--bg-card)' }}>
          {clientesQ.data.map(c => (
            <button key={c.id} type="button" onClick={() => onSeleccionar(c)}
              style={{ width: '100%', border: 0, background: 'transparent', padding: '8px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--txt)' }}><strong>{c.nombres} {c.apellidos}</strong></span>
              <span style={{ color: 'var(--txt-3)', fontSize: 11 }}>{c.dniRuc}</span>
            </button>
          ))}
        </div>
      )}
      {sinResultados && !creando && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', border: '1px dashed var(--border-2)', borderRadius: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>Sin resultados para "{q}"</span>
          <Btn type="button" size="sm" icon={<Plus size={12} />} onClick={() => setCreando(true)}>Crear cliente</Btn>
        </div>
      )}
      {creando && (
        <FormNuevoClienteTitular nombreInicial={q} onCancelar={() => setCreando(false)} onCreado={(cliente) => { setCreando(false); onSeleccionar(cliente); }} />
      )}
    </div>
  );
}

const ESTADO_ORDEN = {
  PENDIENTE: { label: 'Pendiente', color: 'yellow' },
  ASIGNADA: { label: 'Asignada', color: 'blue' },
  EN_PROCESO: { label: 'En proceso', color: 'blue' },
  COMPLETADA: { label: 'Completada', color: 'green' },
  CANCELADA: { label: 'Cancelada', color: 'red' },
};

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtFechaHora(f) {
  if (!f) return '—';
  return new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtPeriodo(p) {
  const [anio, mes] = p.split('-').map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

function ModalMesesSaltados({ data, onClose, onResuelto }) {
  const [seleccionados, setSeleccionados] = useState(new Set());

  useEffect(() => {
    if (data) setSeleccionados(new Set(data.periodos));
  }, [data]);

  const cobrarM = useMutation({
    mutationFn: () => cargosApi.generarSaltados({ contratoId: data.contratoId, periodos: Array.from(seleccionados) }),
    onSuccess: (res) => {
      toast.success(`${res.data.creados} mes(es) cobrado(s)`);
      onResuelto();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo generar el cobro'),
  });

  const descartarM = useMutation({
    mutationFn: () => cargosApi.descartarSaltados(data.contratoId),
    onSuccess: () => { toast.success('No se cobrarán esos meses'); onResuelto(); },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo descartar'),
  });

  if (!data) return null;

  return (
    <Modal open={Boolean(data)} onClose={onClose} title="Reconexión: meses sin cobrar" width={460}>
      <p style={{ fontSize: 13, color: 'var(--txt-3)', marginTop: 0 }}>
        Este contrato estuvo cortado y estos meses nunca se facturaron. ¿Quieres cobrarlos ahora?
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {data.periodos.map(p => (
          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: '1px solid var(--border-2)', borderRadius: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={seleccionados.has(p)}
              onChange={(e) => setSeleccionados(prev => {
                const next = new Set(prev);
                if (e.target.checked) next.add(p); else next.delete(p);
                return next;
              })}
            />
            <span style={{ flex: 1, fontSize: 13, textTransform: 'capitalize' }}>{fmtPeriodo(p)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>S/ {Number(data.monto).toFixed(2)}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <Btn variant="ghost" disabled={descartarM.isPending} onClick={() => descartarM.mutate()}>No cobrar ninguno</Btn>
        <Btn disabled={cobrarM.isPending || seleccionados.size === 0} onClick={() => cobrarM.mutate()}>
          Cobrar {seleccionados.size} mes{seleccionados.size !== 1 ? 'es' : ''}
        </Btn>
      </div>
    </Modal>
  );
}

export default function OrdenDrawer({ ordenId, onCerrar, onEditar }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const abierto = Boolean(ordenId);
  const [tecnicoElegido, setTecnicoElegido] = useState('');
  const [instalacion, setInstalacion] = useState({ puntoRedId: '', equipoProductoId: '', equipoSerie: '', fechaInstalacion: new Date().toISOString().slice(0, 10) });
  const [nuevoTitular, setNuevoTitular] = useState({ clienteId: '', clienteLabel: '', celular: '' });
  const [saltados, setSaltados] = useState(null);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  const { data: o, isLoading, error } = useQuery({
    queryKey: ['orden', ordenId],
    queryFn: () => ordenesApi.obtener(ordenId).then(r => r.data),
    enabled: abierto,
    staleTime: 15000,
  });

  const tecnicosQ = useQuery({ queryKey: ['tecnicos-select'], queryFn: () => tecnicosApi.listar().then(r => r.data), enabled: abierto });
  const esInstalacion = o?.tipoOrden?.startsWith('INSTALACION');
  const requiereInstalacion = Boolean(esInstalacion && ['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o?.estado) && o?.contrato);
  const esCambioTitular = o?.tipoOrden?.replace(/_[ICD]$/, '') === 'CAMBIO_TITULAR';
  const requiereNuevoTitular = Boolean(esCambioTitular && ['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o?.estado) && o?.contrato);

  const puntosQ = useQuery({ queryKey: ['puntos-red-mapa'], queryFn: () => puntosRedApi.listar().then(r => r.data), enabled: abierto && requiereInstalacion });
  const catalogoQ = useQuery({ queryKey: ['productos-catalogo-completo'], queryFn: () => productosApi.catalogo({ limit: 1000 }).then(r => r.data.data), enabled: abierto && requiereInstalacion });

  const cambiarEstadoM = useMutation({
    mutationFn: ({ estado, tecnicoId, ...resto }) => ordenesApi.cambiarEstado(ordenId, { estado, tecnicoId, ...resto }),
    onSuccess: async (_res, variables) => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['ordenes-servicio'] });
      qc.invalidateQueries({ queryKey: ['orden', ordenId] });
      qc.invalidateQueries({ queryKey: ['contratos'] });
      setTecnicoElegido('');

      if (variables.estado === 'COMPLETADA' && o?.tipoOrden?.startsWith('RECONEXION') && o?.contratoId) {
        try {
          const { data } = await cargosApi.mesesSaltados(o.contratoId);
          if (data?.periodos?.length) setSaltados({ contratoId: o.contratoId, periodos: data.periodos, monto: data.monto });
        } catch { /* silencioso: no bloquea el flujo si falla el chequeo */ }
      }
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo cambiar el estado'),
  });

  const completarOrden = () => {
    // El equipo (ONU/decodificador) es opcional — no toda instalación deja un
    // equipo físico (ej. cable directo). Solo se pide el punto de red.
    if (requiereInstalacion && !instalacion.puntoRedId) {
      toast.error('Selecciona el punto de red');
      return;
    }
    if (requiereNuevoTitular && !nuevoTitular.clienteId) {
      toast.error('Elegí el nuevo titular');
      return;
    }
    cambiarEstadoM.mutate({
      estado: 'COMPLETADA',
      ...(requiereInstalacion ? instalacion : {}),
      ...(requiereNuevoTitular ? { nuevoClienteId: nuevoTitular.clienteId, celular: nuevoTitular.celular } : {}),
    });
  };

  const copiar = (text, label = 'Copiado') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const cfg = o ? (ESTADO_ORDEN[o.estado] || { label: o.estado, color: 'blue' }) : null;

  return createPortal(
    <>
      {abierto && (
        <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', zIndex: 9998 }} />
      )}

      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100vw',
        background: 'var(--bg)', zIndex: 9999, boxShadow: '-2px 0 32px rgba(15,23,42,0.15)',
        transform: abierto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {!abierto ? null : isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
            <Spinner size={26} />
          </div>
        ) : error ? (
          <div style={{ padding: 24, background: 'var(--bg-card)', height: '100%' }}>
            <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>
            <div style={{ color: 'var(--red)', fontSize: 14, marginTop: 16 }}>Error: {error?.response?.data?.error || error.message}</div>
          </div>
        ) : o ? (
          <>
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 20px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color: 'var(--blue)' }}>{o.nServicio}</span>
                    <Badge color={cfg.color}>{cfg.label}</Badge>
                    <Badge color="blue">{tipoLabel(o.tipoOrden)}</Badge>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{o.abonado}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>
                    {fmtFecha(o.fechaServicio)}{o.tecnico && ` · ${o.tecnico.nombre} ${o.tecnico.apellido}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onEditar(o)} title="Editar orden" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={onCerrar} title="Cerrar" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--border-2)', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>

              <div style={{ background: 'var(--bg-card)', margin: '12px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Datos del servicio</span>
                </div>
                <div style={{ padding: '0 16px' }}>
                  {o.dni && <FilaDato label="DNI" value={o.dni} mono />}
                  {o.contrato && <FilaDato label="Contrato" value={o.contrato.numero} mono onCopy={() => copiar(o.contrato.numero, 'Contrato copiado')} />}
                  {o.nuevoCliente && <FilaDato label="Nuevo titular" value={`${o.nuevoCliente.nombres} ${o.nuevoCliente.apellidos || ''} — ${o.nuevoCliente.dniRuc}`.trim()} />}
                  {o.celular && <FilaDato label="Celular" value={o.celular} mono />}
                  <FilaDato label="Dirección" value={o.direccion} onCopy={() => copiar(o.direccion, 'Dirección copiada')} />
                  {o.referencia && <FilaDato label="Referencia" value={o.referencia} />}
                  {o.sector && <FilaDato label="Sector" value={o.sector} />}
                  {(o.plan || o.mbps) && <FilaDato label="Plan" value={`${o.plan?.nombre || ''}${o.mbps ? ` (${o.mbps} Mbps)` : ''}`} />}
                  {o.mensualidad != null && <FilaDato label="Mensualidad" value={`S/ ${Number(o.mensualidad).toFixed(2)}`} />}
                  <FilaDato label="Fecha servicio" value={fmtFecha(o.fechaServicio)} last={!o.observacion} />
                  {o.observacion && (
                    <div style={{ margin: '8px 0', padding: '8px 12px', background: 'var(--yellow-bg)', borderRadius: 8, border: '1px solid var(--yellow)', fontSize: 12, color: 'var(--yellow)' }}>
                      {o.observacion}
                    </div>
                  )}
                </div>
              </div>

              {(o.ipWan || o.mascara || o.gateway) && (
                <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Red</span>
                  </div>
                  <div style={{ padding: '0 16px' }}>
                    <FilaDato label="IP WAN" value={o.ipWan || '—'} mono onCopy={o.ipWan ? () => copiar(o.ipWan, 'IP copiada') : null} />
                    <FilaDato label="Máscara" value={o.mascara || '—'} mono />
                    <FilaDato label="Gateway" value={o.gateway || '—'} mono onCopy={o.gateway ? () => copiar(o.gateway, 'Gateway copiado') : null} last />
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--bg-card)', margin: '10px 14px 0', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Seguimiento</span>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {o.fechaAsignacion && <div style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={11} /> Asignada: {fmtFechaHora(o.fechaAsignacion)}</div>}
                  {o.fechaInicio && <div style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={11} /> Iniciada: {fmtFechaHora(o.fechaInicio)}</div>}
                  {o.fechaFin && <div style={{ fontSize: 12, color: 'var(--txt-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={11} /> Completada: {fmtFechaHora(o.fechaFin)}</div>}

                  {o.estado === 'PENDIENTE' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <select value={tecnicoElegido} onChange={e => setTecnicoElegido(e.target.value)}
                        style={{ flex: 1, height: 36, padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12 }}>
                        <option value="">Selecciona un técnico...</option>
                        {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
                      </select>
                      <Btn size="sm" icon={<UserCheck size={13} />} disabled={!tecnicoElegido || cambiarEstadoM.isPending}
                        onClick={() => cambiarEstadoM.mutate({ estado: 'ASIGNADA', tecnicoId: tecnicoElegido })}>
                        Asignar
                      </Btn>
                    </div>
                  )}
                  {o.estado === 'ASIGNADA' && (
                    <Btn size="sm" icon={<Play size={13} />} disabled={cambiarEstadoM.isPending} onClick={() => cambiarEstadoM.mutate({ estado: 'EN_PROCESO' })}>
                      Iniciar trabajo
                    </Btn>
                  )}
                  {['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o.estado) && (
                    <>
                      {requiereInstalacion && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Datos de instalación</span>
                          <SelectorPuntoRed puntos={puntosQ.data} value={instalacion.puntoRedId} onChange={v => setInstalacion({ ...instalacion, puntoRedId: v })} />
                          <SelectorEquipo productos={catalogoQ.data} value={instalacion.equipoProductoId} onChange={v => setInstalacion({ ...instalacion, equipoProductoId: v })} />
                          <input style={inputMini} placeholder="N° serie / MAC" value={instalacion.equipoSerie} onChange={e => setInstalacion({ ...instalacion, equipoSerie: e.target.value })} />
                          <input type="date" style={inputMini} value={instalacion.fechaInstalacion} onChange={e => setInstalacion({ ...instalacion, fechaInstalacion: e.target.value })} />
                        </div>
                      )}
                      {requiereNuevoTitular && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nuevo titular</span>
                          <BuscadorNuevoTitular
                            clienteId={nuevoTitular.clienteId}
                            clienteLabel={nuevoTitular.clienteLabel}
                            onSeleccionar={(c) => {
                              if (!c) { setNuevoTitular({ clienteId: '', clienteLabel: '', celular: '' }); return; }
                              setNuevoTitular({ clienteId: c.id, clienteLabel: `${c.nombres} ${c.apellidos || ''} — ${c.dniRuc}`.trim(), celular: c.telefono || '' });
                            }}
                          />
                          <input style={inputMini} placeholder="Celular (opcional)" value={nuevoTitular.celular} onChange={e => setNuevoTitular({ ...nuevoTitular, celular: e.target.value })} />
                        </div>
                      )}
                      <Btn size="sm" icon={<CheckCircle2 size={13} />} style={{ background: '#16A34A' }} disabled={cambiarEstadoM.isPending} onClick={completarOrden}>
                        Completar orden
                      </Btn>
                    </>
                  )}
                  {['PENDIENTE', 'ASIGNADA', 'EN_PROCESO'].includes(o.estado) && (
                    <Btn size="sm" variant="danger" icon={<XCircle size={13} />} disabled={cambiarEstadoM.isPending}
                      onClick={() => { if (confirm('¿Cancelar esta orden?')) cambiarEstadoM.mutate({ estado: 'CANCELADA' }); }}>
                      Cancelar orden
                    </Btn>
                  )}
                </div>
              </div>

              <div style={{ height: 16 }} />
            </div>
          </>
        ) : null}
      </aside>
      <ModalMesesSaltados
        data={saltados}
        onClose={() => setSaltados(null)}
        onResuelto={() => { setSaltados(null); qc.invalidateQueries({ queryKey: ['contratos'] }); }}
      />
    </>,
    document.body
  );
}

function FilaDato({ label, value, mono, onCopy, last }) {
  return (
    <div onClick={onCopy || undefined} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--border)', cursor: onCopy ? 'pointer' : 'default', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--txt-3)', minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--txt)', fontWeight: 500, fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-word' }}>{value}</span>
      {onCopy && <Copy size={11} style={{ color: 'var(--txt-3)', opacity: 0.5, flexShrink: 0 }} />}
    </div>
  );
}

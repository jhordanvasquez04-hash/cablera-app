import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileText, Plus, Pencil, Search, X, Upload, Download, FileSpreadsheet, Radar } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { clientesApi, contratosApi, planesApi, puntosRedApi, productosApi, tecnicosApi, tiposServicioApi, zonasApi, cobranzaApi, aContratoAdaptado, TIPOS_SERVICIO_ENUM } from '../services/api';
import { Btn, Badge, Modal, Table, Tr, Td } from '../components/ui';
import ContratoDrawer from '../components/ContratoDrawer';
import { tipoLabel } from '../utils/tiposOrden';

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Plantilla de Excel para importar/exportar contratos ──────────
const COLUMNAS_PLANTILLA = [
  'Contrato', 'Doc Identidad', 'Abonado', 'Direccion', 'Referencia', 'Sector',
  'Tipo de servicio', 'nombre del plan', 'dia de corte', 'telefono', 'Cintillo', 'Punto de red',
  'IP WAN', 'Mascara', 'Gateway', 'Usuario PPPoE', 'Contraseña PPPoE',
];
const ANCHOS_PLANTILLA = [14, 14, 28, 24, 20, 14, 16, 20, 12, 14, 14, 14, 16, 16, 16, 20, 20];

function descargarPlantilla() {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet([COLUMNAS_PLANTILLA]);
    ws['!cols'] = ANCHOS_PLANTILLA.map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.writeFile(wb, 'plantilla_contratos.xlsx');
  });
}

function exportarContratosExcel(contratos) {
  import('xlsx').then(XLSX => {
    const encabezados = [...COLUMNAS_PLANTILLA, 'Meses pendientes', 'Deuda (S/)'];
    const rows = contratos.map(c => ([
      c.numero,
      c.cliente?.dniRuc?.startsWith('SINDOC-') ? '' : (c.cliente?.dniRuc || ''),
      `${c.cliente?.nombres || ''} ${c.cliente?.apellidos || ''}`.trim(),
      c.direccion || '',
      c.referencia || '',
      c.sector || '',
      c.tipoServicio || '',
      c.plan?.nombre || '',
      c.diaCorte || '',
      c.cliente?.telefono || '',
      c.precinto || '',
      c.puntoRed?.codigo || '',
      c.ipWan || '',
      c.mascara || '',
      c.gateway || '',
      c.pppoeUsuario || '',
      c.pppoePassword || '',
      c.mesesPendientesTexto || '',
      Number(c.deudaPendiente || 0),
    ]));
    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...rows]);
    ws['!cols'] = [...ANCHOS_PLANTILLA, 16, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
    XLSX.writeFile(wb, `contratos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

const CLAVE_POR_ENCABEZADO = {
  'contrato': 'contrato',
  'doc identidad': 'docIdentidad',
  'abonado': 'abonado',
  'direccion': 'direccion',
  'dirección': 'direccion',
  'referencia': 'referencia',
  'sector': 'sector',
  'tipo de servicio': 'tipoServicio',
  'nombre del plan': 'nombrePlan',
  'dia de corte': 'diaCorte',
  'día de corte': 'diaCorte',
  'telefono': 'telefono',
  'teléfono': 'telefono',
  'cintillo': 'cintillo',
  'punto de red': 'puntoRed',
  'ip wan': 'ipWan',
  'mascara': 'mascara',
  'máscara': 'mascara',
  'gateway': 'gateway',
  'usuario pppoe': 'pppoeUsuario',
  'contraseña pppoe': 'pppoePassword',
  'contrasena pppoe': 'pppoePassword',
};

function parsearExcelContratos(file) {
  return import('xlsx').then(XLSX => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const filasCrudas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const [encabezados, ...datos] = filasCrudas;
        const claves = encabezados.map(h => CLAVE_POR_ENCABEZADO[String(h).trim().toLowerCase()] || null);
        const filas = datos
          .filter(fila => fila.some(v => String(v).trim() !== ''))
          .map(fila => {
            const obj = {};
            claves.forEach((clave, i) => { if (clave) obj[clave] = fila[i]; });
            return obj;
          });
        resolve(filas);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  }));
}

const ESTADOS = {
  ACTIVO: { label: 'Activo', color: 'green' },
  SUSPENDIDO: { label: 'Suspendido', color: 'yellow' },
  CORTADO: { label: 'Cortado', color: 'red' },
  BAJA: { label: 'Baja', color: 'red' },
};

const campoInputStyle = {
  width: '100%', height: 40, padding: '0 12px', background: '#E1EBF5',
  border: '1px solid #C9DAEA', borderRadius: 8, color: '#1E3A5F',
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
};

const campoInputStyleDeshabilitado = {
  ...campoInputStyle, background: '#EEF2F6', color: '#94A3B8', cursor: 'not-allowed',
};

function Campo({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}{required && <span> *</span>}</label>
      {children}
    </div>
  );
}

function SeccionLabel({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 8, borderBottom: '1px solid #E2ECF4', marginBottom: 2 }}>
      {children}
    </div>
  );
}

const emptyForm = {
  id: null, clienteId: '', clienteLabel: '', clienteData: null, clienteCelular: '',
  direccion: '', referencia: '', sector: '',
  tipoServicio: 'INTERNET', ipWan: '', mascara: '', gateway: '', pppoeUsuario: '', pppoePassword: '',
  latitud: '', longitud: '', precinto: '',
  planId: '', mbps: '', costoMensual: '', diaCorte: '',
  puntoRedId: '', equipoProductoId: '', equipoSerie: '',
  tecnicoInstaladorId: '', fechaInstalacion: '',
  estado: 'ACTIVO', motivoBaja: '', fechaBaja: '',
};

function FormNuevoCliente({ nombreInicial, onCreado, onCancelar }) {
  const qc = useQueryClient();
  const [datos, setDatos] = useState({ nombres: nombreInicial || '', apellidos: '', dniRuc: '', telefono: '', zonaId: '' });
  // zonaId no es de Keysls, pero cablera lo necesita para crear un cliente (ver aPayloadCliente).
  const zonasQ = useQuery({ queryKey: ['zonas'], queryFn: () => zonasApi.listar().then(r => r.data) });
  const zonas = zonasQ.data || [];

  useEffect(() => {
    if (!datos.zonaId && zonas[0]) setDatos((d) => ({ ...d, zonaId: zonas[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonas.length]);

  const crearM = useMutation({
    mutationFn: () => clientesApi.crear(datos).then(r => r.data),
    onSuccess: (cliente) => {
      toast.success('Cliente creado');
      qc.invalidateQueries({ queryKey: ['clientes-buscar'] });
      onCreado(cliente);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo crear el cliente'),
  });

  const valido = datos.nombres.trim() && /^\d{8}(\d{3})?$/.test(datos.dniRuc.trim()) && datos.zonaId;

  return (
    <div style={{ border: '1px solid #C9DAEA', borderRadius: 8, marginTop: 6, padding: 12, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E3A5F' }}>Crear nuevo cliente</span>
      <input value={datos.nombres} onChange={e => setDatos({ ...datos, nombres: e.target.value })} placeholder="Nombres *" style={campoInputStyle} />
      <input value={datos.apellidos} onChange={e => setDatos({ ...datos, apellidos: e.target.value })} placeholder="Apellidos" style={campoInputStyle} />
      <input value={datos.dniRuc} onChange={e => setDatos({ ...datos, dniRuc: e.target.value })} placeholder="DNI (8 dígitos) o RUC (11 dígitos) *" style={campoInputStyle} />
      <input value={datos.telefono} onChange={e => setDatos({ ...datos, telefono: e.target.value })} placeholder="Teléfono" style={campoInputStyle} />
      <select value={datos.zonaId} onChange={e => setDatos({ ...datos, zonaId: e.target.value })} style={campoInputStyle}>
        <option value="" disabled>{zonasQ.isLoading ? 'Cargando zonas...' : 'Selecciona una zona *'}</option>
        {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn type="button" variant="ghost" size="sm" onClick={onCancelar}>Cancelar</Btn>
        <Btn type="button" size="sm" disabled={!valido || crearM.isPending} onClick={() => crearM.mutate()}>Crear y seleccionar</Btn>
      </div>
    </div>
  );
}

function BuscadorCliente({ value, label, onSelect, disabled }) {
  const [q, setQ] = useState('');
  const [creando, setCreando] = useState(false);
  const clientesQ = useQuery({
    queryKey: ['clientes-buscar', q],
    queryFn: () => clientesApi.listar({ q: q || undefined }).then(r => r.data),
    enabled: q.trim().length > 0,
  });

  const sinResultados = q.trim() && !clientesQ.isLoading && (clientesQ.data || []).length === 0;

  if (value && disabled) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#EEF2F6', border: '1px solid #E2ECF4', borderRadius: 8 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>{label}</span>
      </div>
    );
  }

  return (
    <div>
      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 8 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
          <button type="button" onClick={() => onSelect(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={15} /></button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 40, border: '1px solid #C9DAEA', borderRadius: 8, background: '#E1EBF5' }}>
            <Search size={15} color="#64748B" />
            <input value={q} onChange={e => { setQ(e.target.value); setCreando(false); }} placeholder="Buscar por nombre o DNI/RUC..." style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }} />
          </div>
          {q.trim() && (clientesQ.data || []).length > 0 && (
            <div style={{ border: '1px solid #C9DAEA', borderRadius: 8, marginTop: 6, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
              {clientesQ.data.map(c => (
                <button key={c.id} type="button" onClick={() => onSelect(c)}
                  style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid #EEF2F6' }}>
                  <span><strong>{c.nombreCompleto}</strong></span>
                  <span style={{ color: '#64748B', fontSize: 12 }}>{c.dni}</span>
                </button>
              ))}
            </div>
          )}
          {sinResultados && !creando && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', border: '1px dashed #C9DAEA', borderRadius: 8 }}>
              <span style={{ fontSize: 12.5, color: '#64748B' }}>Sin resultados para "{q}"</span>
              <Btn type="button" size="sm" icon={<Plus size={13} />} onClick={() => setCreando(true)}>Crear cliente</Btn>
            </div>
          )}
          {creando && (
            <FormNuevoCliente
              nombreInicial={q}
              onCancelar={() => setCreando(false)}
              onCreado={(cliente) => { setCreando(false); onSelect(cliente); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Buscador genérico para elegir un ítem de una lista ya cargada en el
// cliente (puntos de red, catálogo de equipos) — a diferencia de clientes,
// estas listas son chicas y no vale la pena pedirlas al backend por tecleo.
function BuscadorLista({ items, value, onSelect, filtrar, renderPrincipal, renderSecundario, renderSeleccionado, placeholder, sinAsignarLabel = 'Sin asignar' }) {
  const [q, setQ] = useState('');
  const seleccionado = items.find(p => p.id === value);

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    if (!texto) return items;
    return items.filter(item => filtrar(item, texto));
  }, [items, q, filtrar]);

  if (value && seleccionado) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#E1EBF5', border: '1px solid #C9DAEA', borderRadius: 8 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{renderSeleccionado(seleccionado)}</span>
        <button type="button" onClick={() => onSelect('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}><X size={15} /></button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 40, border: '1px solid #C9DAEA', borderRadius: 8, background: '#E1EBF5' }}>
        <Search size={15} color="#64748B" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} style={{ border: 0, outline: 0, flex: 1, fontSize: 13, background: 'transparent', color: '#1E3A5F' }} />
      </div>
      <div style={{ border: '1px solid #C9DAEA', borderRadius: 8, marginTop: 6, maxHeight: 180, overflowY: 'auto', background: '#fff' }}>
        <button type="button" onClick={() => onSelect('')}
          style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #EEF2F6', color: '#64748B', fontSize: 13 }}>
          {sinAsignarLabel}
        </button>
        {filtrados.length === 0 ? (
          <p style={{ fontSize: 12, color: '#64748B', padding: '9px 12px', margin: 0 }}>Sin resultados para "{q}"</p>
        ) : filtrados.map(item => (
          <button key={item.id} type="button" onClick={() => onSelect(item.id)}
            style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', borderBottom: '1px solid #EEF2F6' }}>
            <span><strong>{renderPrincipal(item)}</strong></span>
            <span style={{ color: '#64748B', fontSize: 12 }}>{renderSecundario(item)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const CENTRO_MAPA_DEFECTO = [-8.0859, -78.9610];
const PUNTO_RED_CFG = { NAP: { label: 'Caja NAP', color: '#1E3A8A' }, CTO: { label: 'CTO', color: '#7c3aed' } };
const RADIO_COBERTURA = 150; // metros
const BREAKPOINT_MOVIL_CONTRATO = 768;

function useEsMovilContrato() {
  const [esMovil, setEsMovil] = useState(typeof window !== 'undefined' && window.innerWidth < BREAKPOINT_MOVIL_CONTRATO);
  useEffect(() => {
    const onResize = () => setEsMovil(window.innerWidth < BREAKPOINT_MOVIL_CONTRATO);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return esMovil;
}

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Acepta "lat, lng" a mano, o pegado directo de Google Maps en cualquiera de
// sus formatos de URL habituales: el de compartir "?q=", el que queda en la
// barra al navegar el mapa "/@lat,lng,zoom", y el de un link de "place"
// ("/place/.../data=...!3d<lat>!4d<lng>..."). Este último se revisa primero
// porque en un link de place el "@lat,lng" es solo el centro de la vista del
// mapa (puede estar corrido varios metros del punto real), mientras que
// "!3d!4d" es la coordenada exacta del lugar marcado.
function parsearUbicacion(texto) {
  if (!texto || !texto.trim()) return null;
  const t = texto.trim();
  const directo = t.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (directo) return { lat: parseFloat(directo[1]), lng: parseFloat(directo[2]) };
  const place = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (place) return { lat: parseFloat(place[1]), lng: parseFloat(place[2]) };
  const arroba = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (arroba) return { lat: parseFloat(arroba[1]), lng: parseFloat(arroba[2]) };
  const q = t.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}

function iconoUbicacion() {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;background:#F59E0B;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -18],
  });
}

function iconoPuntoRed(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:3px;box-shadow:0 1px 5px rgba(0,0,0,0.45);"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
  });
}

function CapturarClickMapa({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function ControladorMapa({ onMapaListo }) {
  const map = useMap();
  useEffect(() => { onMapaListo(map); }, [map, onMapaListo]);
  return null;
}

// Pantalla completa para "Nuevo contrato" (editar sigue usando el Modal de
// siempre) — a pedido del dueño, con el mapa a la derecha para marcar la
// ubicación con un clic en vez de tipear latitud/longitud a mano.
function PantallaNuevoContrato({
  modal, setModal, onCancelar, onGuardar, guardando, formValido,
  planesFiltrados, seleccionarPlan, requiereIp, puntos,
}) {
  const tieneCoords = modal.latitud !== '' && modal.latitud != null && modal.longitud !== '' && modal.longitud != null;
  const centro = tieneCoords ? [Number(modal.latitud), Number(modal.longitud)] : CENTRO_MAPA_DEFECTO;

  const [textoUbicacion, setTextoUbicacion] = useState('');
  const [panelCoberturaAbierto, setPanelCoberturaAbierto] = useState(false);
  const mapaRef = useRef(null);
  const esMovil = useEsMovilContrato();
  const [pasoMovil, setPasoMovil] = useState('form');

  const cobertura = useMemo(() => {
    if (!tieneCoords) return null;
    const conDist = puntos
      .filter(p => p.latitud != null && p.longitud != null)
      .map(p => ({ ...p, distancia: distanciaMetros(centro[0], centro[1], p.latitud, p.longitud) }))
      .sort((a, b) => a.distancia - b.distancia);
    const masCercana = conDist[0] || null;
    if (!masCercana) return { color: '#DC2626', texto: 'Sin cobertura', detalle: 'No hay puntos de red cargados', masCercana: null };

    const dentroRadio = masCercana.distancia <= RADIO_COBERTURA;
    const libres = masCercana.capacidad != null ? masCercana.capacidad - masCercana.ocupados : null;

    let color, texto;
    if (!dentroRadio) { color = '#DC2626'; texto = 'Sin cobertura'; }
    else if (libres != null && libres <= 0) { color = '#D97706'; texto = 'Cobertura limitada'; }
    else { color = '#16A34A'; texto = 'Hay cobertura'; }

    return { color, texto, masCercana, libres, dentroRadio, lista: conDist.slice(0, 5) };
  }, [tieneCoords, centro, puntos]);

  const manejarPegarUbicacion = () => {
    const ubic = parsearUbicacion(textoUbicacion);
    if (!ubic) { toast.error('No se pudo leer la ubicación. Pegá "lat, lng" o un link de Google Maps.'); return; }
    setModal(m => ({ ...m, latitud: ubic.lat, longitud: ubic.lng }));
    mapaRef.current?.setView([ubic.lat, ubic.lng], 16);
  };

  const generarPppoeUsuario = () => {
    // Cablera asigna el número de contrato recién al crearlo (no hay forma de "previsualizarlo"
    // antes) — se usa el DNI del cliente como base en su lugar, igual de único en la práctica.
    const dni = modal.clienteData?.dni;
    if (!dni) { toast.error('Este cliente no tiene DNI registrado — ingresa el usuario manualmente'); return; }
    const zona = (modal.sector || '').trim().replace(/\s+/g, '').toUpperCase();
    setModal(m => ({ ...m, pppoeUsuario: zona ? `${dni}-${zona}` : dni }));
  };

  const generarPppoePassword = () => {
    const dni = modal.clienteData?.dni;
    if (!dni) { toast.error('Este cliente no tiene DNI registrado — ingresa la contraseña manualmente'); return; }
    setModal(m => ({ ...m, pppoePassword: dni }));
  };

  return (
    <div style={{ height: 'calc(100vh - 56px)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #EEF2F6', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0D1B2A' }}>Nuevo contrato</h1>
        <button type="button" onClick={onCancelar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {(!esMovil || pasoMovil === 'form') && (
        <div style={{
          width: esMovil ? '100%' : 460, maxWidth: '100%', flex: esMovil ? 1 : '1 1 420px',
          overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18,
          borderRight: esMovil ? 'none' : '1px solid #EEF2F6',
        }}>

          <SeccionLabel>Datos del cliente</SeccionLabel>
          <BuscadorCliente
            value={modal.clienteId}
            label={modal.clienteLabel}
            onSelect={(c) => setModal(m => ({
              ...m, clienteId: c?.id || '', clienteLabel: c ? `${c.nombreCompleto} — ${c.dni || 'sin DNI'}` : '',
              clienteData: c || null, clienteCelular: c?.telefono || '',
            }))}
          />
          {modal.clienteId && (
            <Campo label="Celular">
              <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.clienteCelular}
                onChange={e => setModal({ ...modal, clienteCelular: e.target.value })} placeholder="999999999" />
            </Campo>
          )}

          <SeccionLabel>Datos del servicio</SeccionLabel>
          <Campo label="Dirección" required>
            <input style={campoInputStyle} value={modal.direccion} onChange={e => setModal({ ...modal, direccion: e.target.value })} placeholder="Av. Larco 123" />
          </Campo>
          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="Referencia">
              <input style={campoInputStyle} value={modal.referencia} onChange={e => setModal({ ...modal, referencia: e.target.value })} placeholder="Frente al parque" />
            </Campo>
            <Campo label="Sector">
              <input style={campoInputStyle} value={modal.sector} onChange={e => setModal({ ...modal, sector: e.target.value })} placeholder="Sector 4" />
            </Campo>
          </div>
          {esMovil ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              padding: '10px 12px', borderRadius: 8,
              background: tieneCoords ? 'rgba(22,163,74,0.08)' : '#F4F8FC',
              border: `1px solid ${tieneCoords ? 'rgba(22,163,74,0.3)' : '#E2ECF4'}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: tieneCoords ? '#16A34A' : '#5A7A9A' }}>
                {tieneCoords
                  ? `Ubicación marcada: ${Number(modal.latitud).toFixed(5)}, ${Number(modal.longitud).toFixed(5)}`
                  : 'Ubicación del servicio (opcional)'}
              </span>
              <Btn type="button" size="sm" variant={tieneCoords ? 'ghost' : 'primary'} onClick={() => setPasoMovil('mapa')}>
                {tieneCoords ? 'Cambiar' : 'Ubicar en mapa'}
              </Btn>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 11.5, color: '#7E9BB8' }}>
              {tieneCoords
                ? `Ubicación marcada en el mapa: ${Number(modal.latitud).toFixed(5)}, ${Number(modal.longitud).toFixed(5)}`
                : 'Hacé clic en el mapa, o usá el botón "Cobertura" para pegar un link/coordenadas, para marcar la ubicación (opcional).'}
            </p>
          )}

          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Campo label="Tipo de servicio" required>
              <select style={campoInputStyle} value={modal.tipoServicio} onChange={e => setModal({ ...modal, tipoServicio: e.target.value, planId: '' })}>
                {Object.entries(TIPOS_SERVICIO_ENUM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Campo>
            <Campo label="Plan">
              <select style={campoInputStyle} value={modal.planId} onChange={e => seleccionarPlan(e.target.value)}>
                <option value="">Sin plan / manual</option>
                {planesFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre} — S/{Number(p.precio).toFixed(2)}</option>)}
              </select>
            </Campo>
          </div>
          <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Campo label="Mbps">
              <input type="number" style={campoInputStyle} value={modal.mbps} onChange={e => setModal({ ...modal, mbps: e.target.value })} />
            </Campo>
            <Campo label="Costo mensual (S/)">
              <input type="number" step="0.01" style={campoInputStyle} value={modal.costoMensual} onChange={e => setModal({ ...modal, costoMensual: e.target.value })} />
            </Campo>
            <Campo label="Día de corte" required>
              <input type="number" min="1" max="31" style={campoInputStyle} value={modal.diaCorte} onChange={e => setModal({ ...modal, diaCorte: e.target.value })} placeholder="15" />
            </Campo>
          </div>

          {requiereIp && (
            <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Campo label="IP WAN">
                <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.ipWan} onChange={e => setModal({ ...modal, ipWan: e.target.value })} placeholder="192.168.1.10" />
              </Campo>
              <Campo label="Máscara">
                <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.mascara} onChange={e => setModal({ ...modal, mascara: e.target.value })} placeholder="255.255.255.0" />
              </Campo>
              <Campo label="Gateway">
                <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.gateway} onChange={e => setModal({ ...modal, gateway: e.target.value })} placeholder="192.168.1.1" />
              </Campo>
            </div>
          )}

          {requiereIp && (
            <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Campo label="Usuario PPPoE">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoeUsuario} onChange={e => setModal({ ...modal, pppoeUsuario: e.target.value })} placeholder="Manual o generado" />
                  <Btn type="button" variant="ghost" size="sm" onClick={generarPppoeUsuario}>Generar</Btn>
                </div>
              </Campo>
              <Campo label="Contraseña PPPoE">
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoePassword} onChange={e => setModal({ ...modal, pppoePassword: e.target.value })} placeholder="Manual o generado (DNI)" />
                  <Btn type="button" variant="ghost" size="sm" onClick={generarPppoePassword}>Generar</Btn>
                </div>
              </Campo>
            </div>
          )}
        </div>
        )}

        {(!esMovil || pasoMovil === 'mapa') && (
        <div style={{ flex: esMovil ? 1 : '2 1 320px', minHeight: 260, position: 'relative' }}>
          {esMovil && (
            <button
              type="button"
              onClick={() => setPasoMovil('form')}
              style={{
                position: 'absolute', top: 12, left: 12, zIndex: 1001,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10, border: '1px solid #E2ECF4', cursor: 'pointer',
                background: '#fff', color: '#1E3A5F', fontSize: 12, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(13,27,42,0.12)',
              }}
            >
              ← Volver a los datos
            </button>
          )}
          <MapContainer center={centro} zoom={tieneCoords ? 16 : 13} style={{ position: 'absolute', inset: 0 }}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <ControladorMapa onMapaListo={(map) => { mapaRef.current = map; }} />
            <CapturarClickMapa onPick={(lat, lng) => setModal(m => ({ ...m, latitud: lat, longitud: lng }))} />
            {puntos.filter(p => p.latitud != null && p.longitud != null).map(p => (
              <Marker key={p.id} position={[p.latitud, p.longitud]} icon={iconoPuntoRed(PUNTO_RED_CFG[p.tipo]?.color || '#64748B')}>
                <Popup>{p.codigo} — {PUNTO_RED_CFG[p.tipo]?.label || p.tipo}</Popup>
              </Marker>
            ))}
            {tieneCoords && (
              <>
                <Circle center={centro} radius={RADIO_COBERTURA} pathOptions={{ color: '#F59E0B', weight: 2, fillColor: '#F59E0B', fillOpacity: 0.1 }} />
                <Marker position={centro} icon={iconoUbicacion()} />
              </>
            )}
          </MapContainer>

          <button
            type="button"
            onClick={() => setPanelCoberturaAbierto(v => !v)}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 1001,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 10, border: '1px solid #E2ECF4', cursor: 'pointer',
              background: (panelCoberturaAbierto || tieneCoords) ? '#F59E0B' : '#fff',
              color: (panelCoberturaAbierto || tieneCoords) ? '#fff' : '#5A7A9A',
              fontSize: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(13,27,42,0.12)',
            }}
          >
            <Radar size={14} /> Cobertura
          </button>

          {panelCoberturaAbierto && (
            <div style={{
              position: 'absolute', top: 52, right: 12, zIndex: 1001, width: 250,
              background: '#fff', borderRadius: 10, border: '1px solid #E2ECF4',
              boxShadow: '0 4px 16px rgba(13,27,42,0.15)', padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Radar size={14} color="#F59E0B" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0D1B2A' }}>Cobertura</span>
                <span style={{ fontSize: 10, color: '#7E9BB8', marginLeft: 'auto' }}>radio {RADIO_COBERTURA}m</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: cobertura ? 10 : 0 }}>
                <input
                  style={{ ...campoInputStyle, flex: 1, height: 34, fontSize: 12 }}
                  placeholder='"lat, lng" o link de Maps'
                  value={textoUbicacion}
                  onChange={e => setTextoUbicacion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manejarPegarUbicacion()}
                />
                <Btn type="button" size="sm" onClick={manejarPegarUbicacion}>Ubicar</Btn>
              </div>
              {cobertura && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                    background: cobertura.color + '18', border: `1px solid ${cobertura.color}40`,
                    marginBottom: cobertura.masCercana ? 10 : 0,
                  }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: cobertura.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: cobertura.color }}>
                      {cobertura.masCercana ? `${cobertura.texto} — ${cobertura.masCercana.codigo} a ${Math.round(cobertura.masCercana.distancia)}m` : cobertura.detalle}
                    </span>
                  </div>
                  {cobertura.lista && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cobertura.lista.map(pt => {
                        const dentro = pt.distancia <= RADIO_COBERTURA;
                        const libres = pt.capacidad != null ? pt.capacidad - pt.ocupados : null;
                        return (
                          <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: dentro ? 'rgba(22,163,74,0.08)' : '#F4F8FC', fontSize: 11 }}>
                            <span style={{ fontWeight: 700, color: '#0D1B2A', minWidth: 82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pt.codigo}</span>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: dentro ? '#16A34A' : '#7E9BB8' }}>{Math.round(pt.distancia)}m</span>
                            {libres != null && <span style={{ color: libres > 0 ? '#5A7A9A' : '#DC2626', marginLeft: 'auto', fontSize: 10 }}>{libres > 0 ? `${libres} libre(s)` : 'Sin puertos'}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #EEF2F6', flexShrink: 0 }}>
        <Btn onClick={onCancelar} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
        <Btn disabled={!formValido || guardando} loading={guardando} onClick={onGuardar} style={{ background: '#1E3A8A', fontWeight: 700 }}>
          Crear contrato
        </Btn>
      </div>
    </div>
  );
}

export default function Contratos() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [q, setQ] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [deudaFiltro, setDeudaFiltro] = useState('');
  const [planFiltro, setPlanFiltro] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;
  const [resultadoImport, setResultadoImport] = useState(null);
  const inputImportarRef = useRef(null);

  // En cablera, un "Contrato" (GET /contratos) es solo la ficha técnica — numero/cliente/tipo/
  // plan/monto/día de corte viven en `servicioContratado`, y la deuda no viene incluida en
  // absoluto (hay que cruzarla con /cobranza/resumen). aContratoAdaptado (services/api.js)
  // traduce todo eso UNA vez a la forma que Keysls espera — así el resto de esta página (tabla,
  // filtros, export, editar) sigue funcionando tal cual, sin tocar cada lugar donde lee
  // `c.cliente`, `c.numero`, etc. Mismo adaptador que usa ContratoDrawer.
  const contratosQ = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const [{ data: crudos }, resumen] = await Promise.all([
        contratosApi.listar(),
        cobranzaApi.resumen().then(r => r.data).catch(() => ({ contratos: [] })),
      ]);
      const deudaPorServicio = new Map((resumen.contratos || []).map(d => [d.servicioContratadoId, d]));
      return crudos.map((c) => aContratoAdaptado(c, deudaPorServicio.get(c.servicioContratadoId)));
    },
  });

  const planesQ = useQuery({ queryKey: ['planes'], queryFn: () => planesApi.listar({ soloActivos: 'true' }).then(r => r.data) });
  const tiposServicioQ = useQuery({ queryKey: ['tipos-servicio'], queryFn: () => tiposServicioApi.listar().then(r => r.data) });
  const puntosQ = useQuery({ queryKey: ['puntos-red-mapa'], queryFn: () => puntosRedApi.listar().then(r => r.data) });
  const tecnicosQ = useQuery({ queryKey: ['tecnicos-select'], queryFn: () => tecnicosApi.listar().then(r => r.data) });
  const catalogoQ = useQuery({ queryKey: ['productos-catalogo-completo'], queryFn: () => productosApi.catalogo({ limit: 1000 }).then(r => r.data.data) });

  // Bug real (preexistente): Plan.tipoServicio en cablera es un enum en MINÚSCULA
  // ('internet'/'cable'/'duo'), pero `modal.tipoServicio` (heredado de Keysls) va en mayúscula
  // ('INTERNET') — comparados tal cual, nunca coincidían y el selector de plan quedaba
  // siempre vacío sin importar el tipo elegido.
  const planesFiltrados = useMemo(
    () => (planesQ.data || []).filter(p => !modal?.tipoServicio || p.tipoServicio?.toUpperCase() === modal.tipoServicio),
    [planesQ.data, modal?.tipoServicio],
  );

  // Fusión con Keysls: acá "un contrato" es servicio (lo que se factura) + ficha técnica (dónde
  // y cómo se instaló) en un solo POST a /contratos. Cablera lo separa en 2 llamadas — se
  // orquestan acá para que el formulario (que sigue siendo el de Keysls, sin tocar) no lo note.
  // Igual que en Keysls: tipo/plan/monto/día de corte quedan fijos tras crear (ver los campos
  // deshabilitados del modal de edición) — editar un contrato existente solo toca su ficha técnica.
  const guardarM = useMutation({
    mutationFn: async () => {
      if (modal.clienteId && modal.clienteData && modal.clienteCelular !== (modal.clienteData.telefono || '')) {
        await clientesApi.actualizar(modal.clienteId, { ...modal.clienteData, telefono: modal.clienteCelular });
      }

      const fichaTecnica = {
        direccion: modal.direccion || undefined,
        referencia: modal.referencia || undefined,
        sector: modal.sector || undefined,
        ipWan: modal.ipWan || undefined,
        mascara: modal.mascara || undefined,
        gateway: modal.gateway || undefined,
        pppoeUsuario: modal.pppoeUsuario || undefined,
        pppoePassword: modal.pppoePassword || undefined,
        latitud: modal.latitud !== '' && modal.latitud != null ? Number(modal.latitud) : undefined,
        longitud: modal.longitud !== '' && modal.longitud != null ? Number(modal.longitud) : undefined,
        precinto: modal.precinto || undefined,
        puntoRedId: modal.puntoRedId || undefined,
        equipoProductoId: modal.equipoProductoId || undefined,
        equipoSerie: modal.equipoSerie || undefined,
        tecnicoInstaladorId: modal.tecnicoInstaladorId || undefined,
        fechaInstalacion: modal.fechaInstalacion || undefined,
      };

      if (modal.id) {
        return contratosApi.actualizar(modal.id, fichaTecnica);
      }

      const tipoServicio = (tiposServicioQ.data || []).find(
        (t) => t.nombre.trim().toLowerCase() === modal.tipoServicio.toLowerCase(),
      );
      if (!tipoServicio) {
        throw { response: { data: { error: `No existe un tipo de servicio "${TIPOS_SERVICIO_ENUM[modal.tipoServicio]}" en el catálogo — créalo primero en Configuración.` } } };
      }

      // "Antes" fresco (no lo que trae `modal.clienteData`, que puede estar desactualizado) para
      // detectar por diferencia cuál de los servicios del cliente es el recién creado.
      const antes = (await clientesApi.obtener(modal.clienteId)).data;
      const idsAntes = new Set(antes.serviciosContratados.map((s) => s.id));

      const clienteActualizado = (await clientesApi.agregarServicio(modal.clienteId, {
        tipoServicioId: tipoServicio.id,
        montoBase: Number(modal.costoMensual) || 0,
        fechaFacturacionOverride: modal.diaCorte ? Number(modal.diaCorte) : undefined,
        planId: modal.planId || undefined,
      })).data;

      const nuevoServicio = clienteActualizado.serviciosContratados.find((s) => !idsAntes.has(s.id));
      if (!nuevoServicio) {
        throw { response: { data: { error: 'El servicio se creó pero no se pudo ubicar para completar su ficha técnica.' } } };
      }

      return contratosApi.crear({ servicioContratadoId: nuevoServicio.id, ...fichaTecnica });
    },
    onSuccess: () => {
      toast.success(modal.id ? 'Contrato actualizado' : 'Contrato creado');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['contratos'] });
      qc.invalidateQueries({ queryKey: ['clientes-buscar'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo guardar el contrato'),
  });

  const importarM = useMutation({
    mutationFn: (filas) => contratosApi.importar(filas).then(r => r.data),
    onSuccess: (data) => {
      setResultadoImport(data);
      qc.invalidateQueries({ queryKey: ['contratos'] });
      if (data.creados > 0) toast.success(`${data.creados} contrato(s) importado(s)`);
      else toast('No se importó ningún contrato nuevo', { icon: '⚠️' });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se pudo importar el archivo'),
  });

  const manejarArchivoImportar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const filas = await parsearExcelContratos(file);
      if (filas.length === 0) { toast.error('El archivo no tiene filas para importar'); return; }
      importarM.mutate(filas);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo leer el archivo. Verifica que sea un Excel válido.');
    }
  };

  const contratos = contratosQ.data || [];

  // Bug real (preexistente): `contratosApi.listar()` en cablera no acepta filtros por query —
  // trae todo siempre. La búsqueda y el filtro de estado, que antes se mandaban al backend, se
  // aplican acá para no perder la funcionalidad.
  const contratosFiltrados = useMemo(() => {
    let lista = contratos;
    const texto = q.trim().toLowerCase();
    if (texto) {
      lista = lista.filter(c => (
        (c.cliente?.nombres || '').toLowerCase().includes(texto) ||
        (c.cliente?.dniRuc || '').toLowerCase().includes(texto) ||
        (c.numero || '').toLowerCase().includes(texto)
      ));
    }
    if (estadoFiltro) lista = lista.filter(c => c.estado === estadoFiltro);

    if (deudaFiltro === 'aldia') lista = lista.filter(c => !(c.deudaPendiente > 0));
    else if (deudaFiltro === 'condeuda') lista = lista.filter(c => c.deudaPendiente > 0);
    else if (deudaFiltro === 'deuda1') lista = lista.filter(c => c.mesesPendientesCount === 1);
    else if (deudaFiltro === 'deuda2') lista = lista.filter(c => c.mesesPendientesCount === 2);
    else if (deudaFiltro === 'deuda3mas') lista = lista.filter(c => c.mesesPendientesCount >= 3);

    if (planFiltro === 'sinplan') lista = lista.filter(c => !c.planId);
    else if (planFiltro) lista = lista.filter(c => c.planId === planFiltro);

    return lista;
  }, [contratos, q, estadoFiltro, deudaFiltro, planFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(contratosFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const contratosPagina = contratosFiltrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [q, estadoFiltro, deudaFiltro, planFiltro]);

  const abrirNuevo = () => setModal(emptyForm);
  // En cablera, lo que Keysls guarda directo en el Contrato (numero, cliente, tipoServicio,
  // plan, mbps, costoMensual, diaCorte) en realidad vive en `servicioContratado` — el Contrato
  // acá es solo la ficha técnica. Se traduce acá para que el resto del formulario (que sigue
  // siendo el de Keysls) no lo note. `tipoServicio` se resuelve por nombre del catálogo real
  // contra el enum fijo (ver TIPOS_SERVICIO_ENUM) — si el catálogo tiene un nombre distinto de
  // "internet/cable/duo" no hay forma de saber cuál casilla marcar, así que no se selecciona.
  // `c` acá ya viene traducido por contratosQ (ver más arriba) — se lee tal cual, como en el
  // Keysls original. `clienteData` guarda el cliente REAL (forma cablera) para que, si se le
  // cambia el celular, `clientesApi.actualizar` en guardarM lo mande bien formado.
  const abrirEditar = (c) => setModal({
    id: c.id, numeroCompleto: c.numero, clienteId: c.clienteId,
    clienteLabel: `${c.cliente?.nombres || ''} — ${c.cliente?.dniRuc || 'sin DNI'}`,
    clienteData: c.clienteReal || null, clienteCelular: c.cliente?.telefono || '',
    direccion: c.direccion || '', referencia: c.referencia || '', sector: c.sector || '',
    tipoServicio: c.tipoServicio, ipWan: c.ipWan || '', mascara: c.mascara || '', gateway: c.gateway || '',
    pppoeUsuario: c.pppoeUsuario || '', pppoePassword: c.pppoePassword || '',
    latitud: c.latitud ?? '', longitud: c.longitud ?? '', precinto: c.precinto || '',
    planId: c.planId || '', mbps: c.mbps ?? '', costoMensual: c.costoMensual ?? '', diaCorte: c.diaCorte ?? '',
    puntoRedId: c.puntoRedId || '', equipoProductoId: c.equipoProductoId ?? '', equipoSerie: c.equipoSerie || '',
    tecnicoInstaladorId: c.tecnicoInstaladorId || '', fechaInstalacion: c.fechaInstalacion ? c.fechaInstalacion.slice(0, 10) : '',
    estado: c.estado, motivoBaja: c.motivoBaja || '', fechaBaja: c.fechaBaja ? c.fechaBaja.slice(0, 10) : '',
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const editarId = location.state?.editar;
    if (!editarId || contratos.length === 0) return;
    const encontrado = contratos.find(c => c.id === editarId);
    if (encontrado) abrirEditar(encontrado);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratos, location.state]);

  const requiereIp = modal?.tipoServicio === 'INTERNET' || modal?.tipoServicio === 'DUO';
  const requiereBaja = modal?.estado === 'BAJA' || modal?.estado === 'CORTADO';
  const diaCorteValido = Number.isInteger(Number(modal?.diaCorte)) && Number(modal?.diaCorte) >= 1 && Number(modal?.diaCorte) <= 31;
  const formValido = modal?.clienteId && modal?.direccion?.trim() && modal?.tipoServicio && diaCorteValido;

  const tieneCoordsEditar = modal?.latitud !== '' && modal?.latitud != null && modal?.longitud !== '' && modal?.longitud != null;
  const centroEditar = tieneCoordsEditar ? [Number(modal.latitud), Number(modal.longitud)] : CENTRO_MAPA_DEFECTO;

  const seleccionarPlan = (planId) => {
    const plan = (planesQ.data || []).find(p => p.id === planId);
    setModal(m => ({ ...m, planId, mbps: plan?.mbps ?? m.mbps, costoMensual: plan?.precio ?? m.costoMensual }));
  };

  if (modal && !modal.id) {
    return (
      <PantallaNuevoContrato
        modal={modal}
        setModal={setModal}
        onCancelar={() => setModal(null)}
        onGuardar={() => guardarM.mutate()}
        guardando={guardarM.isPending}
        formValido={formValido}
        planesFiltrados={planesFiltrados}
        seleccionarPlan={seleccionarPlan}
        requiereIp={requiereIp}
        puntos={puntosQ.data || []}
      />
    );
  }

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)' }}>
            <FileText size={19} color="var(--blue)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>Contratos</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>Contratos de Internet, Cable y Dúo</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="ghost" icon={<Download size={14} />} onClick={descargarPlantilla}>Plantilla</Btn>
          <Btn variant="ghost" icon={<FileSpreadsheet size={14} />} disabled={contratosFiltrados.length === 0} onClick={() => exportarContratosExcel(contratosFiltrados)}>Exportar</Btn>
          <Btn variant="ghost" icon={<Upload size={14} />} disabled={importarM.isPending} loading={importarM.isPending} onClick={() => inputImportarRef.current?.click()}>
            Importar Excel
          </Btn>
          <input ref={inputImportarRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={manejarArchivoImportar} />
          <Btn variant="primary" icon={<Plus size={14} />} onClick={abrirNuevo}>Nuevo contrato</Btn>
        </div>
      </div>

      <div className="resp-toolbar" style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por número, cliente, dirección..."
            style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 160 }}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={deudaFiltro} onChange={e => setDeudaFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 160 }}>
          <option value="">Todos (deuda)</option>
          <option value="aldia">Al día</option>
          <option value="condeuda">Con deuda</option>
          <option value="deuda1">Debe 1 mes</option>
          <option value="deuda2">Debe 2 meses</option>
          <option value="deuda3mas">Debe 3+ meses</option>
        </select>
        <select value={planFiltro} onChange={e => setPlanFiltro(e.target.value)}
          style={{ height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, minWidth: 160 }}>
          <option value="">Todos los planes</option>
          <option value="sinplan">Sin plan</option>
          {(planesQ.data || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 12, color: 'var(--txt-3)', margin: '0 0 10px' }}>
        {contratosFiltrados.length} contrato{contratosFiltrados.length !== 1 ? 's' : ''}
        {contratosFiltrados.length !== contratos.length ? ` de ${contratos.length} totales` : ''}
      </p>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="resp-table">
        <Table loading={contratosQ.isLoading} headers={['N° Contrato', 'Abonado', 'DNI', 'Dirección / Sector', 'Celular', 'Plan', 'Estado', 'Deuda', 'Última actividad', '']}>
          {contratosPagina.length === 0 ? (
            <tr><td colSpan={10} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin contratos registrados</td></tr>
          ) : contratosPagina.map(c => (
            <Tr key={c.id} onClick={() => setDrawerId(c.id)} style={{ cursor: 'pointer' }}>
              <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>{c.numero}</Td>
              <Td style={{ fontWeight: 600 }}>{c.cliente?.nombres} {c.cliente?.apellidos}</Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-3)', fontFamily: 'var(--font-mono)' }}>{c.cliente?.dniRuc || '—'}</Td>
              <Td style={{ maxWidth: 200 }}>
                <div style={{ fontSize: 12, color: 'var(--txt-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.direccion}</div>
                {c.sector && <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>{c.sector}</div>}
              </Td>
              <Td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{c.cliente?.telefono || '—'}</Td>
              <Td>
                {c.mbps ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700 }}>
                    {c.mbps} Mbps
                  </span>
                ) : <span style={{ color: 'var(--txt-3)', fontSize: 12 }}>{c.plan?.nombre || '—'}</span>}
              </Td>
              <Td><Badge color={ESTADOS[c.estado]?.color || 'blue'}>{ESTADOS[c.estado]?.label || c.estado}</Badge></Td>
              <Td>
                {c.deudaPendiente > 0 ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: c.deudaVencida ? '#DC2626' : '#D97706' }}>
                    S/ {Number(c.deudaPendiente).toFixed(2)} · {c.mesesPendientesTexto}
                  </span>
                ) : <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 600 }}>Al día</span>}
              </Td>
              <Td style={{ fontSize: 12, color: 'var(--txt-3)', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{fmtFecha(c.ultimaActividad)}</div>
                {c.ultimoTipoOrden && <div style={{ fontSize: 10, marginTop: 1 }}>{tipoLabel(c.ultimoTipoOrden)}</div>}
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(c); }} />
                </div>
              </Td>
            </Tr>
          ))}
        </Table>
        </div>

        <div className="resp-cards">
          {contratosPagina.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin contratos registrados</div>
          ) : contratosPagina.map(c => (
            <div key={c.id} className="resp-card" onClick={() => setDrawerId(c.id)}>
              <div className="resp-card-top">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{c.cliente?.nombres} {c.cliente?.apellidos}</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--blue)' }}>{c.numero}</span>
                </div>
                <Badge color={ESTADOS[c.estado]?.color || 'blue'}>{ESTADOS[c.estado]?.label || c.estado}</Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>{c.direccion}{c.sector ? ` · ${c.sector}` : ''}</div>
              <div className="resp-card-tags">
                {c.mbps ? (
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700 }}>{c.mbps} Mbps</span>
                ) : c.plan?.nombre && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{c.plan.nombre}</span>}
                {c.cliente?.telefono && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{c.cliente.telefono}</span>}
                {c.cliente?.dniRuc && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{c.cliente.dniRuc}</span>}
              </div>
              <div className="resp-card-row">
                {c.deudaPendiente > 0 ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: c.deudaVencida ? '#DC2626' : '#D97706' }}>
                    S/ {Number(c.deudaPendiente).toFixed(2)} · {c.mesesPendientesTexto}
                  </span>
                ) : <span style={{ color: '#16A34A', fontWeight: 600 }}>Al día</span>}
                <span>{fmtFecha(c.ultimaActividad)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignSelf: 'flex-end' }}>
                <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}>Editar</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPaginas > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <Btn variant="ghost" size="sm" disabled={paginaSegura <= 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>
            Anterior
          </Btn>
          <span style={{ fontSize: 13, color: 'var(--txt-3)' }}>Página {paginaSegura} de {totalPaginas}</span>
          <Btn variant="ghost" size="sm" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>
            Siguiente
          </Btn>
        </div>
      )}

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title="Editar contrato" width={620}>
        {modal && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <SeccionLabel>Cliente</SeccionLabel>
              <BuscadorCliente
                value={modal.clienteId}
                label={modal.clienteLabel}
                disabled={Boolean(modal.id)}
                onSelect={(c) => setModal(m => ({
                  ...m, clienteId: c?.id || '', clienteLabel: c ? `${c.nombres} ${c.apellidos || ''} — ${c.dniRuc}` : '',
                  clienteData: c || null, clienteCelular: c?.telefono || '',
                }))}
              />
              {modal.id && (
                <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#7E9BB8' }}>
                  El titular solo se cambia desde una orden de <strong>Cambio de titular</strong> — así queda registro de cuándo y por qué cambió.
                </p>
              )}
              {modal.clienteId && (
                <Campo label="Celular">
                  <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.clienteCelular}
                    onChange={e => setModal({ ...modal, clienteCelular: e.target.value })} placeholder="999999999" />
                </Campo>
              )}

              <SeccionLabel>Ubicación</SeccionLabel>
              <Campo label="Dirección" required>
                <input style={campoInputStyle} value={modal.direccion} onChange={e => setModal({ ...modal, direccion: e.target.value })} placeholder="Av. Larco 123" />
              </Campo>
              <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Campo label="Referencia">
                  <input style={campoInputStyle} value={modal.referencia} onChange={e => setModal({ ...modal, referencia: e.target.value })} placeholder="Frente al parque" />
                </Campo>
                <Campo label="Sector">
                  <input style={campoInputStyle} value={modal.sector} onChange={e => setModal({ ...modal, sector: e.target.value })} placeholder="Sector 4" />
                </Campo>
              </div>
              <Campo label="Ubicación">
                <div style={{ height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid #C9DAEA' }}>
                  <MapContainer center={centroEditar} zoom={tieneCoordsEditar ? 16 : 13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <CapturarClickMapa onPick={(lat, lng) => setModal(m => ({ ...m, latitud: lat, longitud: lng }))} />
                    {tieneCoordsEditar && <Marker position={centroEditar} icon={iconoUbicacion()} />}
                  </MapContainer>
                </div>
              </Campo>
              <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#7E9BB8' }}>
                {tieneCoordsEditar
                  ? `Ubicación marcada: ${Number(modal.latitud).toFixed(5)}, ${Number(modal.longitud).toFixed(5)}`
                  : 'Hacé clic en el mapa para marcar la ubicación del servicio (opcional).'}
              </p>
              {modal.id && (
                <Campo label="Punto de red (NAP/CTO)">
                  <BuscadorLista
                    items={puntosQ.data || []}
                    value={modal.puntoRedId}
                    onSelect={(puntoRedId) => setModal({ ...modal, puntoRedId })}
                    placeholder="Buscar por código NAP/CTO..."
                    filtrar={(p, t) => p.codigo.toLowerCase().includes(t) || p.tipo.toLowerCase().includes(t)}
                    renderPrincipal={(p) => p.codigo}
                    renderSecundario={(p) => p.tipo}
                    renderSeleccionado={(p) => `${p.codigo} (${p.tipo})`}
                  />
                </Campo>
              )}

              <SeccionLabel>Servicio</SeccionLabel>
              <Campo label="Tipo de servicio" required>
                <select disabled={Boolean(modal.id)} style={modal.id ? campoInputStyleDeshabilitado : campoInputStyle} value={modal.tipoServicio} onChange={e => setModal({ ...modal, tipoServicio: e.target.value, planId: '' })}>
                  {Object.entries(TIPOS_SERVICIO_ENUM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Campo>
              <Campo label="Plan">
                <select disabled={Boolean(modal.id)} style={modal.id ? campoInputStyleDeshabilitado : campoInputStyle} value={modal.planId} onChange={e => seleccionarPlan(e.target.value)}>
                  <option value="">Sin plan / manual</option>
                  {planesFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre} — S/{Number(p.precio).toFixed(2)}</option>)}
                </select>
              </Campo>
              <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Campo label="Mbps">
                  <input type="number" disabled={Boolean(modal.id)} style={modal.id ? campoInputStyleDeshabilitado : campoInputStyle} value={modal.mbps} onChange={e => setModal({ ...modal, mbps: e.target.value })} />
                </Campo>
                <Campo label="Costo mensual (S/)">
                  <input type="number" step="0.01" disabled={Boolean(modal.id)} style={modal.id ? campoInputStyleDeshabilitado : campoInputStyle} value={modal.costoMensual} onChange={e => setModal({ ...modal, costoMensual: e.target.value })} />
                </Campo>
                <Campo label="Día de corte" required>
                  <input type="number" min="1" max="31" style={campoInputStyle} value={modal.diaCorte} onChange={e => setModal({ ...modal, diaCorte: e.target.value })} placeholder="15" />
                </Campo>
              </div>
              {modal.id && (
                <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#7E9BB8' }}>
                  El tipo de servicio, plan, Mbps y costo mensual solo se cambian desde una orden de <strong>Cambio de plan</strong> (o Instalación/Reconexión) — así queda registro de cuándo y por qué cambió.
                </p>
              )}

              {requiereIp && (
                <div className="resp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <Campo label="IP WAN">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.ipWan} onChange={e => setModal({ ...modal, ipWan: e.target.value })} placeholder="192.168.1.10" />
                  </Campo>
                  <Campo label="Máscara">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.mascara} onChange={e => setModal({ ...modal, mascara: e.target.value })} placeholder="255.255.255.0" />
                  </Campo>
                  <Campo label="Gateway">
                    <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.gateway} onChange={e => setModal({ ...modal, gateway: e.target.value })} placeholder="192.168.1.1" />
                  </Campo>
                </div>
              )}

              {requiereIp && (
                <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Campo label="Usuario PPPoE">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoeUsuario} onChange={e => setModal({ ...modal, pppoeUsuario: e.target.value })} placeholder="Manual o generado" />
                      <Btn type="button" variant="ghost" size="sm" onClick={() => {
                        const zona = (modal.sector || '').trim().replace(/\s+/g, '').toUpperCase();
                        // Si el contrato ya existe usa su número real (numeroCompleto, ver
                        // aContratoEditable); si no hay DNI ni número, no hay de dónde generarlo.
                        const base = modal.numeroCompleto || modal.clienteData?.dniRuc;
                        if (!base || String(base).startsWith('SINDOC-')) { toast.error('No hay número de contrato ni DNI/RUC para generar el usuario'); return; }
                        setModal(m => ({ ...m, pppoeUsuario: zona ? `${base}-${zona}` : base }));
                      }}>Generar</Btn>
                    </div>
                  </Campo>
                  <Campo label="Contraseña PPPoE">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input style={{ ...campoInputStyle, fontFamily: 'monospace' }} value={modal.pppoePassword} onChange={e => setModal({ ...modal, pppoePassword: e.target.value })} placeholder="Manual o generado (DNI)" />
                      <Btn type="button" variant="ghost" size="sm" onClick={() => {
                        const dni = modal.clienteData?.dniRuc;
                        if (!dni || dni.startsWith('SINDOC-')) { toast.error('Este cliente no tiene DNI/RUC registrado — ingresa la contraseña manualmente'); return; }
                        setModal(m => ({ ...m, pppoePassword: dni }));
                      }}>Generar</Btn>
                    </div>
                  </Campo>
                </div>
              )}

              {modal.id && (
                <>
                  <SeccionLabel>Instalación</SeccionLabel>
                  <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#64748B' }}>
                    Estos datos se completan normalmente al cerrar la orden de instalación del técnico.
                  </p>
                  <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Campo label="Equipo instalado (ONU)">
                      <BuscadorLista
                        items={(catalogoQ.data || []).filter((p) => p.categoria === 'Onu')}
                        value={modal.equipoProductoId}
                        onSelect={(equipoProductoId) => setModal({ ...modal, equipoProductoId })}
                        placeholder="Buscar ONU por nombre o código..."
                        sinAsignarLabel="Sin especificar"
                        filtrar={(p, t) => p.nombre.toLowerCase().includes(t) || (p.codigo || '').toLowerCase().includes(t)}
                        renderPrincipal={(p) => p.nombre}
                        renderSecundario={(p) => p.codigo || p.categoria || ''}
                        renderSeleccionado={(p) => p.nombre}
                      />
                    </Campo>
                    <Campo label="N° serie / MAC">
                      <input style={campoInputStyle} value={modal.equipoSerie} onChange={e => setModal({ ...modal, equipoSerie: e.target.value })} placeholder="ABCD1234" />
                    </Campo>
                  </div>
                  <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Campo label="Técnico instalador">
                      <select style={campoInputStyle} value={modal.tecnicoInstaladorId} onChange={e => setModal({ ...modal, tecnicoInstaladorId: e.target.value })}>
                        <option value="">Sin especificar</option>
                        {(tecnicosQ.data || []).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
                      </select>
                    </Campo>
                    <Campo label="Fecha de instalación">
                      <input type="date" style={campoInputStyle} value={modal.fechaInstalacion} onChange={e => setModal({ ...modal, fechaInstalacion: e.target.value })} />
                    </Campo>
                  </div>
                  <Campo label="Precinto">
                    <input style={campoInputStyle} value={modal.precinto} onChange={e => setModal({ ...modal, precinto: e.target.value })} placeholder="PR-00123" />
                  </Campo>
                </>
              )}

              <SeccionLabel>Estado</SeccionLabel>
              <Campo label="Estado del contrato" required>
                <select disabled={Boolean(modal.id)} style={modal.id ? campoInputStyleDeshabilitado : campoInputStyle} value={modal.estado} onChange={e => setModal({ ...modal, estado: e.target.value })}>
                  {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Campo>
              {modal.id && (
                <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#7E9BB8' }}>
                  El estado cambia solo al completar una orden (Corte, Reconexión, Baja de servicio, etc.) — así queda registro de por qué cambió.
                </p>
              )}
              {requiereBaja && (
                <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Campo label="Motivo">
                    <input style={campoInputStyle} value={modal.motivoBaja} onChange={e => setModal({ ...modal, motivoBaja: e.target.value })} placeholder="Falta de pago, mudanza..." />
                  </Campo>
                  <Campo label="Fecha">
                    <input type="date" style={campoInputStyle} value={modal.fechaBaja} onChange={e => setModal({ ...modal, fechaBaja: e.target.value })} />
                  </Campo>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '18px 24px', borderTop: '1px solid #EEF2F6', marginTop: 20, marginLeft: -24, marginRight: -24, marginBottom: -22 }}>
              <Btn onClick={() => setModal(null)} style={{ background: '#FFFFFF', color: '#1E3A5F', border: '1px solid #C9DAEA', fontWeight: 600 }}>Cancelar</Btn>
              <Btn disabled={!formValido || guardarM.isPending} loading={guardarM.isPending} onClick={() => guardarM.mutate()} style={{ background: '#1E3A8A', fontWeight: 700 }}>
                {modal.id ? 'Guardar cambios' : 'Crear contrato'}
              </Btn>
            </div>
          </>
        )}
      </Modal>

      <ContratoDrawer
        contratoId={drawerId}
        onCerrar={() => setDrawerId(null)}
        onEditar={(c) => { setDrawerId(null); abrirEditar(c); }}
      />

      <Modal open={Boolean(resultadoImport)} onClose={() => setResultadoImport(null)} title="Resultado de la importación" width={520}>
        {resultadoImport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>CREADOS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#15803D' }}>{resultadoImport.creados}</div>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>OMITIDOS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#B45309' }}>{resultadoImport.omitidos.length}</div>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>ERRORES</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{resultadoImport.errores.length}</div>
              </div>
            </div>

            {resultadoImport.omitidos.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 6 }}>Omitidos</div>
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultadoImport.omitidos.map((o, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#64748B' }}>Fila {o.fila}: {o.motivo}</div>
                  ))}
                </div>
              </div>
            )}

            {resultadoImport.errores.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>Errores</div>
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {resultadoImport.errores.map((o, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#64748B' }}>Fila {o.fila}: {o.motivo}</div>
                  ))}
                </div>
              </div>
            )}

            <Btn onClick={() => setResultadoImport(null)} style={{ alignSelf: 'flex-end' }}>Cerrar</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

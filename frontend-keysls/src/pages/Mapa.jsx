import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Search, Plus, X, Trash2, Pencil, Crosshair, Radar, Navigation, Layers, Upload } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { clientesApi, contratosApi, puntosRedApi } from '../services/api';

const PUNTO_CFG = {
  NAP: { label: 'Caja NAP', color: '#1E3A8A' },
  CTO: { label: 'CTO', color: '#7c3aed' },
};
const ESTADO_PUNTO_CFG = {
  ACTIVA: { label: 'Activa', color: '#3fb950' },
  SATURADA: { label: 'Saturada', color: '#ef4444' },
  MANTENIMIENTO: { label: 'Mantenimiento', color: '#e3b341' },
};
const TIPOS_SERVICIO_LABEL = { INTERNET: 'Internet', CABLE: 'Cable', DUO: 'Dúo' };
const ESTADO_CONTRATO_CFG = {
  ACTIVO: { label: 'Activo', color: '#3fb950' },
  SUSPENDIDO: { label: 'Suspendido', color: '#e3b341' },
  CORTADO: { label: 'Cortado', color: '#ef4444' },
  BAJA: { label: 'Baja', color: '#94a3b8' },
};

const RADIO_COBERTURA = 150; // metros
const BREAKPOINT_MOVIL = 768;
const CENTRO_MAPA = [-8.0859, -78.9610];
const RADIO_ALERTA_KML_M = 50000; // puntos del KML a más de 50km del centro se marcan como sospechosos

function useEsMovil() {
  const [esMovil, setEsMovil] = useState(typeof window !== 'undefined' && window.innerWidth < BREAKPOINT_MOVIL);
  useEffect(() => {
    const onResize = () => setEsMovil(window.innerWidth < BREAKPOINT_MOVIL);
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

// El "@lat,lng" de un link de "place" es solo el centro de la vista del mapa
// (puede estar corrido varios metros del punto real); "!3d!4d" es la
// coordenada exacta del lugar marcado, así que se revisa primero.
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

function parsearKml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('El archivo KML no es válido');

  const placemarks = Array.from(doc.getElementsByTagName('Placemark'));
  const puntos = [];
  const vistos = new Set();
  let omitidos = 0;
  let duplicados = 0;

  placemarks.forEach((pm, i) => {
    const coordEl = pm.getElementsByTagName('Point')[0]?.getElementsByTagName('coordinates')[0];
    const texto = coordEl?.textContent?.trim();
    if (!texto) { omitidos++; return; }
    const [lngStr, latStr] = texto.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isNaN(lat) || Number.isNaN(lng)) { omitidos++; return; }
    const nombre = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Punto ${i + 1}`;

    const clave = `${nombre.toLowerCase()}|${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (vistos.has(clave)) { duplicados++; return; }
    vistos.add(clave);

    const notas = pm.getElementsByTagName('description')[0]?.textContent?.trim() || '';
    const distanciaCentro = distanciaMetros(CENTRO_MAPA[0], CENTRO_MAPA[1], lat, lng);
    puntos.push({ nombre, lat, lng, notas, lejos: distanciaCentro > RADIO_ALERTA_KML_M });
  });

  return { puntos, omitidos, duplicados };
}

const DIACRITICOS_RE = new RegExp('[̀-ͯ]', 'g');

function extraerClaveNap(nombre) {
  const m = nombre.match(/nap[\s\-_]*?(\d+)/i);
  return m ? m[1] : null;
}

function generarCodigo(nombre, usados) {
  let base = nombre.toUpperCase().normalize('NFD').replace(DIACRITICOS_RE, '').replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!base) base = 'PUNTO';
  let codigo = base;
  let n = 2;
  while (usados.has(codigo)) { codigo = `${base}-${n}`; n++; }
  usados.add(codigo);
  return codigo;
}

function iconoConsulta() {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:#f59e0b;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -26],
  });
}

function iconoPunto(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:${color};border:2.5px solid #fff;border-radius:3px;box-shadow:0 1px 5px rgba(0,0,0,0.45);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9],
  });
}

function AutoCentrar({ coords, activo }) {
  const map = useMap();
  React.useEffect(() => {
    if (!activo || coords.length === 0) return;
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [50, 50], maxZoom: 16 });
  }, [coords, map, activo]);
  return null;
}

function CapturarClick({ activo, onPick }) {
  useMapEvents({ click(e) { if (activo) onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

const cajaFlotante = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
  boxShadow: '0 4px 16px rgba(13,27,42,0.15)',
};

function PanelFlotante({ esMovil, anclaje, onCerrar, children }) {
  if (esMovil) {
    const base = {
      ...cajaFlotante, position: 'fixed', left: 8, right: 8, width: 'auto',
      maxHeight: '60vh', overflowY: 'auto', zIndex: 701, padding: 14,
    };
    const pos = anclaje === 'bottom' ? { bottom: 64 } : { top: 64 };
    return createPortal(
      <>
        <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'transparent' }} />
        <div style={{ ...base, ...pos }}>{children}</div>
      </>,
      document.body
    );
  }
  return children;
}

export default function Mapa() {
  const qc = useQueryClient();
  const esMovil = useEsMovil();

  const [search, setSearch] = useState('');
  const [verClientes, setVerClientes] = useState(false);
  const [verContratos, setVerContratos] = useState(true);
  const [verPuntos, setVerPuntos] = useState(true);
  const [modoAgregar, setModoAgregar] = useState(false);
  const [modalForm, setModalForm] = useState(null);
  const [centrar, setCentrar] = useState(true);
  const [consultaTexto, setConsultaTexto] = useState('');
  const [consultaPunto, setConsultaPunto] = useState(null);
  const [panelCobertura, setPanelCobertura] = useState(false);
  const [panelCapas, setPanelCapas] = useState(false);
  const [buscarAbierto, setBuscarAbierto] = useState(false);
  const [modalKml, setModalKml] = useState(null);
  const [importandoKml, setImportandoKml] = useState(false);
  const inputKmlRef = useRef(null);

  const { data: dataClientes, isLoading: loadClientes } = useQuery({
    queryKey: ['clientes-mapa'],
    queryFn: () => clientesApi.listar().then(r => r.data),
    staleTime: 30_000,
  });

  const { data: dataPuntos, isLoading: loadPuntos } = useQuery({
    queryKey: ['puntos-red-mapa'],
    queryFn: () => puntosRedApi.listar().then(r => r.data),
    staleTime: 30_000,
  });

  const { data: dataContratos, isLoading: loadContratos } = useQuery({
    queryKey: ['contratos-mapa'],
    queryFn: () => contratosApi.mapa().then(r => r.data),
    staleTime: 30_000,
  });

  const guardarMut = useMutation({
    mutationFn: (form) => form.id ? puntosRedApi.actualizar(form.id, form) : puntosRedApi.crear(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['puntos-red-mapa'] }); setModalForm(null); toast.success('Punto guardado'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al guardar'),
  });

  const eliminarMut = useMutation({
    mutationFn: (id) => puntosRedApi.eliminar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['puntos-red-mapa'] }); toast.success('Punto eliminado'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al eliminar'),
  });

  const clientesConCoords = useMemo(() => (dataClientes || []).filter(c => c.latitud != null && c.longitud != null), [dataClientes]);

  const clientes = useMemo(() => {
    if (!search.trim()) return clientesConCoords;
    const q = search.trim().toLowerCase();
    return clientesConCoords.filter(c =>
      `${c.nombres} ${c.apellidos || ''}`.toLowerCase().includes(q) || c.dniRuc?.toLowerCase().includes(q)
    );
  }, [clientesConCoords, search]);

  const puntos = dataPuntos || [];

  const contratos = useMemo(() => {
    const lista = dataContratos || [];
    if (!search.trim()) return lista;
    const q = search.trim().toLowerCase();
    return lista.filter(c =>
      c.numero?.toLowerCase().includes(q) ||
      `${c.cliente?.nombres} ${c.cliente?.apellidos || ''}`.toLowerCase().includes(q) ||
      c.cliente?.dniRuc?.toLowerCase().includes(q)
    );
  }, [dataContratos, search]);

  const coordsCentrado = useMemo(() => {
    const c = [];
    if (verClientes) clientes.forEach(p => c.push([p.latitud, p.longitud]));
    if (verContratos) contratos.forEach(p => c.push([p.latitud, p.longitud]));
    if (verPuntos) puntos.forEach(p => c.push([p.latitud, p.longitud]));
    return c;
  }, [clientes, contratos, puntos, verClientes, verContratos, verPuntos]);

  const centroDefault = CENTRO_MAPA;
  const isLoading = loadClientes || loadPuntos || loadContratos;

  const puntosNap = useMemo(() => puntos.filter(p => p.tipo === 'NAP'), [puntos]);
  const puntoPorId = useMemo(() => Object.fromEntries(puntos.map(p => [p.id, p])), [puntos]);

  const abrirFormNuevo = (lat = '', lng = '') => {
    setModalForm({ id: null, tipo: 'NAP', codigo: '', latitud: lat, longitud: lng, capacidad: '', ocupados: '', estado: 'ACTIVA', direccion: '', notas: '', napId: '' });
  };

  const abrirFormEditar = (pt) => {
    setCentrar(false);
    setModalForm({
      id: pt.id, tipo: pt.tipo, codigo: pt.codigo, latitud: pt.latitud, longitud: pt.longitud,
      capacidad: pt.capacidad ?? '', ocupados: pt.ocupados ?? '', estado: pt.estado,
      direccion: pt.direccion || '', notas: pt.notas || '', napId: pt.napId || '',
    });
  };

  const handlePickEnMapa = (lat, lng) => {
    setModoAgregar(false);
    setCentrar(false);
    abrirFormNuevo(lat, lng);
  };

  const handleArchivoKml = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const texto = await file.text();
      const { puntos: puntosKml, omitidos, duplicados } = parsearKml(texto);
      if (puntosKml.length === 0) { toast.error('No se encontraron puntos con coordenadas en el KML'); return; }
      const usados = new Set();
      const items = puntosKml.map((p, i) => ({
        key: i,
        nombre: p.nombre,
        lat: p.lat,
        lng: p.lng,
        codigo: generarCodigo(p.nombre, usados),
        tipo: /CTO/i.test(p.nombre) ? 'CTO' : 'NAP',
        notas: p.notas,
        lejos: p.lejos,
        incluir: !p.lejos,
        napClave: extraerClaveNap(p.nombre),
      }));
      setModalKml({ items, resultados: {} });
      const avisos = [];
      if (duplicados > 0) avisos.push(`${duplicados} duplicado(s) exacto(s) descartados`);
      if (omitidos > 0) avisos.push(`${omitidos} elemento(s) sin coordenadas de punto omitidos`);
      if (avisos.length > 0) toast(avisos.join(' · '), { icon: '⚠️', duration: 6000 });
      const lejanos = items.filter(it => it.lejos).length;
      if (lejanos > 0) toast(`${lejanos} punto(s) muy alejados del área quedaron sin marcar — revisalos antes de importar`, { icon: '📍', duration: 7000 });
    } catch (err) {
      toast.error(err.message || 'No se pudo leer el archivo KML');
    }
  };

  const confirmarImportKml = async () => {
    const items = modalKml.items.filter(it => it.incluir);
    if (items.length === 0) { toast.error('Seleccioná al menos un punto'); return; }
    setImportandoKml(true);
    const resultados = {};

    const napIndex = {};
    for (const p of puntosNap) {
      const clave = extraerClaveNap(p.codigo);
      if (clave) napIndex[clave] = p.id;
    }

    const napsAImportar = items.filter(it => it.tipo === 'NAP');
    const ctosAImportar = items.filter(it => it.tipo === 'CTO');

    for (const it of napsAImportar) {
      try {
        const { data } = await puntosRedApi.crear({
          tipo: it.tipo, codigo: it.codigo, latitud: it.lat, longitud: it.lng,
          capacidad: '', ocupados: '', estado: 'ACTIVA', direccion: '', notas: it.notas,
        });
        resultados[it.key] = { ok: true };
        if (it.napClave) napIndex[it.napClave] = data.id;
      } catch (err) {
        resultados[it.key] = { ok: false, mensaje: err.response?.data?.error || 'Error al crear' };
      }
    }

    for (const it of ctosAImportar) {
      const napId = it.napClave ? napIndex[it.napClave] : null;
      try {
        await puntosRedApi.crear({
          tipo: it.tipo, codigo: it.codigo, latitud: it.lat, longitud: it.lng,
          capacidad: '', ocupados: '', estado: 'ACTIVA', direccion: '', notas: it.notas, napId,
        });
        resultados[it.key] = { ok: true, sinVincular: !napId };
      } catch (err) {
        resultados[it.key] = { ok: false, mensaje: err.response?.data?.error || 'Error al crear' };
      }
    }

    setImportandoKml(false);
    qc.invalidateQueries({ queryKey: ['puntos-red-mapa'] });
    const exitosos = Object.values(resultados).filter(r => r.ok).length;
    const fallidos = items.length - exitosos;
    const sinVincular = Object.values(resultados).filter(r => r.ok && r.sinVincular).length;
    if (fallidos === 0) {
      toast.success(`${exitosos} punto(s) importado(s)`);
      if (sinVincular > 0) toast(`${sinVincular} CTO(s) no encontraron su NAP y quedaron sin vincular`, { icon: '🔗', duration: 6000 });
      setModalKml(null);
    } else {
      toast.error(`${exitosos} importado(s), ${fallidos} con error — corregí esas filas y volvé a importar`);
      setModalKml(m => ({
        ...m,
        resultados,
        items: m.items.map(it => resultados[it.key]?.ok ? { ...it, incluir: false } : it),
      }));
    }
  };

  const buscarCobertura = () => {
    const ubic = parsearUbicacion(consultaTexto);
    if (!ubic) { toast.error('No se pudo leer la ubicación. Pegá "lat, lng" o un link de Google Maps.'); return; }
    setConsultaPunto(ubic);
    setCentrar(false);
  };

  const cobertura = useMemo(() => {
    if (!consultaPunto) return null;
    const conDist = puntos.map(pt => ({ ...pt, distancia: distanciaMetros(consultaPunto.lat, consultaPunto.lng, pt.latitud, pt.longitud) })).sort((a, b) => a.distancia - b.distancia);
    const masCercana = conDist[0] || null;
    const dentroRadio = conDist.filter(p => p.distancia <= RADIO_COBERTURA);
    let veredicto;
    if (!masCercana) {
      veredicto = { color: '#ef4444', texto: 'No hay puntos de red cargados' };
    } else if (masCercana.distancia > RADIO_COBERTURA) {
      veredicto = { color: '#ef4444', texto: `Sin cobertura — el punto más cercano está a ${Math.round(masCercana.distancia)}m` };
    } else {
      const conPuertos = dentroRadio.find(p => p.capacidad == null || (p.capacidad - p.ocupados) > 0);
      veredicto = conPuertos
        ? { color: '#3fb950', texto: `Hay cobertura — ${conPuertos.codigo} a ${Math.round(conPuertos.distancia)}m` }
        : { color: '#e3b341', texto: 'Cobertura limitada — hay puntos cerca pero sin puertos libres' };
    }
    return { lista: conDist.slice(0, 5), veredicto, dentroRadio };
  }, [consultaPunto, puntos]);

  const btnControl = (activo, colorActivo) => ({
    ...cajaFlotante, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    cursor: 'pointer', fontSize: 12, fontWeight: 700,
    padding: esMovil ? 10 : '9px 12px', width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
    color: activo ? (colorActivo || 'var(--accent)') : 'var(--txt-2)',
  });

  return (
    <div style={{
      position: 'relative',
      height: esMovil ? 'calc(100vh - 56px)' : 'calc(100vh - 56px - 32px)',
      ...(esMovil ? { height: 'calc(100dvh - 56px)' } : {}),
      margin: esMovil ? 0 : 16, borderRadius: esMovil ? 0 : 12, overflow: 'hidden',
      overscrollBehavior: 'none',
    }}>

      <div style={{ position: 'absolute', inset: 0, cursor: modoAgregar ? 'crosshair' : 'grab' }}>
        <MapContainer center={centroDefault} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AutoCentrar coords={coordsCentrado} activo={centrar} />
          <CapturarClick activo={modoAgregar} onPick={handlePickEnMapa} />

          {consultaPunto && (
            <>
              <Circle center={[consultaPunto.lat, consultaPunto.lng]} radius={RADIO_COBERTURA} pathOptions={{ color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.1 }} />
              <Marker position={[consultaPunto.lat, consultaPunto.lng]} icon={iconoConsulta()}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Ubicación consultada</div>
                    {cobertura?.veredicto && <div style={{ fontSize: 11, color: cobertura.veredicto.color, fontWeight: 600 }}>{cobertura.veredicto.texto}</div>}
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {verClientes && clientes.map(c => (
            <CircleMarker key={`c-${c.id}`} center={[c.latitud, c.longitud]} radius={8}
              pathOptions={{ color: '#fff', weight: 2, fillColor: c.activo ? '#3fb950' : '#94a3b8', fillOpacity: 0.9 }}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{c.nombres} {c.apellidos}</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>DNI/RUC: <strong>{c.dniRuc}</strong></div>
                  {c.telefono && <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{c.telefono}</div>}
                  {c.direccion && <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{c.direccion}</div>}
                  <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: c.activo ? '#3fb95022' : '#94a3b822', color: c.activo ? '#3fb950' : '#64748b' }}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {verContratos && contratos.map(c => {
            const estadoCfg = ESTADO_CONTRATO_CFG[c.estado] || { label: c.estado, color: '#666' };
            return (
              <CircleMarker key={`ct-${c.id}`} center={[c.latitud, c.longitud]} radius={8}
                pathOptions={{ color: '#fff', weight: 2, fillColor: estadoCfg.color, fillOpacity: 0.9 }}>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{c.cliente?.nombres} {c.cliente?.apellidos}</div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Contrato: <strong>{c.numero}</strong></div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Servicio: <strong>{TIPOS_SERVICIO_LABEL[c.tipoServicio]}</strong>{c.plan ? ` — ${c.plan.nombre}` : ''}</div>
                    {c.direccion && <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{c.direccion}</div>}
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                      {c.puntoRed ? <>Vinculado a: <strong>{c.puntoRed.codigo}</strong> ({c.puntoRed.tipo})</> : 'Sin punto de red asignado'}
                    </div>
                    <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: estadoCfg.color + '22', color: estadoCfg.color }}>
                      {estadoCfg.label}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {verPuntos && puntos.map(pt => {
            const tipoCfg = PUNTO_CFG[pt.tipo] || { label: pt.tipo, color: '#666' };
            const estadoCfg = ESTADO_PUNTO_CFG[pt.estado] || { label: pt.estado, color: '#666' };
            const napPadre = pt.tipo === 'CTO' && pt.napId ? puntoPorId[pt.napId] : null;
            const ctosHijas = pt.tipo === 'NAP' ? puntos.filter(p => p.napId === pt.id) : [];
            return (
              <Marker key={`p-${pt.id}`} position={[pt.latitud, pt.longitud]} icon={iconoPunto(tipoCfg.color)}>
                <Popup>
                  <div style={{ minWidth: 190 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: tipoCfg.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{pt.codigo}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Tipo: <strong>{tipoCfg.label}</strong></div>
                    {pt.tipo === 'CTO' && (
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
                        Conectada a: <strong>{napPadre ? napPadre.codigo : 'sin asignar'}</strong>
                      </div>
                    )}
                    {pt.tipo === 'NAP' && (
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>CTOs conectadas: <strong>{ctosHijas.length}</strong></div>
                    )}
                    {pt.capacidad != null && <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Puertos: <strong>{pt.ocupados}/{pt.capacidad}</strong></div>}
                    {pt.direccion && <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{pt.direccion}</div>}
                    {pt.notas && <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontStyle: 'italic' }}>{pt.notas}</div>}
                    <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: estadoCfg.color + '22', color: estadoCfg.color, marginBottom: 8 }}>{estadoCfg.label}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => abrirFormEditar(pt)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #1E3A8A', background: 'transparent', color: '#1E3A8A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <Pencil size={11} /> Editar
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar el punto ${pt.codigo}?`)) eliminarMut.mutate(pt.id); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <Trash2 size={11} /> Eliminar
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Arriba-izquierda: buscar */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {esMovil ? (
          <button onClick={() => { setBuscarAbierto(v => !v); setPanelCobertura(false); setPanelCapas(false); }} style={btnControl(buscarAbierto || !!search.trim())}>
            <Search size={16} />
          </button>
        ) : (
          <div style={{ ...cajaFlotante, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
            <Search size={14} color="var(--txt-3)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
              style={{ border: 'none', background: 'transparent', padding: '9px 8px', fontSize: 12, color: 'var(--txt)', outline: 'none', width: 170 }} />
          </div>
        )}
        {esMovil && buscarAbierto && (
          <PanelFlotante esMovil={esMovil} anclaje="top" onCerrar={() => setBuscarAbierto(false)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={16} color="var(--txt-3)" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                style={{ flex: 1, border: '1px solid var(--border-2)', background: 'var(--bg-3)', padding: '9px 10px', borderRadius: 8, fontSize: 13, color: 'var(--txt)', outline: 'none' }} />
              <button onClick={() => setBuscarAbierto(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>
            </div>
          </PanelFlotante>
        )}
      </div>

      {/* Arriba-derecha: importar KML + agregar punto */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 500, display: 'flex', gap: 8 }}>
        <input type="file" accept=".kml,application/vnd.google-earth.kml+xml" ref={inputKmlRef} onChange={handleArchivoKml} style={{ display: 'none' }} />
        <button onClick={() => inputKmlRef.current?.click()}
          style={{
            ...cajaFlotante, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--txt-2)',
            padding: esMovil ? 0 : '9px 14px', width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
          }}>
          <Upload size={esMovil ? 16 : 14} />{!esMovil && ' Importar KML'}
        </button>
        <button onClick={() => setModoAgregar(m => !m)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, cursor: 'pointer', border: 'none',
            fontSize: 12, fontWeight: 700, boxShadow: '0 4px 16px rgba(13,27,42,0.15)',
            background: modoAgregar ? '#ef4444' : '#1E3A8A', color: '#fff',
            padding: esMovil ? 0 : '9px 14px', width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
          }}>
          {modoAgregar ? <><X size={esMovil ? 18 : 14} />{!esMovil && ' Cancelar'}</> : <><Plus size={esMovil ? 18 : 14} />{!esMovil && ' Agregar punto'}</>}
        </button>
      </div>

      {/* Derecha: cobertura */}
      <div style={{ position: 'absolute', top: 60, right: 12, zIndex: 500 }}>
        <button onClick={() => { setPanelCobertura(v => !v); setPanelCapas(false); setBuscarAbierto(false); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, cursor: 'pointer', border: 'none',
            fontSize: 12, fontWeight: 700, boxShadow: '0 4px 16px rgba(13,27,42,0.15)',
            background: panelCobertura || consultaPunto ? '#f59e0b' : 'var(--bg-card)',
            color: panelCobertura || consultaPunto ? '#fff' : 'var(--txt-2)',
            padding: esMovil ? 0 : '9px 14px', width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
          }}>
          <Radar size={esMovil ? 16 : 14} />{!esMovil && ' Cobertura'}
        </button>

        {panelCobertura && (
          <PanelFlotante esMovil={esMovil} anclaje="top" onCerrar={() => setPanelCobertura(false)}>
            <div style={!esMovil ? { ...cajaFlotante, position: 'absolute', top: 44, right: 0, width: 300, padding: 14 } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Radar size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>Consultar cobertura</span>
                <span style={{ fontSize: 10, color: 'var(--txt-3)', marginLeft: 'auto' }}>radio {RADIO_COBERTURA}m</span>
                {esMovil && <button onClick={() => setPanelCobertura(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>}
              </div>
              <input value={consultaTexto} onChange={e => setConsultaTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarCobertura()}
                placeholder='"lat, lng" o link de Maps'
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={buscarCobertura} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  <Navigation size={13} /> Buscar
                </button>
                {consultaPunto && (
                  <button onClick={() => { setConsultaPunto(null); setConsultaTexto(''); }} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, fontWeight: 600 }}>
                    Limpiar
                  </button>
                )}
              </div>
              {cobertura && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: cobertura.veredicto.color + '18', border: `1px solid ${cobertura.veredicto.color}40`, marginBottom: cobertura.dentroRadio.length > 0 ? 10 : 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: cobertura.veredicto.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: cobertura.veredicto.color }}>{cobertura.veredicto.texto}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cobertura.lista.map(pt => {
                      const dentro = pt.distancia <= RADIO_COBERTURA;
                      const libres = pt.capacidad != null ? pt.capacidad - pt.ocupados : null;
                      return (
                        <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: dentro ? 'rgba(63,185,80,0.08)' : 'var(--bg-3)', fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: 'var(--txt)', minWidth: 70 }}>{pt.codigo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: dentro ? '#3fb950' : 'var(--txt-3)' }}>{Math.round(pt.distancia)}m</span>
                          {libres != null && <span style={{ color: libres > 0 ? 'var(--txt-2)' : '#ef4444', marginLeft: 'auto', fontSize: 10 }}>{libres > 0 ? `${libres} libre(s)` : 'Sin puertos'}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </PanelFlotante>
        )}
      </div>

      {/* Abajo-izquierda: capas */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 500 }}>
        <button onClick={() => { setPanelCapas(v => !v); setPanelCobertura(false); setBuscarAbierto(false); }}
          style={esMovil ? btnControl(panelCapas) : { ...cajaFlotante, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--txt-2)' }}>
          <Layers size={esMovil ? 16 : 14} />{!esMovil && ' Capas'}
        </button>

        {panelCapas && (
          <PanelFlotante esMovil={esMovil} anclaje="bottom" onCerrar={() => setPanelCapas(false)}>
            <div style={!esMovil ? { ...cajaFlotante, position: 'absolute', bottom: 44, left: 0, width: 200, padding: 14 } : undefined}>
              {esMovil && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt)' }}>Capas</span>
                  <button onClick={() => setPanelCapas(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', marginBottom: 8 }}>
                <input type="checkbox" checked={verContratos} onChange={e => setVerContratos(e.target.checked)} /> Contratos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', marginBottom: 8 }}>
                <input type="checkbox" checked={verClientes} onChange={e => setVerClientes(e.target.checked)} /> Clientes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={verPuntos} onChange={e => setVerPuntos(e.target.checked)} /> Puntos de red
              </label>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {verContratos && Object.entries(ESTADO_CONTRATO_CFG).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, border: '2px solid #fff' }} /> Contrato {v.label.toLowerCase()}
                  </div>
                ))}
                {verClientes && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3fb950', border: '2px solid #fff' }} /> Cliente activo
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', border: '2px solid #fff' }} /> Cliente inactivo
                    </div>
                  </>
                )}
                {verPuntos && Object.entries(PUNTO_CFG).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: v.color, border: '2px solid #fff' }} /> {v.label}
                  </div>
                ))}
              </div>
            </div>
          </PanelFlotante>
        )}
      </div>

      {/* Abajo-derecha: contador */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 500, ...cajaFlotante, padding: '7px 12px', fontSize: 11, color: 'var(--txt-3)' }}>
        {isLoading ? 'Cargando...' : `${contratos.length} contr. · ${clientes.length} cli. · ${puntos.length} pto.`}
      </div>

      {/* Banner modo agregar */}
      {modoAgregar && (
        <div style={{
          position: 'absolute', bottom: esMovil ? 64 : 56, left: esMovil ? 8 : '50%', right: esMovil ? 8 : 'auto',
          transform: esMovil ? 'none' : 'translateX(-50%)', zIndex: 500, ...cajaFlotante,
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 12, color: '#1E3A8A', maxWidth: esMovil ? 'none' : 480,
        }}>
          <Crosshair size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}><strong>Tocá el mapa</strong> donde quieras el punto NAP/CTO.</span>
          <button onClick={() => { setModoAgregar(false); abrirFormNuevo(); }}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #1E3A8A', background: 'transparent', color: '#1E3A8A', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            A mano
          </button>
        </div>
      )}

      {modalForm && (
        <FormPunto
          form={modalForm}
          setForm={setModalForm}
          esMovil={esMovil}
          puntosNap={puntosNap}
          onGuardar={() => {
            if (!modalForm.codigo.trim()) return toast.error('El código es obligatorio');
            if (modalForm.latitud === '' || modalForm.longitud === '') return toast.error('Faltan las coordenadas');
            guardarMut.mutate(modalForm);
          }}
          onCerrar={() => setModalForm(null)}
          guardando={guardarMut.isPending}
        />
      )}

      {modalKml && (
        <ModalImportarKml
          modalKml={modalKml}
          setModalKml={setModalKml}
          esMovil={esMovil}
          importando={importandoKml}
          onImportar={confirmarImportKml}
          onCerrar={() => setModalKml(null)}
          puntosNap={puntosNap}
        />
      )}
    </div>
  );
}

function ModalImportarKml({ modalKml, setModalKml, esMovil, importando, onImportar, onCerrar, puntosNap }) {
  const { items, resultados } = modalKml;
  const [mostrarAyuda, setMostrarAyuda] = useState(true);
  const setItem = (key, campo, valor) => setModalKml(m => ({ ...m, items: m.items.map(it => it.key === key ? { ...it, [campo]: valor } : it) }));
  const incluidos = items.filter(it => it.incluir).length;
  const selectStyle = { fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-2)', background: 'var(--bg-3)', color: 'var(--txt)' };

  const clavesNapDisponibles = useMemo(() => {
    const claves = new Set();
    puntosNap.forEach(p => { const c = extraerClaveNap(p.codigo); if (c) claves.add(c); });
    items.forEach(it => { if (it.tipo === 'NAP' && it.incluir && it.napClave) claves.add(it.napClave); });
    return claves;
  }, [puntosNap, items]);

  return (
    <div onClick={onCerrar} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: esMovil ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000, padding: esMovil ? 0 : 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: esMovil ? '16px 16px 0 0' : 14, border: '1px solid var(--border-2)',
        width: esMovil ? '100%' : 560, maxWidth: '100%', maxHeight: esMovil ? '92vh' : '85vh',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--txt)' }}>Importar puntos desde KML</h3>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>
        </div>

        {mostrarAyuda && (
          <div style={{ margin: '12px 20px 0', padding: '10px 12px', borderRadius: 8, background: 'rgba(30,58,138,0.06)', border: '1px solid rgba(30,58,138,0.2)', fontSize: 11, color: 'var(--txt-2)', position: 'relative' }}>
            <button onClick={() => setMostrarAyuda(false)} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
              <X size={14} />
            </button>
            <div style={{ fontWeight: 700, color: '#1E3A8A', marginBottom: 6 }}>Cómo nombrar los puntos en Google My Maps</div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: 'monospace', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4 }}>NAP 331 - LAREDO</span>
              <span style={{ color: 'var(--txt-3)' }}> → se detecta como NAP</span>
            </div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: 'monospace', background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4 }}>NAP 331 - LAREDO / CTO06</span>
              <span style={{ color: 'var(--txt-3)' }}> → se detecta como CTO y se vincula sola a la NAP 331</span>
            </div>
            <div style={{ color: 'var(--txt-3)' }}>
              El orden y los separadores (guion, espacio, barra) no importan. Si vas a tener varias ciudades, agregá el nombre de la ciudad para que los códigos no choquen entre sí.
            </div>
          </div>
        )}

        <div style={{ padding: '10px 20px 0', fontSize: 11, color: 'var(--txt-3)' }}>
          {items.length} punto(s) detectado(s) · {incluidos} seleccionado(s)
        </div>

        <div style={{ padding: '10px 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(it => {
            const res = resultados?.[it.key];
            return (
              <div key={it.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border-2)',
                background: res?.ok ? 'rgba(63,185,80,0.08)' : (res && !res.ok) ? 'rgba(239,68,68,0.08)' : 'transparent',
              }}>
                <input type="checkbox" checked={it.incluir} disabled={importando} onChange={e => setItem(it.key, 'incluir', e.target.checked)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {it.nombre}
                    {it.lejos && <span style={{ fontSize: 9, fontWeight: 700, color: '#e3b341', background: '#e3b34122', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>MUY LEJOS DEL ÁREA</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--txt-3)', fontFamily: 'monospace' }}>{it.lat.toFixed(5)}, {it.lng.toFixed(5)}</div>
                  {it.tipo === 'CTO' && (
                    it.napClave
                      ? (clavesNapDisponibles.has(it.napClave)
                          ? <div style={{ fontSize: 10, color: 'var(--txt-3)' }}>→ vincula a NAP {it.napClave}</div>
                          : <div style={{ fontSize: 10, color: '#e3b341' }}>→ NAP {it.napClave} no encontrada, quedará sin vincular</div>)
                      : <div style={{ fontSize: 10, color: '#e3b341' }}>→ no se detectó su NAP en el nombre, quedará sin vincular</div>
                  )}
                  {res && !res.ok && <div style={{ fontSize: 10, color: '#ef4444' }}>{res.mensaje}</div>}
                  {res && res.ok && res.sinVincular && <div style={{ fontSize: 10, color: '#e3b341' }}>Importada sin vincular a NAP</div>}
                </div>
                <select value={it.tipo} disabled={importando} onChange={e => setItem(it.key, 'tipo', e.target.value)} style={selectStyle}>
                  <option value="NAP">NAP</option>
                  <option value="CTO">CTO</option>
                </select>
                <input value={it.codigo} disabled={importando} onChange={e => setItem(it.key, 'codigo', e.target.value.toUpperCase())}
                  style={{ width: 110, fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-2)', background: 'var(--bg-3)', color: 'var(--txt)', fontFamily: 'monospace' }} />
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--bg-2)' }}>
          <button onClick={onCerrar} disabled={importando} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onImportar} disabled={importando || incluidos === 0} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1E3A8A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: importando ? 0.7 : 1 }}>
            {importando ? 'Importando...' : `Importar ${incluidos}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectorNap({ puntosNap, value, onChange, inputStyle }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const wrapRef = useRef(null);
  const seleccionado = puntosNap.find(p => p.id === value) || null;

  useEffect(() => {
    const onClickFuera = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return puntosNap;
    return puntosNap.filter(p => p.codigo.toLowerCase().includes(q));
  }, [puntosNap, texto]);

  const elegir = (id) => { onChange(id); setAbierto(false); setTexto(''); };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={abierto ? texto : (seleccionado ? seleccionado.codigo : '')}
        onFocus={() => { setAbierto(true); setTexto(''); }}
        onChange={e => setTexto(e.target.value)}
        placeholder={seleccionado ? seleccionado.codigo : `Sin asignar — buscar entre ${puntosNap.length} NAP...`}
        style={inputStyle}
      />
      {abierto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-2)',
          border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 220, overflowY: 'auto', zIndex: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          <div onClick={() => elegir('')} style={{ padding: '7px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--txt-3)', borderBottom: '1px solid var(--border)' }}>
            Sin asignar
          </div>
          {filtrados.length === 0 && <div style={{ padding: '10px', fontSize: 12, color: 'var(--txt-3)' }}>Sin resultados</div>}
          {filtrados.map(p => (
            <div key={p.id} onClick={() => elegir(p.id)} style={{
              padding: '7px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace',
              color: p.id === value ? '#1E3A8A' : 'var(--txt)',
              background: p.id === value ? 'rgba(30,58,138,0.08)' : 'transparent',
              fontWeight: p.id === value ? 700 : 400,
            }}>
              {p.codigo}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormPunto({ form, setForm, esMovil, onGuardar, onCerrar, guardando, puntosNap }) {
  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));
  const inputStyle = {
    width: '100%', padding: '8px 11px', background: 'var(--bg-3)', border: '1px solid var(--border-2)',
    borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div onClick={onCerrar} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: esMovil ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000, padding: esMovil ? 0 : 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)', borderRadius: esMovil ? '16px 16px 0 0' : 14, border: '1px solid var(--border-2)',
        width: esMovil ? '100%' : 460, maxWidth: '100%', maxHeight: esMovil ? '92vh' : '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--txt)' }}>{form.id ? 'Editar punto de red' : 'Nuevo punto de red'}</h3>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['NAP', 'CTO'].map(t => (
                <button key={t} onClick={() => set('tipo', t)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: `1px solid ${form.tipo === t ? '#1E3A8A' : 'var(--border-2)'}`,
                  background: form.tipo === t ? 'rgba(30,58,138,0.1)' : 'transparent',
                  color: form.tipo === t ? '#1E3A8A' : 'var(--txt-3)',
                }}>
                  {t === 'NAP' ? 'Caja NAP' : 'CTO'}
                </button>
              ))}
            </div>
          </div>

          {form.tipo === 'CTO' && (
            <div>
              <label style={labelStyle}>Conectada a (NAP)</label>
              <SelectorNap puntosNap={puntosNap} value={form.napId} onChange={v => set('napId', v)} inputStyle={inputStyle} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Código *</label>
            <input value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="NAP-LAR-011" style={{ ...inputStyle, textTransform: 'uppercase' }} />
          </div>

          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Latitud *</label>
              <input value={form.latitud} onChange={e => set('latitud', e.target.value)} placeholder="-8.0834" style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle}>Longitud *</label>
              <input value={form.longitud} onChange={e => set('longitud', e.target.value)} placeholder="-78.9557" style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
          </div>

          <div className="resp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Puertos totales</label>
              <input type="number" value={form.capacidad} onChange={e => set('capacidad', e.target.value)} placeholder="8" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Puertos usados</label>
              <input type="number" value={form.ocupados} onChange={e => set('ocupados', e.target.value)} placeholder="0" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)} style={inputStyle}>
              <option value="ACTIVA">Activa</option>
              <option value="SATURADA">Saturada</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Dirección / referencia</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Esquina Jr. Lima con Av. Grau" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} placeholder="Observaciones..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--bg-2)' }}>
          <button onClick={onCerrar} disabled={guardando} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onGuardar} disabled={guardando} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1E3A8A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : (form.id ? 'Guardar cambios' : 'Crear punto')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, ClipboardList, Contact, Users, BarChart2,
  Map, Package, UserCog, Wifi, Tags, FileText, DollarSign, Building2, Router,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { empresaApi, BACKEND_URL } from '../../services/api';

// El logo que devuelve /configuracion es una ruta relativa (ej. /uploads/logos/x.png) — hay
// que anteponerle el backend, como ya hace resolverUrlArchivo() en el AppContainer de Android.
function resolverUrlArchivo(ruta) {
  if (!ruta) return undefined;
  if (/^https?:\/\//.test(ruta)) return ruta;
  return `${BACKEND_URL}${ruta}`;
}

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'SG';
  return partes.slice(0, 2).map(p => p[0].toUpperCase()).join('');
}


const CSS = `
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    color: #64748B;
    background: transparent;
    transition: background .15s, color .15s;
    width: 100%;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .nav-item:not(.nav-item--active):hover {
    background: #EFF6FF;
    color: #1D4ED8;
  }
  .nav-item--active {
    background: #2563EB;
    color: #FFFFFF;
    box-shadow: 0 4px 10px rgba(37,99,235,0.30);
  }
  .nav-item--collapsed {
    justify-content: center;
    gap: 0;
  }
`;

const S = {
  aside: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    background: '#FFFFFF',
    borderRight: '1px solid #F1F5F9',
    boxShadow: '1px 0 8px rgba(0,0,0,0.04)',
    display: 'flex', flexDirection: 'column',
    zIndex: 999, overflow: 'hidden',
    transition: 'transform .25s ease, width .2s ease',
  },
  header: {
    padding: '0 16px', borderBottom: '1px solid #F1F5F9',
    display: 'flex', alignItems: 'center', gap: 10, height: 56, flexShrink: 0,
  },
  logoWrap: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    background: '#EFF6FF', border: '1px solid #DBEAFE',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 14, fontWeight: 700, color: '#1E293B', lineHeight: 1.2 },
  brandSub:  { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  nav: {
    flex: 1, padding: '10px 10px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  sectionLabel: {
    fontSize: 9, fontWeight: 700, color: '#94A3B8',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '12px 6px 4px',
  },
};

const NAV_PRINCIPAL = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
];

const NAV_OPERACIONES = [
  { to: '/ordenes', label: 'Órdenes', icon: ClipboardList },
  { to: '/mapa',    label: 'Mapa',    icon: Map           },
];

const NAV_COMERCIAL = [
  { to: '/contratos', label: 'Contratos', icon: FileText   },
  { to: '/clientes',  label: 'Clientes',  icon: Contact    },
  { to: '/planes',    label: 'Planes',    icon: Wifi       },
  { to: '/pagos',     label: 'Pagos',     icon: DollarSign },
];

const NAV_ANALISIS = [
  { to: '/reportes', label: 'Reportes', icon: BarChart2 },
];

const NAV_ALMACEN = [
  { to: '/almacen',              label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { to: '/almacen/inventario',   label: 'Inventario',   icon: Package         },
  { to: '/almacen/catalogo',     label: 'Catálogo',     icon: Tags            },
  { to: '/almacen/reportes',     label: 'Reportes',     icon: BarChart2       },
];

const NAV_PERSONAL = [
  { to: '/tecnicos',    label: 'Técnicos',      icon: Users   },
  { to: '/secretarios', label: 'Secretario(a)', icon: UserCog },
];

const NAV_EQUIPOS = [
  { to: '/equipos/olts', label: 'OLTs', icon: Router },
];

const NAV_CONFIGURACION = [
  { to: '/empresa', label: 'Mi Empresa', icon: Building2 },
];


function NavItem({ to, label, Icon, exact, colapsado, esMovil, onCerrar }) {
  return (
    <NavLink
      to={to}
      end={exact}
      title={colapsado ? label : undefined}
      onClick={() => { if (esMovil && onCerrar) onCerrar(); }}
      className={({ isActive }) =>
        ['nav-item', isActive ? 'nav-item--active' : '', colapsado ? 'nav-item--collapsed' : '']
          .filter(Boolean).join(' ')
      }
    >
      <Icon size={17} style={{ flexShrink: 0 }} />
      {!colapsado && <span>{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ colapsado, esMovil, abierto, onCerrar }) {
  const usuario = useAuthStore((s) => s.usuario);
  // Cablera solo tiene dos roles de Usuario (gestor/cobrador) — Técnico y Secretario(a) son
  // catálogos APARTE, no un Usuario.rol (un técnico ni siquiera entra por este login, tiene el
  // suyo propio, ver /tecnico/login). "Cobrador" acá hace el papel del rol reducido de Keysls:
  // ve lo operativo/comercial, pero no Almacén/Personal/Equipos/Configuración (el backend
  // tampoco se lo deja — esas rutas son @Roles("gestor") sin excepción).
  const esCobrador = usuario?.rol === 'cobrador';

  const section = (label, items) => (
  <>
    {!colapsado && <div style={S.sectionLabel}>{label}</div>}
    {colapsado && <div style={{ height: 10 }} />}
    {items.map(({ to, label, icon: Icon, exact }) => (
      <NavItem
        key={to} to={to} label={label} Icon={Icon}
        exact={exact ?? false}
        colapsado={colapsado} esMovil={esMovil} onCerrar={onCerrar}
      />
    ))}
  </>
);

  const empresaQ = useQuery({ queryKey: ['empresa'], queryFn: () => empresaApi.obtener().then(r => r.data) });
  const empresa = empresaQ.data;
  // Cablera: ConfiguracionDto.logoUrl / .nombreEmpresa (no .logo / .nombre, como Keysls).
  const logoSrc = empresa?.logoUrl || '';
  const nombreEmpresa = empresa?.nombreEmpresa?.trim() || 'Mi Empresa';

  return (
    <>
      <style>{CSS}</style>

      {esMovil && abierto && (
        <div onClick={onCerrar}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 998 }} />
      )}

      <aside style={{
        ...S.aside,
        width: colapsado ? 64 : 224,
        transform: esMovil ? (abierto ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      }}>

        <div style={{ ...S.header, justifyContent: colapsado ? 'center' : 'flex-start' }}>
          <div style={{ ...S.logoWrap, background: logoSrc ? '#fff' : '#EFF6FF', overflow: 'hidden' }}>
            {logoSrc
              ? <img src={resolverUrlArchivo(logoSrc)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
              : <span style={{ fontSize: 13, fontWeight: 800, color: '#1E3A8A' }}>{iniciales(empresa?.nombreEmpresa)}</span>
            }
          </div>
          {!colapsado && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.brandName, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreEmpresa}</div>
              <div style={S.brandSub}>Panel de Gestión</div>
            </div>
          )}
        </div>

        <nav style={S.nav}>
          {esCobrador ? (
            <>
              {section('Principal',   NAV_PRINCIPAL)}
              {section('Operaciones', NAV_OPERACIONES)}
              {section('Comercial',   NAV_COMERCIAL)}
            </>
          ) : (
            <>
              {section('Principal',    NAV_PRINCIPAL)}
              {section('Operaciones',  NAV_OPERACIONES)}
              {section('Comercial',    NAV_COMERCIAL)}
              {section('Análisis',     NAV_ANALISIS)}
              {section('Almacén',      NAV_ALMACEN)}
              {section('Personal',     NAV_PERSONAL)}
              {section('Equipos',      NAV_EQUIPOS)}
              {section('Configuración', NAV_CONFIGURACION)}
            </>
          )}
        </nav>

        {!colapsado && (
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 9, color: '#CBD5E1', textAlign: 'center' }}>
              Sistema de Gestión v1.0.0
            </div>
          </div>
        )}

      </aside>
    </>
  );
}
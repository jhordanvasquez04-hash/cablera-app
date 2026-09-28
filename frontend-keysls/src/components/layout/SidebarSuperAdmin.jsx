import { NavLink } from 'react-router-dom';
import { Building2, ShieldCheck, History, LayoutGrid, Wallet, Database, UserCircle } from 'lucide-react';

const CSS = `
  .sa-nav-item {
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
  .sa-nav-item:not(.sa-nav-item--active):hover {
    background: #EFF6FF;
    color: #1D4ED8;
  }
  .sa-nav-item--active {
    background: #2563EB;
    color: #FFFFFF;
    box-shadow: 0 4px 10px rgba(37,99,235,0.30);
  }
  .sa-nav-item--collapsed {
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

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutGrid, exact: true },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/pagos', label: 'Pagos', icon: Wallet },
  { to: '/admin/actividad', label: 'Actividad', icon: History },
  { to: '/admin/basedatos', label: 'Base de datos', icon: Database },
  { to: '/admin/perfil', label: 'Mi Perfil', icon: UserCircle },
];

function NavItem({ to, label, Icon, exact, colapsado, esMovil, onCerrar }) {
  return (
    <NavLink
      to={to}
      end={exact}
      title={colapsado ? label : undefined}
      onClick={() => { if (esMovil && onCerrar) onCerrar(); }}
      className={({ isActive }) =>
        ['sa-nav-item', isActive ? 'sa-nav-item--active' : '', colapsado ? 'sa-nav-item--collapsed' : '']
          .filter(Boolean).join(' ')
      }
    >
      <Icon size={17} style={{ flexShrink: 0 }} />
      {!colapsado && <span>{label}</span>}
    </NavLink>
  );
}

export default function SidebarSuperAdmin({ colapsado, esMovil, abierto, onCerrar }) {
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
          <div style={S.logoWrap}>
            <ShieldCheck size={16} color="#1E3A8A" />
          </div>
          {!colapsado && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.brandName}>Keysls</div>
              <div style={S.brandSub}>Panel Super Admin</div>
            </div>
          )}
        </div>

        <nav style={S.nav}>
          {!colapsado && <div style={S.sectionLabel}>Principal</div>}
          {colapsado && <div style={{ height: 10 }} />}
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavItem
              key={to} to={to} label={label} Icon={Icon}
              exact={exact ?? false}
              colapsado={colapsado} esMovil={esMovil} onCerrar={onCerrar}
            />
          ))}
        </nav>

        {!colapsado && (
          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 9, color: '#CBD5E1', textAlign: 'center' }}>
              Keysls SaaS v1.0.0
            </div>
          </div>
        )}

      </aside>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import SidebarSuperAdmin from './SidebarSuperAdmin';
import TopbarSuperAdmin from './TopbarSuperAdmin';

const BREAKPOINT_MOVIL  = 1024;
const SIDEBAR_EXPANDIDO = 224;
const SIDEBAR_COLAPSADO = 64;

export default function LayoutSuperAdmin({ children }) {
  const [esMovil, setEsMovil] = useState(
    typeof window !== 'undefined' && window.innerWidth < BREAKPOINT_MOVIL
  );
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const movil = window.innerWidth < BREAKPOINT_MOVIL;
      setEsMovil(movil);
      if (!movil) setSidebarAbierto(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const anchoSidebar = esMovil ? 0 : colapsado ? SIDEBAR_COLAPSADO : SIDEBAR_EXPANDIDO;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <SidebarSuperAdmin
        colapsado={colapsado && !esMovil}
        esMovil={esMovil}
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
      />
      <TopbarSuperAdmin
        esMovil={esMovil}
        colapsado={colapsado}
        anchoSidebar={anchoSidebar}
        onMenuToggle={() => setSidebarAbierto((v) => !v)}
        onColapsarToggle={() => setColapsado((v) => !v)}
      />
      <main style={{
        marginLeft: anchoSidebar, flex: 1, minHeight: '100vh',
        paddingTop: 56, background: 'var(--bg)', overflow: 'auto',
        transition: 'margin-left .2s ease',
      }}>
        {children}
      </main>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import toast from 'react-hot-toast';
import { ArrowLeft, TerminalSquare } from 'lucide-react';
import { oltApi, BACKEND_URL } from '../../services/api';

const WS_BASE = BACKEND_URL.replace(/^http/, 'ws');

export default function OltTerminal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contenedorRef = useRef(null);
  const [estado, setEstado] = useState('conectando'); // conectando | negociando | conectado | cerrado | error
  const [protocolo, setProtocolo] = useState(null);

  useEffect(() => {
    let ws;
    let term;
    let fitAddon;
    let resizeObserver;
    let cancelado = false;

    async function conectar() {
      let ticket;
      try {
        const r = await oltApi.crearTicketTerminal(id);
        ticket = r.data.ticket;
      } catch (err) {
        if (cancelado) return;
        setEstado('error');
        toast.error(err.response?.data?.error || 'No se pudo iniciar la consola');
        return;
      }
      if (cancelado) return;

      term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'var(--font-mono, monospace)',
        theme: { background: '#0D1B2A' },
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(contenedorRef.current);
      fitAddon.fit();

      ws = new WebSocket(`${WS_BASE}/ws/olts/${id}/terminal?ticket=${ticket}`);

      ws.onopen = () => {
        setEstado('negociando');
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'connected') { setEstado('conectado'); setProtocolo(msg.protocolo); }
        else if (msg.type === 'output') term.write(msg.data);
        else if (msg.type === 'error') { term.write(`\r\n\x1b[31m[error] ${msg.message}\x1b[0m\r\n`); setEstado('error'); }
        else if (msg.type === 'closed') setEstado('cerrado');
      };

      ws.onclose = () => setEstado((e) => (e === 'error' ? e : 'cerrado'));
      ws.onerror = () => setEstado('error');

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data }));
      });
      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      });

      resizeObserver = new ResizeObserver(() => fitAddon.fit());
      resizeObserver.observe(contenedorRef.current);
    }

    conectar();

    return () => {
      cancelado = true;
      resizeObserver?.disconnect();
      ws?.close();
      term?.dispose();
    };
  }, [id]);

  const colorEstado = { conectando: '#F59E0B', negociando: '#F59E0B', conectado: '#16A34A', cerrado: '#64748B', error: '#DC2626' }[estado];
  const textoEstado = {
    conectando: 'Conectando...',
    negociando: 'Estableciendo sesión...',
    conectado: `Conectado (${protocolo})`,
    cerrado: 'Sesión cerrada',
    error: 'Error de conexión',
  }[estado];

  return (
    <div className="animate-fade resp-page-padding" style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      <button onClick={() => navigate('/equipos/olts')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--txt-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={15} /> Volver a OLTs
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <TerminalSquare size={19} color="var(--blue)" />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--txt)' }}>Consola SSH</h1>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8, fontSize: 12, color: colorEstado, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorEstado }} />
          {textoEstado}
        </span>
      </div>

      <div
        ref={contenedorRef}
        style={{ flex: 1, background: '#0D1B2A', borderRadius: 12, padding: 10, overflow: 'hidden' }}
      />
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import {
  Database,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Terminal,
  CloudLightning,
  Shield,
  ChevronDown,
  LayoutDashboard,
  Wifi,
  WifiOff,
  MessageCircle,
  Zap,
} from 'lucide-react';
import WhatsAppManager from '../whatsapp/WhatsAppManager';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DanaLog {
  id: number;
  timestamp: string;
  source: 'firebase';
  rawContent: string;
  parsed: number | null;
  status: 'success' | 'failed' | 'pending' | 'duplicate';
  docId?: string;
}

interface ServerStatus {
  online: boolean;
  port: number;
  mode: string;
  logsCount?: number;
}

interface ServerHubProps {
  api: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SERVER_URL = 'http://localhost:3000';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch { return '--:--:--'; }
}

function formatIDR(n: number | null) {
  if (n === null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

const statusConfig: Record<DanaLog['status'], { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  success: { label: 'PARSED', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  failed: { label: 'GAGAL', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: XCircle },
  pending: { label: 'PENDING', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  duplicate: { label: 'DUPLIKAT', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: RefreshCw },
};



function LogRow({ log, index }: { log: DanaLog; index: number }) {
  const cfg = statusConfig[log.status];
  const StatusIcon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group rounded-xl border transition-all duration-300 ${cfg.bg} hover:scale-[1.005]`}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex items-center gap-1.5 w-24 shrink-0">
          <Clock size={12} className="text-text-muted" />
          <span className="text-xs font-mono text-text-muted">{formatTime(log.timestamp)}</span>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/20">
          {log.source.toUpperCase()}
        </span>
        <span className="flex-1 text-sm text-slate-300 truncate font-mono">
          {log.rawContent}
        </span>
        {log.parsed !== null && (
          <span className="shrink-0 text-xs font-bold text-emerald-400 font-mono">
            {formatIDR(log.parsed)}
          </span>
        )}
        <div className={`flex items-center gap-1.5 shrink-0 ${cfg.color}`}>
          <StatusIcon size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wide">{cfg.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5">
          <div className="rounded-lg bg-black/30 p-3 font-mono text-xs text-slate-400 break-all">
            <span className="text-slate-500 select-none">RAW › </span>{log.rawContent}
          </div>
          {log.docId && (
            <p className="text-[10px] text-text-muted mt-2 font-mono">
              Firebase Doc ID: <span className="text-slate-400">{log.docId}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const ServerHub: React.FC<ServerHubProps> = ({ api }) => {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [logs, setLogs] = useState<DanaLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending' | 'duplicate'>('all');
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [stats, setStats] = useState({ success: 0, failed: 0, pending: 0, duplicate: 0, total: 0 });
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'whatsapp' | 'guide'>('dashboard');

  const socketRef = useRef<any>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch {
      setServerStatus(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/server/dana-logs`);
      if (res.ok) {
        const data: DanaLog[] = await res.json();
        setLogs(data);
      }
    } catch { }
  };

  const connectSocket = () => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = socketIO(SERVER_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      setLiveStreamActive(true);
    });

    socket.on('disconnect', () => {
      setLiveStreamActive(false);
    });

    socket.on('server:dana-logs-history', (history: DanaLog[]) => {
      setLogs(history);
    });

    socket.on('server:dana-log', (entry: DanaLog) => {
      setLogs(prev => [entry, ...prev].slice(0, 100));
    });

    socket.on('server:dana-log-update', ({ id, status }: { id: number; status: DanaLog['status'] }) => {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    });

    socket.on('server:status', (status: ServerStatus) => {
      setServerStatus(status);
    });

    socket.on('wa:status-update', (data: { status: any, pushName?: string }) => {
      setWaStatus(data.status);
    });

    socketRef.current = socket;
  };

  const fetchInitialWA = async () => {
    try {
      const res = await api.waGetStatus();
      if (res.status) {
        setWaStatus(res.status);
      }
    } catch (e) { }
  };

  useEffect(() => {
    checkStatus();
    loadLogs();
    connectSocket();
    fetchInitialWA();
    return () => { socketRef.current?.disconnect(); };
  }, []);

  useEffect(() => {
    const s = { success: 0, failed: 0, pending: 0, duplicate: 0, total: logs.length };
    logs.forEach(l => {
      if (l.status === 'success') s.success++;
      else if (l.status === 'failed') s.failed++;
      else if (l.status === 'duplicate') s.duplicate++;
      else s.pending++;
    });
    setStats(s);
  }, [logs]);

  const handleRefresh = () => {
    setIsConnecting(true);
    checkStatus();
    loadLogs();
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.status === filter);
  const isOnline = serverStatus?.online === true;

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      {/* ── Header */}
      <header className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <CloudLightning size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-main leading-tight uppercase tracking-tight">System Control Hub</h1>
            <p className="text-xs text-text-muted font-bold tracking-widest opacity-60 uppercase mt-0.5">Notification Engine & Server Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-bg-card/40 p-1.5 rounded-[22px] border border-border/50 backdrop-blur-md">
          <button onClick={handleRefresh} className="p-2.5 rounded-2xl bg-bg-surface border border-border hover:bg-bg-card transition-all text-text-main group">
            <RefreshCw size={18} className={`${isConnecting ? 'animate-spin text-primary' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </header>

      {/* ── Sub Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-[24px] border border-slate-200 dark:border-white/10 w-fit mb-8 shadow-inner">
        {[
          { id: 'dashboard', label: 'Monitor Hub', icon: LayoutDashboard, color: 'primary' },
          { id: 'whatsapp', label: 'WhatsApp Engine', icon: MessageCircle, color: 'emerald-500' },
          { id: 'guide', label: 'Setup Guide', icon: Shield, color: 'amber-500' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-bold transition-all duration-300 ${activeSubTab === tab.id
                ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-xl scale-105'
                : 'text-text-muted hover:text-text-main'
              }`}
          >
            <tab.icon size={16} className={`${activeSubTab === tab.id ? 'opacity-100' : 'opacity-40'}`} />
            <span className="tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {activeSubTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in pb-10">
            {/* ── Status Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Server Online/Offline */}
              <div className={`relative col-span-2 overflow-hidden rounded-2xl border p-4 flex items-center gap-3 transition-all ${isOnline ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOnline ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                  {isOnline ? <Wifi size={20} className="text-emerald-600 dark:text-emerald-400" /> : <WifiOff size={20} className="text-rose-600 dark:text-rose-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Server Hub</p>
                  <h2 className={`text-lg font-bold leading-none ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isConnecting ? 'CHECKING...' : isOnline ? 'ONLINE' : 'OFFLINE'}
                  </h2>
                </div>
              </div>

              {/* Firebase status */}
              <div className="relative overflow-hidden rounded-2xl bg-bg-card border border-border/50 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Database size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Database</p>
                  <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 leading-none uppercase">Synced</h3>
                </div>
              </div>

              {/* Notif count */}
              <div className="relative overflow-hidden rounded-2xl bg-bg-card border border-border/50 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Logs</p>
                  <h3 className="text-lg font-bold text-text-main leading-none uppercase">{stats.total}</h3>
                </div>
              </div>

              {/* WhatsApp Status Small */}
              <div className={`relative col-span-2 overflow-hidden rounded-2xl border p-4 flex items-center justify-between transition-all ${waStatus === 'connected' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${waStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">WA Engine</p>
                    <h2 className={`text-lg font-bold leading-none ${waStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {waStatus.toUpperCase()}
                    </h2>
                  </div>
                </div>
                <button onClick={() => setActiveSubTab('whatsapp')} className="btn btn-primary px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest rounded-lg">Config</button>
              </div>
            </div>

            {/* ── Log Management Section */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: Logs */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-bold text-text-main uppercase tracking-widest flex items-center gap-3">
                    <Terminal size={18} className="text-primary" />
                    Notification Stream
                    {liveStreamActive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                  </h3>
                  <div className="flex gap-4 items-center">
                    <button
                      onClick={handleClearLogs}
                      className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-500/60 hover:text-rose-500 transition-colors"
                    >
                      Clear Logs
                    </button>
                    <div className="flex gap-2">
                      {(['all', 'success', 'failed', 'duplicate'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-text-muted'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="glass-card p-4 space-y-3 min-h-[400px] border-white/5">
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 opacity-20">
                      <Activity size={60} className="text-text-muted mb-4" />
                      <p className="text-xs uppercase font-bold tracking-widest">Listening for events...</p>
                    </div>
                  ) : (
                    filteredLogs.map((log, i) => <LogRow key={log.id} log={log} index={i} />)
                  )}
                </div>
              </div>

              {/* Right: Small Indicators */}
              <div className="w-full lg:w-72 space-y-4">
                <div className="glass-card p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-4">Traffic Summary</h4>
                  <div className="space-y-4">
                    {[
                       { label: 'Success', count: stats.success, color: 'bg-emerald-500', total: stats.total },
                       { label: 'Failed', count: stats.failed, color: 'bg-rose-500', total: stats.total },
                       { label: 'Duplicate', count: stats.duplicate, color: 'bg-orange-500', total: stats.total },
                       { label: 'Pending', count: stats.pending, color: 'bg-amber-500', total: stats.total },
                    ].map(stat => (
                      <div key={stat.label}>
                        <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase mb-1.5">
                          <span>{stat.label}</span>
                          <span>{stat.count} items</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stat.color} transition-all duration-1000`}
                            style={{ width: `${stat.total === 0 ? 0 : (stat.count / stat.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6 border-white/10 bg-black/5 dark:bg-black/20">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mb-3">Live Feed</h4>
                  <p className="text-[10px] text-text-muted leading-relaxed font-medium">
                    Log ini merekam data mentah yang masuk dari Firebase. Pastikan MacroDroid di HP Anda aktif dengan koneksi internet yang stabil.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'whatsapp' && (
          <div className="animate-fade-in pb-20">
            <WhatsAppManager api={api} />
          </div>
        )}

        {activeSubTab === 'guide' && (
          <div className="animate-fade-in max-w-4xl pb-20">
            <div className="glass-card p-10 border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                <Shield size={200} />
              </div>

              <h2 className="text-3xl font-bold text-text-main flex items-center gap-4 mb-2">
                <Shield className="text-amber-500" size={32} />
                MacroDroid Setup
              </h2>
              <p className="text-text-muted font-bold tracking-widest uppercase text-xs opacity-60 mb-12">Universal Firebase Bridge Configuration</p>

              <div className="space-y-10 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">1</span>
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">HTTP Post Configuration</h3>
                  </div>
                  <div className="p-8 rounded-3xl bg-bg-card border border-border/50 space-y-4 shadow-inner">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Target URL:</label>
                      <code className="text-base text-orange-600 dark:text-orange-200 font-mono block p-4 bg-bg-surface rounded-2xl break-all mt-2 border border-border/50 select-all">
                        https://firestore.googleapis.com/v1/projects/pembukuan-toko-pro/databases/(default)/documents/auto_dana_incoming
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">2</span>
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">JSON Payload Schema</h3>
                  </div>
                  <div className="p-8 rounded-3xl bg-bg-card border border-border/50 shadow-inner">
                    <div className="relative group">
                      <pre className="text-sm text-text-muted font-mono leading-relaxed select-all">
                        {`{ 
  "fields": { 
    "text": { "stringValue": "[NOTIF_TEXT]" }, 
    "processed": { "booleanValue": false } 
  } 
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-amber-500/10 rounded-3xl border border-amber-500/20 flex items-start gap-5">
                  <div className="p-3 bg-amber-500 rounded-2xl text-white dark:text-white shadow-xl shadow-amber-500/20">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest text-sm mb-2">Zero-Maintenance Tunnel</h5>
                    <p className="text-xs text-text-muted leading-relaxed font-bold opacity-80">
                      Berbeda dengan Ngrok, sistem Firebase ini bekerja selamanya tanpa perlu update URL manual. Sekali Bapak setting di MacroDroid, data akan terus mengalir selama ada internet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerHub;

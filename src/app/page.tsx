"use client";

import React, { useState, useEffect } from 'react';

interface ClientData {
  id: string;
  name: string;
  organization?: string;
  company?: string;
  branch: string;
  contactNumber?: string;
  maxDevices: number;
  status: string;
  systemType?: string;
  key?: string;
  maskedKey?: string;
  expires: string;
  upgradeRequested?: boolean;
  metrics?: { cpu: string; memory: string; uptime: number; lastSeen: string };
  devices?: { id: string; userAgent: string; createdAt: string; }[];
  lat?: number;
  lng?: number;
  amountPaid?: number;
}

interface MonitoringData {
  uptime: string;
  avgResponseTime: number;
  totalRequests: string;
  systemUsage: { day: string; usage: number; color: string }[];
  endpoints: { path: string; method: string; status: string; latency: number }[];
}

export default function Home() {
    const [isHydrating, setIsHydrating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [clients, setClients] = useState<ClientData[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [unmaskedKeys, setUnmaskedKeys] = useState<Record<string, boolean>>({});
  const [showAddClientOnlyModal, setShowAddClientOnlyModal] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  

  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, text: "System update scheduled at 2 AM", read: false, time: "2h ago" },
    { id: 2, text: "New client 'Aztech Corp' registered", read: false, time: "4h ago" },
    { id: 3, text: "Node 4 CPU usage exceeds 90%", read: true, time: "1d ago" }
  ]);

  const addNotification = (text: string) => {
    setNotifications(prev => [
      { id: Date.now() + Math.random(), text, read: false, time: "Just now" },
      ...prev
    ]);
  };

  const [isBroadcastActive, setIsBroadcastActive] = useState(false);
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newClientId, setNewClientId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientBranch, setNewClientBranch] = useState('');
  const [newClientMaxDevices, setNewClientMaxDevices] = useState<number>(5);
  const [newClientSystemType, setNewClientSystemType] = useState('POS');
  const [newClientOrg, setNewClientOrg] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientExpiry, setNewClientExpiry] = useState('30');
  const [newClientCustomExpiry, setNewClientCustomExpiry] = useState('');
  const [newClientLat, setNewClientLat] = useState('');
  const [newClientLng, setNewClientLng] = useState('');
  const [timeRange, setTimeRange] = useState('1h');
  const [endpointFilter, setEndpointFilter] = useState('all');
  
  const [addTerminalsModal, setAddTerminalsModal] = useState<any>(null);
  const [replyTicketModal, setReplyTicketModal] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  // --- REAL API FUNCTIONS ---

  const loadClients = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/clients', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || data || []);
      }
    } catch { /* keep existing data on network error */ }
  };

  const loadTickets = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/clients/tickets', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || data || []);
      }
    } catch { /* keep existing */ }
  };

  const loadBilling = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/billing', { credentials: 'same-origin', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || data || []);
      }
    } catch { /* keep existing */ }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        addNotification('Admin logged in successfully');
      } else {
        alert('Invalid password. Hint: Try itadmin123');
      }
    } catch {
      if (password === 'itadmin123') setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
    } catch {}
    setIsAuthenticated(false);
    setPassword('');
  };

  const handleUpdateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: isBroadcastActive, type: broadcastType, message: broadcastMessage })
      });
      addNotification(isBroadcastActive ? 'Broadcast deployed: ' + broadcastMessage.substring(0, 40) + '...' : 'Broadcast deactivated');
    } catch {
      addNotification('Broadcast update sent (offline mode)');
    }
  };

  const handleClientAction = (id: string, action: string, msg: string) => {
    setConfirmDialog({
      isOpen: true,
      title: action === 'revoke' ? 'Revoke License' : (action === 'delete' ? 'Delete Client' : 'Confirm Action'),
      message: msg,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/clients', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
          });
          if (res.ok) {
            addNotification("Client action '" + action + "' applied successfully");
            await loadClients();
          }
        } catch {
          addNotification("Client action '" + action + "' failed - offline mode");
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiryDays = newClientCustomExpiry ? parseInt(newClientCustomExpiry) : parseInt(newClientExpiry);
    const expires = new Date(Date.now() + 86400000 * expiryDays).toISOString();
    try {
      const method = newClientId ? 'PUT' : 'POST';
      const res = await fetch('/api/clients', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newClientId || undefined,
          name: newClientName,
          organization: newClientOrg,
          company: newClientCompany,
          branch: newClientBranch,
          contactNumber: newClientContact,
          maxDevices: newClientMaxDevices,
          systemType: newClientSystemType,
          expires,
          lat: newClientLat ? parseFloat(newClientLat) : undefined,
          lng: newClientLng ? parseFloat(newClientLng) : undefined,
        })
      });
      if (res.ok) {
        addNotification(newClientId ? "Client '" + newClientName + "' updated" : "New key generated for '" + newClientName + "'");
        await loadClients();
      }
    } catch {
      addNotification('Client save failed');
    }
    setShowModal(false);
    setShowAddClientOnlyModal(false);
    setNewClientId(''); setNewClientName(''); setNewClientBranch('');
    setNewClientOrg(''); setNewClientCompany(''); setNewClientContact('');
    setNewClientMaxDevices(5); setNewClientLat(''); setNewClientLng('');
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const init = async () => {
      await Promise.all([loadClients(), loadTickets(), loadBilling()]);
      setIsLoading(false);
    };
    init();

    const pollInterval = setInterval(async () => {
      await loadClients();
      await loadTickets();
    }, 15000);

    return () => clearInterval(pollInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth', { credentials: 'same-origin', cache: 'no-store' });
        if (res.ok) setIsAuthenticated(true);
      } catch {}
      setIsHydrating(false);
      if (!isAuthenticated) setIsLoading(false);
    };
    checkSession();

    // Real-time clock
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // Simulate live monitoring metrics (replace with real WebSocket when available)
    const metricsInterval = setInterval(() => {
      setMonitoring(prev => ({
        uptime: prev?.uptime || '99.8%',
        avgResponseTime: Math.floor(Math.random() * 30) + 10,
        totalRequests: ((parseInt(String(prev?.totalRequests || '0').replace(/,/g,'')) || 0) + Math.floor(Math.random() * 20)).toLocaleString(),
        systemUsage: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => ({
          day,
          usage: Math.floor(Math.random() * 60) + 30,
          color: 'hsl(' + (220 + i * 10) + ', 70%, 55%)'
        })),
        endpoints: prev?.endpoints || [
          { path: '/api/clients', method: 'GET', status: '200', latency: 12 },
          { path: '/api/verify-license', method: 'POST', status: '200', latency: 18 },
          { path: '/api/broadcast', method: 'GET', status: '200', latency: 8 },
          { path: '/api/billing', method: 'GET', status: '200', latency: 22 },
          { path: '/api/clients/tickets', method: 'POST', status: '201', latency: 15 },
        ]
      }));
    }, 5000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(metricsInterval);
    };
  }, [isAuthenticated]);
  if (isHydrating) {
    return <div className="min-h-screen bg-surface"></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-body-md">
        <form onSubmit={handleLogin} className="bg-surface-container-low p-space-xl rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-space-md w-96 border border-surface-container">
          <div className="flex items-center gap-space-sm mb-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary">dns</span>
            </div>
            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">RetailSys NOC</span>
          </div>
          <div>
            <label className="text-label-md font-medium text-on-surface mb-2 block">Secure IT Login</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface outline-none focus:border-primary focus:ring-1 transition-all" placeholder="Enter admin password..." />
          </div>
          <button type="submit" className="w-full py-2 bg-primary text-on-primary font-medium rounded-lg hover:bg-primary-container transition-colors mt-2">
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-surface font-body-md text-on-surface antialiased">

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col">
          <div className="p-space-lg pb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">dns</span>
              </div>
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface block leading-none">RetailSys NOC</span>
                <span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant block mt-space-xs">IT ADMIN & TELEMETRY</span>
              </div>
            </div>
            <div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                <span className="font-data-mono-sm text-data-mono-sm text-tertiary font-bold uppercase">Telemetry Live</span>
              </div>
              <span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">v4.18.2</span>
            </div>
          </div>
          
          <div className="px-space-md pb-space-lg flex flex-col gap-space-lg">
            <section>
              <div className="px-space-sm mb-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant">Operations &amp; Telemetry</div>
              <nav className="flex flex-col gap-space-xs">
                <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'overview' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
                  <span>Overview</span>
                </button>
                <button onClick={() => setActiveTab('clients')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'clients' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  <span>Clients</span>
                </button>
                <button onClick={() => setActiveTab('multi_store_nodes')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'multi_store_nodes' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                  <span>Multi-Store POS Nodes</span>
                </button>
                <button onClick={() => setActiveTab('map')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'map' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">map</span>
                  <span>Live Map</span>
                </button>
                <button onClick={() => setActiveTab('broadcast')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'broadcast' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                  <span>Broadcast</span>
                </button>
              </nav>
            </section>

            <section>
              <div className="px-space-sm mb-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant">Hardware &amp; Systems</div>
              <nav className="flex flex-col gap-space-xs">
                <button onClick={() => setActiveTab('licenses')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'licenses' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  <span>License Keys</span>
                </button>
                <button onClick={() => setActiveTab('hardware_sync')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'hardware_sync' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                  <span>Serialized Hardware Sync</span>
                </button>
                <button onClick={() => setActiveTab('hardware_bench')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'hardware_bench' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">build_circle</span>
                  <span>RMA &amp; Hardware Bench</span>
                </button>
                <button onClick={() => setActiveTab('firmware')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'firmware' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">system_update</span>
                  <span>Firmware &amp; Config Distribution</span>
                </button>
              </nav>
            </section>

            <section>
              <div className="px-space-sm mb-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant">Network &amp; Traffic</div>
              <nav className="flex flex-col gap-space-xs">
                <button onClick={() => setActiveTab('api')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'api' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">timeline</span>
                  <span>API Monitoring</span>
                </button>
                <button onClick={() => setActiveTab('endpoint_latency')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'endpoint_latency' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">speed</span>
                  <span>Endpoint Latency</span>
                </button>
                <button onClick={() => setActiveTab('edge_sync')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'edge_sync' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                  <span>Edge Sync Queues</span>
                </button>
                <button onClick={() => setActiveTab('db_health')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'db_health' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">database</span>
                  <span>Database &amp; Cluster Health</span>
                </button>
              </nav>
            </section>

            <section>
              <div className="px-space-sm mb-space-xs font-label-caps text-label-caps uppercase text-on-surface-variant">Support &amp; Security</div>
              <nav className="flex flex-col gap-space-xs">
                <button onClick={() => setActiveTab('incident_logs')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'incident_logs' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span>Incident Logs &amp; Alerts</span>
                </button>
                <button onClick={() => setActiveTab('tickets')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'tickets' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                  <span>Support Tickets</span>
                </button>
                <button onClick={() => setActiveTab('rbac')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'rbac' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">shield_person</span>
                  <span>Access Audits &amp; RBAC</span>
                </button>
                <button onClick={() => setActiveTab('billing')} className={`flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-body-sm text-body-sm ${activeTab === 'billing' ? 'bg-primary-container text-on-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
                  <span className="material-symbols-outlined text-[18px]">credit_card</span>
                  <span>Billing &amp; Invoices</span>
                </button>
              </nav>
            </section>
          </div>
        </div>
        
        <div className="p-space-md m-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <span className="font-data-mono-sm text-data-mono-sm text-secondary font-bold">PRO ENTERPRISE</span>
            </div>
            <span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">ACTIVE</span>
          </div>
          <div className="flex items-center justify-between pt-space-xs">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="leading-tight">
                <div className="font-body-sm text-body-sm font-semibold text-on-surface">AJ Developer</div>
                <div className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">Superadmin</div>
              </div>
            </div>
            <button onClick={handleLogout} className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>


      <div className="pl-72 w-full">
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-margin-desktop">
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
              <span>System</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-semibold text-on-surface">{activeTab}</span>
            </div>
            <div className="hidden xl:flex items-center gap-space-sm pl-space-md">
              <div className="flex items-center gap-space-xs px-space-xs py-0.5 rounded bg-surface-container-low">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="font-data-mono-sm text-data-mono-sm text-tertiary">All Clusters Operational</span>
              </div>
              <div className="flex items-center gap-space-xs px-space-xs py-0.5 rounded bg-surface-container-low">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span className="font-data-mono-sm text-data-mono-sm text-secondary">99.98% Uptime</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-data-mono-sm text-data-mono-sm font-semibold text-on-surface">
                {isHydrating ? '' : currentTime.toLocaleTimeString()}
              </span>
            </div>
            
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors relative">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-surface"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-surface-container rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-space-sm border-b border-surface-container flex justify-between items-center bg-surface-container-lowest">
                    <h3 className="font-headline-sm text-headline-sm m-0">Notifications</h3>
                    <button onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))} className="text-primary font-body-sm text-body-sm">Mark all as read</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-space-lg text-center text-on-surface-variant text-body-sm">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-space-sm border-b border-surface-container cursor-pointer ${n.read ? 'bg-surface' : 'bg-surface-container-low'}`} onClick={() => setNotifications(notifications.map(notif => notif.id === n.id ? {...notif, read: true} : notif))}>
                          <p className={`m-0 mb-1 text-body-sm ${n.read ? 'text-on-surface-variant' : 'text-on-surface font-medium'}`}>{n.text}</p>
                          <p className="m-0 text-data-mono-sm text-on-surface-variant">{n.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setActiveTab('broadcast')} className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-body-sm text-body-sm font-medium hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-[16px]">podcasts</span>
              <span>Trigger Broadcast</span>
            </button>
          </div>
        </header>

        <main className="w-full pt-16 bg-surface min-h-screen">
          <div className="p-margin-desktop flex flex-col gap-space-lg">
          {activeTab === 'overview' && (
            <>
            <div className="p-margin-desktop flex flex-col gap-space-lg">
{/*  SUB-HEADER TELEMETRY STRIP  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
<div className="flex flex-wrap items-center gap-space-md">
<div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
<span className="material-symbols-outlined text-[18px] text-primary">hub</span>
<span className="font-medium text-on-surface">Network Operations Center</span>
<span className="text-outline-variant">/</span>
<span className="font-semibold text-primary">Global Telemetry Mesh</span>
</div>
<div className="h-4 w-px bg-surface-container-high hidden sm:block"></div>
{/*  Filter Selectors  */}
<div className="flex flex-wrap items-center gap-space-xs">
{/*  Hub Filter  */}
<div className="relative inline-flex items-center">
<span className="material-symbols-outlined absolute left-2 text-[15px] text-on-surface-variant pointer-events-none">storefront</span>
<select className="pl-7 pr-6 py-1 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-surface-container">
<option defaultValue="">All Hubs ({clients.length} Nodes)</option>
<option>Metro Manila Hubs (86 Nodes)</option>
<option>Provincial Retail Hubs (58 Nodes)</option>
</select>
<span className="material-symbols-outlined absolute right-1.5 text-[14px] text-on-surface-variant pointer-events-none">arrow_drop_down</span>
</div>
{/*  Cluster Filter  */}
<div className="relative inline-flex items-center">
<span className="material-symbols-outlined absolute left-2 text-[15px] text-on-surface-variant pointer-events-none">cloud</span>
<select className="pl-7 pr-6 py-1 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-surface-container">
<option defaultValue="">AWS Primary (ap-southeast-1)</option>
<option>Edge Gateway Clusters (Mesh)</option>
<option>Disaster Recovery (ap-northeast-1)</option>
</select>
<span className="material-symbols-outlined absolute right-1.5 text-[14px] text-on-surface-variant pointer-events-none">arrow_drop_down</span>
</div>
{/*  Time Range  */}
<div className="flex bg-surface-container-low rounded-lg p-0.5" id="timeframe-selector">
{['1h','24h','7d','30d'].map(r => (
<button key={r} onClick={() => setTimeRange(r)} className={`px-space-xs py-0.5 rounded text-data-mono-sm font-data-mono-sm ${timeRange === r ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`} type="button">{r === '1h' ? 'Realtime 1h' : r}</button>
))}
</div>
</div>
</div>
{/*  Micro Status Strip  */}
<div className="flex flex-wrap items-center gap-space-sm font-data-mono-sm text-data-mono-sm">
<div className="flex items-center gap-space-xs px-space-sm py-1 bg-tertiary-fixed/30 text-on-tertiary-fixed-variant rounded-lg font-medium">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
<span>128 Nodes Synced</span>
</div>
<div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low text-on-surface-variant rounded-lg">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
<span>0 Critical Outages</span>
</div>
<div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low text-on-surface-variant rounded-lg">
<span className="material-symbols-outlined text-[13px] text-secondary">speed</span>
<span>API: <strong className="text-on-surface">{monitoring?.avgResponseTime || 18}ms</strong> avg</span>
</div>
<div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low text-on-surface-variant rounded-lg">
<span className="material-symbols-outlined text-[13px] text-tertiary">sync_saved_locally</span>
<span>Sync Queue: <strong className="text-on-surface">0 backlog</strong></span>
</div>
</div>
</div>
{/*  HIGH-DENSITY KPI CARDS (6 GRIDS)  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-md">
{/*  Card 1: Active Store Nodes  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Store Nodes</span>
<span className="px-1.5 py-0.5 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant rounded font-data-mono-sm text-data-mono-sm font-semibold">{monitoring?.uptime || "98.6%"}</span>
</div>
<div className="mt-space-sm flex items-baseline justify-between">
<div className="font-data-mono-lg text-data-mono-lg text-on-surface font-bold">142 <span className="text-body-sm font-body-sm text-on-surface-variant font-normal">/ 144</span></div>
<span className="text-tertiary flex items-center font-data-mono-sm text-data-mono-sm font-semibold">
<span className="material-symbols-outlined text-[14px]">arrow_upward</span>+4 wk
          </span>
</div>
<div className="mt-space-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>2 Standby / Maint.</span>
<svg className="w-16 h-5" fill="none" viewBox="0 0 64 20">
<path d="M1 15 L14 12 L27 16 L40 8 L52 10 L63 3" stroke="#006e4b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
</div>
{/*  Card 2: RMS Serial Registry  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">RMS Serial Registry</span>
<span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface font-data-mono-sm text-data-mono-sm font-semibold">24 Stores</span>
</div>
<div className="mt-space-sm flex items-baseline justify-between">
<div className="font-data-mono-lg text-data-mono-lg text-on-surface font-bold">{monitoring?.totalRequests || "48,920"}</div>
<span className="text-secondary font-data-mono-sm text-data-mono-sm font-medium">Audited</span>
</div>
<div className="mt-space-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>0 conflict locks</span>
<svg className="w-16 h-5" fill="none" viewBox="0 0 64 20">
<path d="M1 18 L15 14 L28 15 L41 9 L53 6 L63 4" stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
</div>
{/*  Card 3: Network & API Throughput  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">API Throughput</span>
<span className="px-1.5 py-0.5 bg-secondary-fixed/50 text-on-secondary-fixed-variant rounded font-data-mono-sm text-data-mono-sm font-semibold">Peak 2,840 rps</span>
</div>
<div className="mt-space-sm flex items-baseline justify-between">
<div className="font-data-mono-lg text-data-mono-lg text-on-surface font-bold">1.42M <span className="text-body-sm font-body-sm text-on-surface-variant font-normal">/hr</span></div>
<span className="text-tertiary font-data-mono-sm text-data-mono-sm font-semibold">99.98% OK</span>
</div>
<div className="mt-space-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>Edge ingress load</span>
<svg className="w-16 h-5" fill="none" viewBox="0 0 64 20">
<path d="M1 16 L12 11 L25 14 L38 5 L50 9 L63 2" stroke="#006591" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
</div>
{/*  Card 4: Edge Queue & Transaction Sync  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Edge POS Synced</span>
<span className="px-1.5 py-0.5 bg-surface-container-high text-primary font-data-mono-sm text-data-mono-sm font-semibold">12ms avg</span>
</div>
<div className="mt-space-sm flex items-baseline justify-between">
<div className="font-data-mono-lg text-data-mono-lg text-on-surface font-bold">₱3.84M</div>
<span className="text-on-surface-variant font-data-mono-sm text-data-mono-sm">Today</span>
</div>
<div className="mt-space-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>14,280 POS tickets</span>
<svg className="w-16 h-5" fill="none" viewBox="0 0 64 20">
<path d="M1 17 L15 13 L28 11 L40 14 L52 7 L63 3" stroke="#3525cd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
</div>
{/*  Card 5: P99 API Latency  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">P99 API Latency</span>
<span className="px-1.5 py-0.5 bg-tertiary-fixed/30 text-tertiary-container rounded font-data-mono-sm text-data-mono-sm font-semibold">&lt; 100ms SLA</span>
</div>
<div className="mt-space-sm flex items-baseline justify-between">
<div className="font-data-mono-lg text-data-mono-lg text-tertiary font-bold">24ms</div>
<span className="text-tertiary font-data-mono-sm text-data-mono-sm font-semibold">Healthy</span>
</div>
<div className="mt-space-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>0ms packet drops</span>
<svg className="w-16 h-5" fill="none" viewBox="0 0 64 20">
<path d="M1 8 L14 11 L27 7 L40 10 L52 8 L63 6" stroke="#006e4b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
</svg>
</div>
</div>
{/*  Card 6: Active Incidents  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
<div className="flex items-start justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Incidents</span>
<span className="px-1.5 py-0.5 bg-error-container text-on-error-container rounded font-data-mono-sm text-data-mono-sm font-semibold">2 Actions</span>
</div>
<div className="mt-space-sm flex items-baseline justify-between">
<div className="font-data-mono-lg text-data-mono-lg text-error font-bold">2 <span className="text-body-sm font-body-sm text-on-surface-variant font-normal">Warnings</span></div>
<span className="text-on-surface-variant font-data-mono-sm text-data-mono-sm">0 Critical</span>
</div>
<div className="mt-space-sm flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>1 Latency • 1 Auth</span>
<span className="material-symbols-outlined text-[18px] text-error">warning</span>
</div>
</div>
</div>
{/*  DUAL SECTION: REFERENCE VISUAL EMBED & TOPOLOGY INSPECTION  */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row gap-space-lg items-center">
<div className="flex-1 w-full flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[20px]">photo_camera</span>
<span className="font-headline-sm text-headline-sm text-on-surface">Global NOC Telemetry Reference Canvas</span>
</div>
<span className="px-space-sm py-0.5 bg-primary-fixed text-on-primary-fixed font-data-mono-sm text-data-mono-sm rounded">ACTIVE NOC SNAPSHOT</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
          Continuous synchronized video-over-telemetry feed of the multi-branch edge mesh, active till peripherals, and point-of-sale node orchestrator.
        </p>
<div className="relative w-full rounded-lg overflow-hidden mt-space-xs shadow-inner">
<img alt="NOC Telemetry Overview Screen" className="w-full object-cover max-h-72 object-top hover:scale-[1.01] transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_7u_52nSjkt2qfdiFzBYXs7pyaxauGo9trCL4FsamuxPWFHdTO6FW832M8wJFhjrB4WiPTOf0BH3sAnX1jc_2d4rhRFCLwv-9D5K_h9fNn_1VPK9vB7h1Upia96q3cuB3Eq-b-pK-ppXKDNY4FgCXPOmF3RX2-WW0m2Dke04WgkfBqK17D16F7OTuiWq92LNr_znv9BJDrx9tWAGAuX2TLZ59K9SWfwlOW0yDiNqgyvxMjwKaraG6jJL1r1nxJIdk2A"/>
<div className="absolute bottom-2 left-2 px-space-xs py-0.5 bg-inverse-surface/90 text-inverse-on-surface text-data-mono-sm font-data-mono-sm rounded backdrop-blur-sm">
            FRAME ID: NOC-PH-MNL-NODE99
          </div>
<div className="absolute bottom-2 right-2 flex items-center gap-space-xs px-space-xs py-0.5 bg-surface-container-lowest/90 text-on-surface text-data-mono-sm font-data-mono-sm rounded backdrop-blur-sm">
<span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
<span>LIVE 60FPS WEBRTC</span>
</div>
</div>
</div>
<div className="w-full xl:w-96 flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-lg">
<div className="flex items-center justify-between">
<span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Edge Node Health Grid</span>
<span className="font-data-mono-sm text-data-mono-sm text-tertiary font-bold">100% REGION SYNCS</span>
</div>
<div className="grid grid-cols-4 gap-space-xs">
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">MNL-01</span>
<span className="w-2 h-2 rounded-full bg-tertiary mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-on-surface-variant text-[10px]">11ms</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">MNL-02</span>
<span className="w-2 h-2 rounded-full bg-tertiary mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-on-surface-variant text-[10px]">14ms</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">MKT-04</span>
<span className="w-2 h-2 rounded-full bg-error mt-0.5 animate-pulse"></span>
<span className="text-data-mono-sm font-data-mono-sm text-error text-[10px]">AUTH!</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">QC-01</span>
<span className="w-2 h-2 rounded-full bg-tertiary mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-on-surface-variant text-[10px]">9ms</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">CEB-01</span>
<span className="w-2 h-2 rounded-full bg-secondary-container mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-secondary text-[10px]">340ms</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">CEB-02</span>
<span className="w-2 h-2 rounded-full bg-tertiary mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-on-surface-variant text-[10px]">26ms</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">DAV-01</span>
<span className="w-2 h-2 rounded-full bg-tertiary mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-on-surface-variant text-[10px]">29ms</span>
</div>
<div className="bg-surface-container-lowest p-space-xs rounded flex flex-col items-center justify-center text-center">
<span className="font-data-mono-sm text-data-mono-sm font-bold text-on-surface">ILO-01</span>
<span className="w-2 h-2 rounded-full bg-tertiary mt-0.5"></span>
<span className="text-data-mono-sm font-data-mono-sm text-on-surface-variant text-[10px]">24ms</span>
</div>
</div>
<div className="pt-space-xs flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>Failover Strategy:</span>
<span className="font-data-mono-sm text-data-mono-sm text-primary font-semibold">Active/Active Anycast</span>
</div>
<div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
<span>Cluster Node Sync:</span>
<span className="font-data-mono-sm text-data-mono-sm text-tertiary font-semibold">Zero Desync Logs</span>
</div>
</div>
</div>
{/*  MID SECTION: VISUAL TELEMETRY & SYSTEM ANALYTICS (7:5 SPLIT)  */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
{/*  LEFT COLUMN: Dual-Line Area Chart (7 Cols)  */}
<div className="xl:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
<div>
<div className="flex items-center gap-space-xs">
<span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Network Traffic &amp; Edge Sync Throughput</span>
<span className="px-space-xs py-0.5 bg-secondary-fixed/50 text-on-secondary-fixed-variant rounded text-data-mono-sm font-data-mono-sm">7-DAY ANALYTICS</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Daily POS API Request Volume vs Edge Database Sync Transactions</p>
</div>
{/*  Timeframe selector  */}
<div className="flex bg-surface-container-low rounded-lg p-0.5 self-start sm:self-auto">
{['Hourly','24h','7 Days','30 Days'].map((r) => (
<button key={r} onClick={() => setTimeRange(r)} className={`px-space-sm py-1 rounded text-data-mono-sm font-data-mono-sm ${timeRange === r ? 'bg-surface-container-lowest font-semibold text-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`} type="button">{r}</button>
))}
</div>
</div>
{/*  Inline SVG Area Chart  */}
<div className="relative w-full h-72">
{/*  Background Grid Lines  */}
<div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
<div className="w-full h-px bg-outline-variant"></div>
<div className="w-full h-px bg-outline-variant"></div>
<div className="w-full h-px bg-outline-variant"></div>
<div className="w-full h-px bg-outline-variant"></div>
<div className="w-full h-px bg-outline-variant"></div>
</div>
<svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 700 280">
<defs>
<linearGradient id="gradPrimary" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="#4f46e5" stopOpacity="0.32"></stop>
<stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"></stop>
</linearGradient>
<linearGradient id="gradSecondary" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="#006591" stopOpacity="0.22"></stop>
<stop offset="100%" stopColor="#006591" stopOpacity="0.0"></stop>
</linearGradient>
</defs>
{/*  Line 1: Request Volume Area & Path  */}
<path d="M 0 280 L 0 180 L 116 145 L 233 155 L 350 120 L 466 75 L 583 30 L 700 90 L 700 280 Z" fill="url(#gradPrimary)"></path>
<path d="M 0 180 L 116 145 L 233 155 L 350 120 L 466 75 L 583 30 L 700 90" stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
{/*  Line 2: Edge DB Sync payload  */}
<path d="M 0 280 L 0 220 L 116 190 L 233 200 L 350 165 L 466 135 L 583 95 L 700 150 L 700 280 Z" fill="url(#gradSecondary)"></path>
<path d="M 0 220 L 116 190 L 233 200 L 350 165 L 466 135 L 583 95 L 700 150" stroke="#006591" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
{/*  Data Point Highlights on Peak (Saturday)  */}
<circle className="animate-pulse" cx="583" cy="30" fill="#4f46e5" r="5"></circle>
<circle cx="583" cy="95" fill="#006591" r="4"></circle>
</svg>
</div>
{/*  Axis Labels  */}
<div className="flex items-center justify-between text-data-mono-sm font-data-mono-sm text-on-surface-variant pt-space-xs">
<span>MON (1.10M)</span>
<span>TUE (1.35M)</span>
<span>WED (1.28M)</span>
<span>THU (1.52M)</span>
<span>FRI (1.84M)</span>
<span className="text-primary font-bold">SAT (2.14M PEAK)</span>
<span>SUN (1.76M)</span>
</div>
{/*  Store Node Breakdown Badges  */}
<div className="mt-space-md pt-space-sm flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
<div className="flex items-center gap-space-md font-body-sm text-body-sm">
<div className="flex items-center gap-space-xs">
<span className="w-3 h-3 rounded-full bg-primary"></span>
<span className="font-medium text-on-surface">API Reqs</span>
</div>
<div className="flex items-center gap-space-xs">
<span className="w-3 h-1 bg-secondary rounded"></span>
<span className="font-medium text-on-surface">Edge DB Sync</span>
</div>
</div>
<div className="flex flex-wrap items-center gap-space-xs">
<span className="px-space-xs py-0.5 rounded bg-surface-container-lowest text-on-surface font-data-mono-sm text-data-mono-sm">Mega Mall: <strong>38%</strong></span>
<span className="px-space-xs py-0.5 rounded bg-surface-container-lowest text-on-surface font-data-mono-sm text-data-mono-sm">Makati Hub: <strong>29%</strong></span>
<span className="px-space-xs py-0.5 rounded bg-surface-container-lowest text-on-surface font-data-mono-sm text-data-mono-sm">Cebu Branch: <strong>21%</strong></span>
<span className="px-space-xs py-0.5 rounded bg-surface-container-lowest text-on-surface font-data-mono-sm text-data-mono-sm">Davao Store: <strong>12%</strong></span>
</div>
</div>
</div>
{/*  RIGHT COLUMN: Multi-Region Server Resources & Cluster Health (5 Cols)  */}
<div className="xl:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-space-sm">
<div>
<span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Cluster Health &amp; Hardware Loads</span>
<p className="font-body-sm text-body-sm text-on-surface-variant">Multi-region telemetry (AWS Primary ap-southeast-1)</p>
</div>
<span className="flex items-center gap-1 px-space-xs py-0.5 bg-tertiary-fixed/30 text-on-tertiary-fixed-variant rounded text-data-mono-sm font-data-mono-sm font-semibold">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              OPTIMAL
            </span>
</div>
{/*  Progress Bars & Resource Meters  */}
<div className="flex flex-col gap-space-md mt-space-md">
{/*  CPU Load  */}
<div>
<div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
<span className="font-medium text-on-surface">CPU Core Cluster Load</span>
<span className="font-data-mono-md text-data-mono-md font-bold text-tertiary">28% <span className="font-normal text-on-surface-variant text-data-mono-sm">(16 Cores Xeon)</span></span>
</div>
<div className="w-full h-2 rounded bg-surface-container-high overflow-hidden">
<div className="h-full bg-tertiary rounded" style={{width: "28%"}}></div>
</div>
</div>
{/*  Redis Memory  */}
<div>
<div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
<span className="font-medium text-on-surface">Redis &amp; Memory Allocation</span>
<span className="font-data-mono-md text-data-mono-md font-bold text-secondary">62% <span className="font-normal text-on-surface-variant text-data-mono-sm">(48GB / 64GB)</span></span>
</div>
<div className="w-full h-2 rounded bg-surface-container-high overflow-hidden">
<div className="h-full bg-secondary-container rounded" style={{width: "62%"}}></div>
</div>
</div>
{/*  NVMe Storage I/O  */}
<div>
<div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
<span className="font-medium text-on-surface">Edge NVMe Storage I/O</span>
<span className="font-data-mono-md text-data-mono-md font-bold text-on-surface">18% <span className="font-normal text-on-surface-variant text-data-mono-sm">(120 MB/s sustained)</span></span>
</div>
<div className="w-full h-2 rounded bg-surface-container-high overflow-hidden">
<div className="h-full bg-primary rounded" style={{width: "18%"}}></div>
</div>
</div>
{/*  DB Replication Lag  */}
<div>
<div className="flex items-center justify-between font-body-sm text-body-sm mb-1">
<span className="font-medium text-on-surface">PostgreSQL Replication Lag</span>
<span className="font-data-mono-md text-data-mono-md font-bold text-tertiary">4ms <span className="font-normal text-on-surface-variant text-data-mono-sm">(Master-Replica Sync)</span></span>
</div>
<div className="w-full h-2 rounded bg-surface-container-high overflow-hidden">
<div className="h-full bg-tertiary rounded" style={{width: "8%"}}></div>
</div>
</div>
</div>
</div>
{/*  Node Status Pills  */}
<div className="mt-space-lg pt-space-md flex flex-col gap-space-xs">
<div className="font-label-caps text-label-caps uppercase text-on-surface-variant mb-1">Cluster Nodes Health Status</div>
<div className="grid grid-cols-2 gap-space-xs">
<div className="p-space-xs bg-surface-container-low rounded-lg flex items-center justify-between">
<span className="font-body-sm text-body-sm text-on-surface">Primary DB Cluster</span>
<span className="px-1.5 py-0.5 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant rounded font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</div>
<div className="p-space-xs bg-surface-container-low rounded-lg flex items-center justify-between">
<span className="font-body-sm text-body-sm text-on-surface">Redis Cache Mesh</span>
<span className="px-1.5 py-0.5 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant rounded font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</div>
<div className="p-space-xs bg-surface-container-low rounded-lg flex items-center justify-between">
<span className="font-body-sm text-body-sm text-on-surface">Edge Broker Fleet</span>
<span className="px-1.5 py-0.5 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant rounded font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</div>
<div className="p-space-xs bg-surface-container-low rounded-lg flex items-center justify-between">
<span className="font-body-sm text-body-sm text-on-surface">Disaster S3 Cold Store</span>
<span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface font-data-mono-sm text-data-mono-sm font-bold">SYNCED</span>
</div>
</div>
</div>
</div>
</div>
{/*  BOTTOM OPERATIONAL FEEDS (6:6 SPLIT)  */}
<div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
{/*  LEFT PANEL: Live Incident & Security Event Log (6 Cols)  */}
<div className="xl:col-span-6 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div>
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
<div>
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-error text-[20px]">security</span>
<span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Incident &amp; Security Event Log</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Realtime automated alerts and anomaly mitigations</p>
</div>
{/*  Filter tabs  */}
<div className="flex flex-wrap bg-surface-container-low rounded-lg p-0.5 font-data-mono-sm text-data-mono-sm">
{[['all','All (14)'],['crit','Crit (0)'],['warn','Warn (2)'],['auth','Auth (1)']].map(([key, label]) => (
<button key={key} onClick={() => setEndpointFilter(key)} className={`px-space-xs py-0.5 rounded text-data-mono-sm ${endpointFilter === key ? 'bg-surface-container-lowest font-semibold text-primary shadow-xs' : key === 'warn' ? 'text-error font-medium' : 'text-on-surface-variant hover:text-on-surface'}`} type="button">{label}</button>
))}
</div>
</div>
{/*  Incidents List  */}
<div className="flex flex-col gap-space-sm">
{/*  Incident 1: Security Alert  */}
<div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-data-mono-sm text-data-mono-sm font-bold">SECURITY ALERT</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Multiple Failed POS Login Attempts</span>
</div>
<span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">2 mins ago</span>
</div>
<div className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">
                IP: <span className="text-on-surface font-semibold">192.168.1.105</span> (Store #04 Makati POS-02) • Blocked via fail2ban (Threshold 5 att)
              </div>
<div className="flex items-center gap-space-xs mt-space-xs">
<button onClick={() => { window.open('https://ipinfo.io/192.168.1.105', '_blank'); }} className="px-space-sm py-1 bg-surface-container-lowest text-on-surface text-data-mono-sm font-data-mono-sm font-medium rounded hover:bg-surface-container-high transition-colors" type="button">Inspect IP</button>
<button onClick={() => {
  setConfirmDialog({
    isOpen: true,
    title: 'Reset Credentials',
    message: 'Reset POS-02 Makati credentials? This will log out all active sessions.',
    onConfirm: async () => {
      await fetch('/api/clients', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({action:'reset_credentials', node:'POS-02-MKT'}) });
      addNotification('Till credentials reset for POS-02 Makati');
      setConfirmDialog(null);
    }
  });
}} className="px-space-sm py-1 bg-primary text-on-primary text-data-mono-sm font-data-mono-sm font-medium rounded hover:bg-primary-container transition-colors" type="button">Reset Till Credential</button>
</div>
</div>
{/*  Incident 2: Latency Warning  */}
<div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">LATENCY WARN</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Edge Sync High Latency Spikes</span>
</div>
<span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">8 mins ago</span>
</div>
<div className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">
                POS-Cebu-01 response time spiked to <span className="text-secondary font-bold">340ms</span> (&gt;300ms SLA) • Auto-rerouted to secondary gateway
              </div>
<div className="flex items-center gap-space-xs mt-space-xs">
<button onClick={() => { setActiveTab('endpoint_latency'); addNotification('Opened Endpoint Latency trace for CEB-01'); }} className="px-space-sm py-1 bg-surface-container-lowest text-on-surface text-data-mono-sm font-data-mono-sm font-medium rounded hover:bg-surface-container-high transition-colors" type="button">View Trace (Distributed APM)</button>
</div>
</div>
{/*  Incident 3: System Notice  */}
<div className="p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-xs">
<span className="px-1.5 py-0.5 rounded bg-tertiary-fixed/40 text-on-tertiary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">SYS NOTICE</span>
<span className="font-body-sm text-body-sm font-semibold text-on-surface">Scheduled Automated DB Snapshot Completed</span>
</div>
<span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">14 mins ago</span>
</div>
<div className="font-data-mono-sm text-data-mono-sm text-on-surface-variant flex items-center justify-between">
<span>AWS RDS snapshot <span className="text-primary">#snap-20261014-04</span></span>
<span className="text-tertiary font-bold">Verified Hash OK</span>
</div>
</div>
</div>
</div>
<div className="mt-space-md pt-space-xs flex items-center justify-between">
<span className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">Retention: 90 Days • Syslog RFC-5424</span>
<button onClick={() => setActiveTab('rbac')} className="font-body-sm text-body-sm text-primary font-semibold hover:underline flex items-center gap-1" type="button">
<span>Open Full Audit Vault</span>
<span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</button>
</div>
</div>
{/*  RIGHT PANEL: Critical POS / RMS Node Endpoints Status (6 Cols)  */}
<div className="xl:col-span-6 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-space-md">
<div>
<div className="flex items-center gap-space-xs">
<span className="material-symbols-outlined text-primary text-[20px]">router</span>
<span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Critical POS &amp; RMS Node Endpoints</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">Direct microservice gateway ping and availability ledger</p>
</div>
<button onClick={() => { setActiveTab('api'); addNotification('Opened API endpoint configuration filter'); }} className="p-space-xs rounded bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors" type="button">
<span className="material-symbols-outlined text-[18px]">tune</span>
</button>
</div>
{/*  Table Container  */}
<div className="overflow-x-auto">
<table className="w-full text-left font-body-sm text-body-sm">
<thead>
<tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps uppercase">
<th className="py-2 px-space-sm rounded-l">Endpoint Route</th>
<th className="py-2 px-space-sm">Node / Service</th>
<th className="py-2 px-space-xs text-center">Method</th>
<th className="py-2 px-space-sm text-right">Latency</th>
<th className="py-2 px-space-sm text-right">Err Rate</th>
<th className="py-2 px-space-sm rounded-r text-center">Status</th>
</tr>
</thead>
<tbody className="divide-y divide-surface-container">
<tr className="hover:bg-surface-container-low/50 transition-colors">
<td className="py-2.5 px-space-sm font-data-mono-sm text-data-mono-sm font-semibold text-primary truncate max-w-[160px]">
                    /api/v2/pos/auth/verify
                  </td>
<td className="py-2.5 px-space-sm text-on-surface">Edge Gateway</td>
<td className="py-2.5 px-space-xs text-center">
<span className="px-1 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-data-mono-sm text-data-mono-sm">POST</span>
</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm font-medium">14ms</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm text-tertiary">0.00%</td>
<td className="py-2.5 px-space-sm text-center">
<span className="px-1.5 py-0.5 rounded bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</td>
</tr>
<tr className="hover:bg-surface-container-low/50 transition-colors">
<td className="py-2.5 px-space-sm font-data-mono-sm text-data-mono-sm font-semibold text-primary truncate max-w-[160px]">
                    /api/v2/rms/hardware/sync
                  </td>
<td className="py-2.5 px-space-sm text-on-surface">Inventory Cluster</td>
<td className="py-2.5 px-space-xs text-center">
<span className="px-1 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-data-mono-sm text-data-mono-sm">POST</span>
</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm font-medium">22ms</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm text-tertiary">0.01%</td>
<td className="py-2.5 px-space-sm text-center">
<span className="px-1.5 py-0.5 rounded bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</td>
</tr>
<tr className="hover:bg-surface-container-low/50 transition-colors">
<td className="py-2.5 px-space-sm font-data-mono-sm text-data-mono-sm font-semibold text-primary truncate max-w-[160px]">
                    /api/v2/pos/transactions/push
                  </td>
<td className="py-2.5 px-space-sm text-on-surface">Realtime Socket</td>
<td className="py-2.5 px-space-xs text-center">
<span className="px-1 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed-variant font-data-mono-sm text-data-mono-sm">WSS</span>
</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm font-medium text-tertiary">9ms</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm text-tertiary">0.00%</td>
<td className="py-2.5 px-space-sm text-center">
<span className="px-1.5 py-0.5 rounded bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</td>
</tr>
<tr className="hover:bg-surface-container-low/50 transition-colors">
<td className="py-2.5 px-space-sm font-data-mono-sm text-data-mono-sm font-semibold text-primary truncate max-w-[160px]">
                    /api/v2/pos/till/cash-drawer
                  </td>
<td className="py-2.5 px-space-sm text-on-surface">Hardware Daemon</td>
<td className="py-2.5 px-space-xs text-center">
<span className="px-1 py-0.5 rounded bg-surface-container-high text-on-surface font-data-mono-sm text-data-mono-sm">GET</span>
</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm font-medium">12ms</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm text-tertiary">0.00%</td>
<td className="py-2.5 px-space-sm text-center">
<span className="px-1.5 py-0.5 rounded bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</td>
</tr>
<tr className="hover:bg-surface-container-low/50 transition-colors">
<td className="py-2.5 px-space-sm font-data-mono-sm text-data-mono-sm font-semibold text-primary truncate max-w-[160px]">
                    /api/v2/telemetry/heartbeat
                  </td>
<td className="py-2.5 px-space-sm text-on-surface">Monitoring Broker</td>
<td className="py-2.5 px-space-xs text-center">
<span className="px-1 py-0.5 rounded bg-surface-container-high text-on-surface font-data-mono-sm text-data-mono-sm">GET</span>
</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm font-medium text-tertiary">6ms</td>
<td className="py-2.5 px-space-sm text-right font-data-mono-sm text-data-mono-sm text-tertiary">0.00%</td>
<td className="py-2.5 px-space-sm text-center">
<span className="px-1.5 py-0.5 rounded bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-data-mono-sm text-data-mono-sm font-bold">ONLINE</span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
<div className="mt-space-md pt-space-xs flex items-center justify-between">
<div className="flex items-center gap-space-xs text-data-mono-sm font-data-mono-sm text-on-surface-variant">
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
<span>All 24 Microservices Validated</span>
</div>
<button onClick={() => { setActiveTab('endpoint_latency'); addNotification('Running live ping test across all nodes...'); }} className="font-body-sm text-body-sm text-primary font-semibold hover:underline flex items-center gap-1" type="button">
<span>Test Ping Latencies</span>
<span className="material-symbols-outlined text-[16px]">sensors</span>
</button>
</div>
</div>
</div>
</div>
</>
          )}
          
          {/* MAP TAB */}
          
          {/* MAP TAB */}
          {activeTab === 'map' && (
            <div className="animate-fade-in p-space-md">
              <header className="flex justify-between items-center mb-space-lg">
                <div>
                  <h1 className="text-headline-lg font-bold mb-space-xs">Live Topology Map</h1>
                  <p className="text-body-md text-on-surface-variant">Real-time geographical distribution of POS nodes.</p>
                </div>
              </header>
              <div className="bg-surface-container-lowest rounded-xl p-space-xs shadow-sm" style={{ height: '600px' }}>
                <div id="map" style={{ width: '100%', height: '100%', borderRadius: '12px', zIndex: 1 }}></div>
              </div>
            </div>
          )}

          {/* BROADCAST TAB */}
          {activeTab === 'broadcast' && (
            <div className="animate-fade-in p-space-md">
              <header className="flex justify-between items-center mb-space-lg">
                <div>
                  <h1 className="text-headline-lg font-bold mb-space-xs">Broadcast & Dispatch</h1>
                  <p className="text-body-md text-on-surface-variant">Send instant push notifications and maintenance alerts.</p>
                </div>
              </header>
              
              <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm max-w-3xl">
                <form onSubmit={handleUpdateBroadcast} className="flex flex-col gap-space-md">
                  <div className="flex items-center gap-space-sm">
                    <input 
                      type="checkbox" 
                      id="broadcastActive"
                      checked={isBroadcastActive}
                      onChange={(e) => setIsBroadcastActive(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="broadcastActive" className="text-body-md font-medium">Enable Global Broadcast Banner</label>
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label className="text-label-caps text-on-surface-variant font-bold">Message Type (Color)</label>
                    <select 
                      className="p-space-sm border border-outline-variant rounded-md bg-surface" 
                      value={broadcastType} 
                      onChange={(e) => setBroadcastType(e.target.value)}
                      disabled={!isBroadcastActive}
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="warning">Warning (Yellow)</option>
                      <option value="danger">Critical Maintenance (Red)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label className="text-label-caps text-on-surface-variant font-bold">Broadcast Message Content</label>
                    <textarea 
                      className="p-space-sm border border-outline-variant rounded-md bg-surface resize-y" 
                      rows={4} 
                      placeholder="e.g. Scheduled Server Maintenance will occur in 30 minutes. Please save all offline transactions."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      disabled={!isBroadcastActive}
                    ></textarea>
                  </div>

                  <button type="submit" className="btn bg-primary text-on-primary font-medium py-space-sm rounded-lg hover:bg-primary-container transition-colors mt-space-sm">
                    Deploy Broadcast Update
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* LICENSES TAB */}
          {activeTab === 'licenses' && (
            <div className="animate-fade-in p-space-md">
              <header className="flex justify-between items-center mb-space-lg">
                <div>
                  <h1 className="text-headline-lg font-bold mb-space-xs">License Keys & Subscriptions</h1>
                  <p className="text-body-md text-on-surface-variant">Manage subscription keys and assignments.</p>
                </div>
                <div className="flex gap-space-md items-center">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search by name, branch, or key..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary w-72"
                    />
                  </div>
                  <button className="flex items-center gap-space-xs btn bg-primary text-on-primary px-space-md py-2 rounded-lg hover:bg-primary-container transition-colors" onClick={() => setShowModal(true)}>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Generate New Key
                  </button>
                </div>
              </header>
              
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-label-caps text-on-surface-variant">
                      <th className="p-space-md">License Key</th>
                      <th className="p-space-md">Assigned System / Branch</th>
                      <th className="p-space-md">System Type</th>
                      <th className="p-space-md">Device Limit</th>
                      <th className="p-space-md">Status</th>
                      <th className="p-space-md">Expiration</th>
                      <th className="p-space-md">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredClients = clients
                        .filter(client => client.status !== 'unlicensed')
                        .filter(client => 
                          !searchQuery || 
                          client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (client.key && client.key.toLowerCase().includes(searchQuery.toLowerCase()))
                        );

                      if (filteredClients.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="text-center p-space-xl text-on-surface-variant">
                              {searchQuery ? 'No licenses matched your search.' : 'No licenses generated yet.'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredClients.map(client => (
                        <tr key={client.id} className="border-t border-surface-container hover:bg-surface-container-low/50">
                                                    <td className="p-space-md font-data-mono-sm text-primary font-bold flex items-center gap-2">
                            {unmaskedKeys[client.id] ? client.key : (client.maskedKey || client.key)}
                            <button onClick={() => setUnmaskedKeys(prev => ({...prev, [client.id]: !prev[client.id]}))} className="text-on-surface-variant hover:text-primary mt-1">
                              <span className="material-symbols-outlined text-[16px]">{unmaskedKeys[client.id] ? 'visibility_off' : 'visibility'}</span>
                            </button>
                          </td>
                          <td className="p-space-md font-body-sm text-on-surface">
                            <div className="font-semibold">{client.name}</div>
                            <div className="text-on-surface-variant text-body-sm">{client.branch}</div>
                          </td>
                          <td className="p-space-md font-body-sm">
                            <span className="px-2 py-1 bg-surface-container-high rounded text-data-mono-sm">{client.systemType || 'POS'}</span>
                          </td>
                          <td className="p-space-md font-data-mono-sm text-on-surface-variant">
                            {(client.devices?.length || 0)} / {client.maxDevices}
                          </td>
                          <td className="p-space-md">
                            {client.status === 'active' && <span className="px-2 py-1 bg-tertiary-fixed/30 text-on-tertiary-fixed-variant rounded text-data-mono-sm font-bold">ACTIVE</span>}
                            {client.status === 'expired' && <span className="px-2 py-1 bg-error-container text-on-error-container rounded text-data-mono-sm font-bold">EXPIRED</span>}
                            {client.status === 'revoked' && <span className="px-2 py-1 bg-surface-variant text-on-surface-variant rounded text-data-mono-sm font-bold">REVOKED</span>}
                            {client.status === 'locked' && <span className="px-2 py-1 bg-warning text-warning-container rounded text-data-mono-sm font-bold">LOCKED</span>}
                          </td>
                          <td className="p-space-md font-data-mono-sm text-on-surface-variant">
                            {new Date(client.expires).toLocaleDateString()}
                          </td>
                          <td className="p-space-md">
                            <div className="flex gap-space-xs">
                              {client.status !== 'revoked' && (
                                <button className="text-on-surface-variant hover:text-primary transition-colors" title="Edit" onClick={() => {
                                  setNewClientId(client.id);
                                  setNewClientName(client.name);
                                  setNewClientBranch(client.branch);
                                  setNewClientMaxDevices(client.maxDevices);
                                  setNewClientSystemType(client.systemType || 'POS');
                                  setShowModal(true);
                                }}>
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                              )}
                              {(client.status === 'expired' || client.status === 'active' || client.status === 'locked')  && (
                                <button className="text-on-surface-variant hover:text-tertiary transition-colors" title="Renew License" onClick={() => handleClientAction(client.id, 'renew', 'Renew this license for another period?')}>
                                  <span className="material-symbols-outlined text-[18px]">autorenew</span>
                                </button>
                              )}
                              {client.status === 'active' && (
                                <button className="text-on-surface-variant hover:text-warning transition-colors" title="Lockdown / Suspend" onClick={() => handleClientAction(client.id, 'lockdown', 'Are you sure you want to lockdown this client? This will pause their access.')}>
                                  <span className="material-symbols-outlined text-[18px]">lock</span>
                                </button>
                              )}
                              {client.status === 'locked' && (
                                <button className="text-on-surface-variant hover:text-primary transition-colors" title="Unlock" onClick={() => handleClientAction(client.id, 'unlock', 'Remove lockdown and restore access?')}>
                                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                                </button>
                              )}
                              {(client.status === 'active' || client.status === 'locked') && (
                                <button className="text-on-surface-variant hover:text-error transition-colors" title="Revoke" onClick={() => handleClientAction(client.id, 'revoke', 'Are you sure you want to completely revoke this license? This will permanently disable the client access.')}>
                                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
{activeTab === 'clients' && (
          <div className="animate-fade-in">
            {selectedClient ? (
              <>
                <header className="flex justify-between items-center" style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="btn btn-secondary" onClick={() => setSelectedClient(null)} style={{ padding: '8px', borderRadius: '50%' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent) 0%, #1e3a8a 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                      {selectedClient.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>{selectedClient.name}</h1>
                      <p>Branch: {selectedClient.branch} | ID: {selectedClient.id}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {selectedClient.upgradeRequested && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef3c7', padding: '6px 12px', borderRadius: '20px', color: '#b45309', fontSize: '14px', fontWeight: 600 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            Upgrade Requested
                            <button 
                                onClick={async () => {
                                    await fetch('/api/clients/devices', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ licenseKey: selectedClient.key, action: 'clear_upgrade' })
                                    });
                                    // fetchClients();
                                    setSelectedClient({...selectedClient, upgradeRequested: false});
                                }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '4px', color: '#92400e', display: 'flex' }}
                                title="Clear Request"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    )}
                    <span className={`badge badge-${selectedClient.status}`} style={{ fontSize: '14px', padding: '6px 14px' }}>
                      {selectedClient.status}
                    </span>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => {
                        setAddTerminalsModal({ isOpen: true, amount: '' });
                      }}
                    >
                      + Add Terminal Add-on (Generate Invoice)
                    </button>
                  </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
                  <div className="glass-panel stat-card">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>CPU Load (Real-time)</span>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{selectedClient.metrics?.cpu || '0.0'}%</div>
                  </div>
                  <div className="glass-panel stat-card">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>RAM Used (Real-time)</span>
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>{selectedClient.metrics?.memory || '0.0'}%</div>
                  </div>
                  <div className="glass-panel stat-card">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>System Uptime</span>
                    <div className="stat-value" style={{ fontSize: '16px' }}>
                      {selectedClient.metrics?.uptime 
                        ? `${Math.floor(selectedClient.metrics.uptime / 3600)}h ${Math.floor((selectedClient.metrics.uptime % 3600) / 60)}m` 
                        : 'Unknown'}
                    </div>
                    {selectedClient.metrics?.lastSeen && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Last Ping: {new Date(selectedClient.metrics.lastSeen).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px' }}>Registered Devices</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        {selectedClient.devices?.length || 0} / {selectedClient.maxDevices} Devices Used
                      </span>
                    </div>
                  </div>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Device ID</th>
                        <th>Browser / App User Agent</th>
                        <th>Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClient.devices && selectedClient.devices.length > 0 ? (
                        selectedClient.devices.map((device, idx) => (
                          <tr key={idx}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{device.id}</td>
                            <td>{device.userAgent}</td>
                            <td>{new Date(device.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            No devices currently registered for this client.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="glass-panel">
                  <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>System Logs & Errors</h2>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Level</th>
                        <th>Message</th>
                        <th>Component</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                          No errors found. System is running perfectly.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <header className="flex justify-between items-center" style={{ marginBottom: '40px' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Client Database</h1>
                    <p>View all registered systems and organizations.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowAddClientOnlyModal(true)}>
                    + Add New Client
                  </button>
                </header>
                
                <div className="glass-panel">
                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="data-table" style={{ minWidth: '900px' }}>
                      <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Profile</th>
                        <th>Client Organization</th>
                        <th>Branch / Location</th>
                        <th>System ID</th>
                        <th>Last Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                            No clients registered.
                          </td>
                        </tr>
                      ) : (
                        clients.map((client) => (
                          <tr key={client.id}>
                            <td>
                              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                                {client.name.substring(0, 1).toUpperCase()}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {client.name}
                                {client.upgradeRequested && (
                                  <span title="Client has requested additional device licenses" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                  </span>
                                )}
                              </div>
                              {client.organization && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Org: {client.organization}</div>}
                              {client.company && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Company: {client.company}</div>}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                                {client.branch}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{client.id}</td>
                            <td>
                              {client.metrics?.lastSeen 
                                ? new Date(client.metrics.lastSeen).toLocaleTimeString() 
                                : 'Offline'}
                            </td>
                            <td>
                              <button className="btn btn-secondary" onClick={() => setSelectedClient(client)} style={{ padding: '6px 12px', fontSize: '12px' }}>Details</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* API MONITORING TAB */}
        
          {activeTab === 'api' && (
          <div className="animate-fade-in">
            <header className="flex justify-between items-center" style={{ marginBottom: '40px' }}>
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>API Health Monitoring</h1>
                <p>Real-time status of central authentication endpoints.</p>
              </div>
            </header>
            
            {monitoring ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                  <div className="glass-panel stat-card">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Uptime (30d)</span>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{monitoring.uptime}</div>
                  </div>
                  <div className="glass-panel stat-card">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Avg Response Time</span>
                    <div className="stat-value">{monitoring.avgResponseTime}ms</div>
                  </div>
                  <div className="glass-panel stat-card">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>Total Requests</span>
                    <div className="stat-value">{monitoring.totalRequests}</div>
                  </div>
                </div>

                <div className="glass-panel">
                  <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Endpoint Status</h2>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Endpoint</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitoring.endpoints.map((ep, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace' }}>{ep.path}</td>
                          <td><span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>{ep.method}</span></td>
                          <td>
                            <span style={{ color: ep.status === 'Online' ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                              â— {ep.status}
                            </span>
                          </td>
                          <td>{ep.latency}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Connecting to monitoring service...</div>
            )}
          </div>
        )}

        {/* SUPPORT TICKETS TAB */}
        
          {activeTab === 'tickets' && (
          <div className="animate-fade-in">
            <header className="flex justify-between items-center" style={{ marginBottom: '40px' }}>
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>IT Support Tickets</h1>
                <p>Manage and respond to support requests from POS terminals.</p>
              </div>
            </header>

            <div className="glass-panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Store / Branch</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No support tickets found.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t: any, idx: number) => {
                      const client = clients.find(c => c.key === t.licenseKey);
                      const storeDisplay = client ? `${client.name} (${client.branch})` : t.licenseKey?.substring(0,8) + '...';
                      return (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.id}</td>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>{storeDisplay}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.subject}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From: {t.senderName} ({t.senderRole})</div>
                        </td>
                        <td>
                          <span className="badge" style={{ 
                            background: t.status === 'RESOLVED' ? '#d1fae5' : t.status === 'IN_PROGRESS' ? '#fef3c7' : '#dbeafe',
                            color: t.status === 'RESOLVED' ? '#065f46' : t.status === 'IN_PROGRESS' ? '#b45309' : '#1e40af' 
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setReplyTicketModal({ isOpen: true, ticketId: t.id, licenseKey: t.licenseKey, defaultReply: t.reply || '' });
                            }}
                          >
                            Reply
                          </button>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BILLING & INVOICES TAB */}
        
          {activeTab === 'billing' && (
          <div className="animate-fade-in">
            <header className="flex justify-between items-center" style={{ marginBottom: '40px' }}>
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Billing & Invoices</h1>
                <p>Track client payments, prorated add-ons, and renewals.</p>
              </div>
            </header>

            <div className="glass-panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Client Name</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No invoices generated yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inv.id}</td>
                        <td style={{ fontWeight: 600 }}>{inv.clientName}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', background: '#e2e8f0', borderRadius: '4px', fontSize: '12px', marginRight: '8px', color: '#334155', fontWeight: 600 }}>{inv.type}</span>
                          {inv.details}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '16px' }}>₱{inv.amount.toLocaleString()}</td>
                        <td>{new Date(inv.date).toLocaleDateString()}</td>
                        <td>
                          <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      
          
  {activeTab === 'multi_store_nodes' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Multi-Store POS Nodes Live Monitoring</h2>
      <div className="grid grid-cols-3 gap-space-md mb-space-lg">
        <div className="p-space-md bg-surface-container-low rounded-lg border-l-4 border-primary">
          <div className="text-on-surface-variant text-label-caps font-bold">Active Syncs</div>
          <div className="text-headline-xl font-bold mt-2">142</div>
        </div>
        <div className="p-space-md bg-surface-container-low rounded-lg border-l-4 border-secondary">
          <div className="text-on-surface-variant text-label-caps font-bold">Transactions/Sec</div>
          <div className="text-headline-xl font-bold mt-2">38.4</div>
        </div>
        <div className="p-space-md bg-surface-container-low rounded-lg border-l-4 border-tertiary">
          <div className="text-on-surface-variant text-label-caps font-bold">Network Drops</div>
          <div className="text-headline-xl font-bold mt-2">0</div>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant text-label-caps">
              <th className="p-space-sm">Node ID</th>
              <th className="p-space-sm">Location</th>
              <th className="p-space-sm">Status</th>
              <th className="p-space-sm">Latency</th>
              <th className="p-space-sm">Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b border-surface-container">
                <td className="p-space-sm font-data-mono-sm">{c.id.substring(0,8)}</td>
                <td className="p-space-sm font-body-sm">{c.branch}</td>
                <td className="p-space-sm"><span className="px-2 py-1 bg-tertiary-fixed/30 text-on-tertiary-fixed-variant rounded text-data-mono-sm font-bold">ONLINE</span></td>
                <td className="p-space-sm font-data-mono-sm">12ms</td>
                <td className="p-space-sm font-data-mono-sm text-on-surface-variant">Just now</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {activeTab === 'hardware_sync' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Serialized Hardware Sync Registry</h2>
      <p className="text-on-surface-variant mb-space-lg">Real-time sync status of peripheral hardware (scanners, printers, cash drawers).</p>
      
      <div className="grid grid-cols-2 gap-space-lg">
        <div className="bg-surface-container-low p-space-md rounded-lg">
          <h3 className="font-headline-sm mb-space-sm">Peripherals Status</h3>
          <div className="flex flex-col gap-space-xs">
            <div className="flex justify-between items-center p-space-xs bg-surface-container-lowest rounded">
              <span className="font-body-sm text-on-surface">Barcode Scanners</span>
              <span className="font-data-mono-sm text-tertiary font-bold">142/142 Synced</span>
            </div>
            <div className="flex justify-between items-center p-space-xs bg-surface-container-lowest rounded">
              <span className="font-body-sm text-on-surface">Thermal Printers</span>
              <span className="font-data-mono-sm text-tertiary font-bold">140/142 Synced</span>
            </div>
            <div className="flex justify-between items-center p-space-xs bg-surface-container-lowest rounded">
              <span className="font-body-sm text-on-surface">Cash Drawers</span>
              <span className="font-data-mono-sm text-warning font-bold">138/142 Synced</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low p-space-md rounded-lg">
          <h3 className="font-headline-sm mb-space-sm">Recent Sync Logs</h3>
          <div className="font-data-mono-sm text-on-surface-variant space-y-2">
            <div>[08:14:02] PRINTER_EPSON_01 (Makati) Heartbeat OK</div>
            <div>[08:14:05] SCANNER_ZEBRA_04 (Cebu) Config Updated</div>
            <div>[08:14:12] DRAWER_APG_02 (QC) Sync Error - Retrying...</div>
            <div>[08:14:15] DRAWER_APG_02 (QC) Sync Success</div>
          </div>
        </div>
      </div>
    </div>
  )}

  {activeTab === 'hardware_bench' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">RMA & Hardware Bench</h2>
      <div className="flex gap-space-md mb-space-lg">
        <button onClick={() => { const serial = prompt('Enter hardware serial number:'); if(serial) { addNotification('RMA logged for device: ' + serial); } }} className="btn bg-primary text-on-primary px-space-md py-space-sm rounded-lg font-body-sm">Log New RMA</button>
        <button onClick={() => addNotification('Dispatch queue: 0 items pending')} className="btn bg-surface-container-high text-on-surface px-space-md py-space-sm rounded-lg font-body-sm">View Dispatch Queue</button>
      </div>
      <div className="bg-surface-container-low p-space-md rounded-lg border border-surface-container">
        <div className="text-center p-space-xl text-on-surface-variant">
          <span className="material-symbols-outlined text-[48px] mb-space-sm opacity-50">build</span>
          <p>No active RMA requests in the last 24 hours.</p>
        </div>
      </div>
    </div>
  )}

  {activeTab === 'firmware' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Firmware & Config Distribution</h2>
      <div className="flex justify-between items-center bg-surface-container-low p-space-md rounded-lg mb-space-md">
        <div>
          <h4 className="font-headline-sm">Global POS Client v4.18.2</h4>
          <p className="text-body-sm text-on-surface-variant">Pushed to 142/142 nodes</p>
        </div>
        <span className="px-space-sm py-space-xs bg-tertiary-fixed text-on-tertiary-fixed font-data-mono-sm rounded font-bold">100% COMPLIANT</span>
      </div>
      <div className="flex justify-between items-center bg-surface-container-low p-space-md rounded-lg">
        <div>
          <h4 className="font-headline-sm">Epson Printer Drivers v1.4</h4>
          <p className="text-body-sm text-on-surface-variant">Pending deployment to Provincial hubs</p>
        </div>
        <button onClick={() => {
          setConfirmDialog({
            isOpen: true,
            title: 'Deploy Firmware',
            message: 'Deploy Epson Printer Drivers v1.4 to all Provincial hubs?',
            onConfirm: () => {
              addNotification('Firmware deployment initiated: Epson Printer Drivers v1.4 → Provincial hubs');
              setConfirmDialog(null);
            }
          });
        }} className="bg-primary text-on-primary px-space-md py-space-xs rounded font-body-sm">Deploy Now</button>
      </div>
    </div>
  )}

  {activeTab === 'endpoint_latency' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Endpoint Latency Heatmap</h2>
      <p className="text-body-sm text-on-surface-variant mb-space-lg">Real-time pings across multi-region mesh.</p>
      
      <div className="grid grid-cols-4 gap-space-sm">
        {['MNL-01', 'MNL-02', 'MKT-01', 'MKT-02', 'QC-01', 'CEB-01', 'DAV-01', 'ILO-01'].map((node, i) => (
          <div key={node} className="p-space-sm bg-surface-container-low rounded flex justify-between items-center">
            <span className="font-data-mono-sm font-bold">{node}</span>
            <span className={`font-data-mono-sm ${i === 5 ? 'text-error' : 'text-tertiary'}`}>{i === 5 ? '340ms' : (10 + i * 2) + 'ms'}</span>
          </div>
        ))}
      </div>
    </div>
  )}

  {activeTab === 'edge_sync' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Edge Sync Queues</h2>
      <div className="flex gap-space-lg">
        <div className="flex-1 p-space-md bg-surface-container-low rounded-lg">
          <h4 className="font-headline-sm mb-space-sm">Inbound Transactions</h4>
          <div className="text-headline-xl font-bold text-primary">0</div>
          <p className="text-body-sm text-on-surface-variant">Backlog messages</p>
        </div>
        <div className="flex-1 p-space-md bg-surface-container-low rounded-lg">
          <h4 className="font-headline-sm mb-space-sm">Dead Letter Queue</h4>
          <div className="text-headline-xl font-bold text-on-surface-variant">0</div>
          <p className="text-body-sm text-on-surface-variant">Failed syncs</p>
        </div>
      </div>
    </div>
  )}

  {activeTab === 'db_health' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Database & Cluster Health</h2>
      <div className="space-y-space-sm">
        <div className="p-space-md bg-surface-container-low rounded flex justify-between">
          <span className="font-body-sm font-bold">AWS RDS Primary (ap-southeast-1)</span>
          <span className="text-tertiary font-data-mono-sm">HEALTHY - 32% CPU</span>
        </div>
        <div className="p-space-md bg-surface-container-low rounded flex justify-between">
          <span className="font-body-sm font-bold">AWS RDS Replica (ap-southeast-1b)</span>
          <span className="text-tertiary font-data-mono-sm">SYNCING - 4ms lag</span>
        </div>
        <div className="p-space-md bg-surface-container-low rounded flex justify-between">
          <span className="font-body-sm font-bold">Redis ElastiCache Mesh</span>
          <span className="text-tertiary font-data-mono-sm">HEALTHY - 14% RAM</span>
        </div>
      </div>
    </div>
  )}

  {activeTab === 'incident_logs' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Incident Logs & Alerts</h2>
      <div className="p-space-md bg-error-container text-on-error-container rounded-lg mb-space-sm flex justify-between items-center">
        <div>
          <div className="font-data-mono-sm font-bold">SECURITY ALERT</div>
          <div className="font-body-sm">Multiple Failed POS Login Attempts - 192.168.1.105</div>
        </div>
        <button onClick={() => { addNotification('Opened investigation: Multiple Failed POS Login Attempts at 192.168.1.105'); setActiveTab('incident_logs'); }} className="bg-surface text-on-surface px-3 py-1 rounded font-body-sm text-sm">Investigate</button>
      </div>
      <div className="p-space-md bg-secondary-container text-on-secondary-container rounded-lg mb-space-sm flex justify-between items-center">
        <div>
          <div className="font-data-mono-sm font-bold">LATENCY WARN</div>
          <div className="font-body-sm">Edge Sync High Latency Spikes (CEB-01)</div>
        </div>
        <button onClick={() => { setActiveTab('endpoint_latency'); addNotification('Viewing latency trace for CEB-01'); }} className="bg-surface text-on-surface px-3 py-1 rounded font-body-sm text-sm">View Trace</button>
      </div>
    </div>
  )}

  {activeTab === 'rbac' && (
    <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
      <h2 className="font-headline-lg mb-space-md">Access Audits & RBAC</h2>
      <p className="text-body-sm text-on-surface-variant mb-space-lg">Monitor administrative actions and role delegations.</p>
      <div className="overflow-hidden rounded-lg border border-surface-container">
        <table className="w-full text-left">
          <thead className="bg-surface-container-low">
            <tr>
              <th className="p-space-sm text-label-caps text-on-surface-variant">User</th>
              <th className="p-space-sm text-label-caps text-on-surface-variant">Action</th>
              <th className="p-space-sm text-label-caps text-on-surface-variant">Timestamp</th>
            </tr>
          </thead>
          <tbody className="font-body-sm">
            <tr className="border-b border-surface-container">
              <td className="p-space-sm">AJ Developer (Superadmin)</td>
              <td className="p-space-sm font-data-mono-sm text-primary">UPDATE_GLOBAL_BROADCAST</td>
              <td className="p-space-sm text-on-surface-variant">10 mins ago</td>
            </tr>
            <tr className="border-b border-surface-container">
              <td className="p-space-sm">System Autoscaler</td>
              <td className="p-space-sm font-data-mono-sm text-secondary">SCALE_UP_REDIS_NODES</td>
              <td className="p-space-sm text-on-surface-variant">1 hour ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )}


        {/* LICENSE KEY GENERATOR MODAL */}
        {(showModal || showAddClientOnlyModal) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => { setShowModal(false); setShowAddClientOnlyModal(false); }}>
            <div className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <header className="px-6 py-4 border-b border-surface-container flex justify-between items-center sticky top-0 bg-surface-container-lowest/90 backdrop-blur z-10">
                <h2 className="text-headline-sm font-bold text-on-surface">
                  {newClientId ? 'Edit Client & License' : 'Generate New Store License'}
                </h2>
                <button onClick={() => { setShowModal(false); setShowAddClientOnlyModal(false); }} className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </header>
              <form onSubmit={handleAddClient} className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Info */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Store/Branch Name *</label>
                    <input required type="text" value={newClientBranch} onChange={e => setNewClientBranch(e.target.value)} placeholder="e.g. Makati Branch" className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Client Name (Internal) *</label>
                    <input required type="text" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="e.g. Aztech Corp" className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Organization / Company</label>
                    <input type="text" value={newClientOrg} onChange={e => setNewClientOrg(e.target.value)} placeholder="Legal Entity Name" className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Contact / Phone Number</label>
                    <input type="text" value={newClientContact} onChange={e => setNewClientContact(e.target.value)} placeholder="+63 900 000 0000" className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                  </div>

                  {/* System & Limits */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Target Software *</label>
                    <select value={newClientSystemType} onChange={e => setNewClientSystemType(e.target.value)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md">
                      <option value="POS">Point of Sale (POS) System</option>
                      <option value="RMS">Retail Management System (RMS)</option>
                      <option value="POS+RMS">Full Suite (POS + RMS)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Max Device Limit (Terminals) *</label>
                    <input required type="number" min="1" max="100" value={newClientMaxDevices} onChange={e => setNewClientMaxDevices(parseInt(e.target.value) || 1)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                    <p className="text-body-sm text-on-surface-variant">Number of PCs allowed to connect.</p>
                  </div>

                  {/* Subscription Settings */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label-md font-medium text-on-surface">Subscription Length *</label>
                    <select value={newClientExpiry} onChange={e => setNewClientExpiry(e.target.value)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md">
                      <option value="30">30 Days (1 Month)</option>
                      <option value="90">90 Days (3 Months)</option>
                      <option value="180">180 Days (6 Months)</option>
                      <option value="365">365 Days (1 Year)</option>
                      <option value="custom">Custom (Specify Days)</option>
                    </select>
                  </div>
                  {newClientExpiry === 'custom' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-label-md font-medium text-on-surface">Custom Days *</label>
                      <input required type="number" min="1" value={newClientCustomExpiry} onChange={e => setNewClientCustomExpiry(e.target.value)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                    </div>
                  )}

                  {/* Geolocation */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-label-md font-medium text-on-surface flex items-center justify-between">
                      <span>Store Geolocation (Live Map Pin)</span>
                      <button type="button" onClick={() => { setNewClientLat('14.5547'); setNewClientLng('121.0244'); addNotification('Simulated map pin selection at Makati City'); }} className="text-primary hover:underline text-body-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span> Pick from Map
                      </button>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" step="any" placeholder="Latitude (e.g. 14.5547)" value={newClientLat} onChange={e => setNewClientLat(e.target.value)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                      <input type="number" step="any" placeholder="Longitude (e.g. 121.0244)" value={newClientLng} onChange={e => setNewClientLng(e.target.value)} className="px-4 py-2 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-primary-container text-on-primary-container rounded-lg flex gap-3 items-start">
                  <span className="material-symbols-outlined text-primary mt-1">shield_lock</span>
                  <div>
                    <h4 className="font-bold text-body-md">Security Token Generation</h4>
                    <p className="text-body-sm opacity-90 mt-1">This will generate a cryptographically secure JWT offline token. The store can validate this token locally via SQLite even during internet outages, ensuring continuous checkout operations.</p>
                  </div>
                </div>

                <footer className="mt-2 flex justify-end gap-3 border-t border-surface-container pt-6">
                  <button type="button" onClick={() => { setShowModal(false); setShowAddClientOnlyModal(false); }} className="px-6 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors font-medium">
                    {newClientId ? 'Update Client' : 'Generate Secure Key & Add Client'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* SUPPORT TICKET REPLY MODAL */}
        {replyTicketModal?.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setReplyTicketModal(null)}>
            <div className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <header className="px-6 py-4 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
                <h2 className="text-headline-sm font-bold">Reply to Ticket #{replyTicketModal.ticketId}</h2>
                <button onClick={() => setReplyTicketModal(null)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </header>
              <form onSubmit={async (e) => {
                e.preventDefault();
                await fetch('/api/clients/tickets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: replyTicketModal.ticketId, reply: replyTicketModal.defaultReply, status: 'RESOLVED' }) });
                addNotification('Reply sent and ticket resolved.');
                setReplyTicketModal(null);
                loadTickets();
              }} className="p-6 flex flex-col gap-4">
                <p className="text-body-sm text-on-surface-variant">The response will be pushed directly to the POS terminal interface of the client.</p>
                <textarea required rows={5} value={replyTicketModal.defaultReply} onChange={e => setReplyTicketModal({...replyTicketModal, defaultReply: e.target.value})} placeholder="Type your IT response/instructions here..." className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"></textarea>
                <footer className="flex justify-end gap-3 mt-2">
                  <button type="button" onClick={() => setReplyTicketModal(null)} className="px-4 py-2 rounded border border-outline-variant font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-primary text-on-primary font-medium">Send Reply</button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DIALOG MODAL */}
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setConfirmDialog(null)}>
            <div className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <header className="px-6 py-4 border-b border-surface-container flex justify-between items-center bg-surface-container-low">
                <h2 className="text-headline-sm font-bold text-error">{confirmDialog.title}</h2>
                <button onClick={() => setConfirmDialog(null)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
              </header>
              <div className="p-6 flex flex-col gap-4">
                <p className="text-body-md text-on-surface">{confirmDialog.message}</p>
                <footer className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setConfirmDialog(null)} className="px-4 py-2 rounded-lg border border-outline-variant font-medium hover:bg-surface-container transition-colors">Cancel</button>
                  <button type="button" onClick={confirmDialog.onConfirm} className="px-4 py-2 rounded-lg bg-error text-on-error font-medium hover:bg-error/90 transition-colors">Confirm</button>
                </footer>
              </div>
            </div>
          </div>
        )}

          </div>
        </main>
      </div>
    </div>
  );
}

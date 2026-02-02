"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import InternalLayout from "@/components/InternalLayout";
import { useState, useEffect } from "react";
import { Database, Zap, Server, HardDrive, Activity, FileText, ShoppingBag, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { SystemHealthCards } from "@/components/dashboard/SystemHealthCards";
import { fetchWithAuth } from "@/lib/api";

export default function SystemPage() {
    const [activeTab, setActiveTab] = useState("overview");

    const tabs = [
        { id: "overview", label: "Overview", icon: Activity },
        { id: "processing", label: "Processing", icon: Activity },
        { id: "database", label: "Database", icon: Database },
        { id: "redis", label: "Redis Cache", icon: Zap },
        { id: "workers", label: "Workers", icon: Server },
        { id: "errors", label: "Errors", icon: AlertTriangle }, // Added Errors tab
        { id: "performance", label: "Performance", icon: Zap },
        { id: "backups", label: "Backups", icon: HardDrive },
    ];

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div>
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            System Health & Monitoring
                        </h1>
                        <p className="text-slate-600">
                            Monitor system health, performance, and infrastructure status
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }
                    `}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "overview" && <OverviewTab />}
                    {activeTab === "processing" && <ProcessingTab />}
                    {activeTab === "database" && <DatabaseTab />}
                    {activeTab === "redis" && <RedisTab />}
                    {activeTab === "workers" && <WorkersTab />}
                    {activeTab === "errors" && <ErrorsTab />}
                    {activeTab === "performance" && <PerformanceTab />}
                    {activeTab === "backups" && <BackupsTab />}
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

// ... imports ...
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';


// ... existing code ...

function ErrorsTab() {
    const [errors, setErrors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchErrors = async () => {
            try {
                const data = await fetchWithAuth('/api/internal/health/errors?limit=20');
                setErrors(data);
            } catch (error) {
                console.error('Failed to fetch errors:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchErrors();
    }, []);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading error logs...</div>;

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="text-red-500" />
                    Recent System Errors
                </h2>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Time</th>
                        <th className="p-4">Level</th>
                        <th className="p-4">Source</th>
                        <th className="p-4">Message</th>
                        <th className="p-4">Context</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {errors.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No recent errors recorded.</td></tr>
                    ) : (
                        errors.map((err) => (
                            <tr key={err.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-500 whitespace-nowrap">
                                    {new Date(err.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${err.level === 'ERROR' ? 'bg-red-100 text-red-700' :
                                        err.level === 'WARN' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {err.level}
                                    </span>
                                </td>
                                <td className="p-4 font-medium text-slate-700">{err.source}</td>
                                <td className="p-4 text-slate-800 break-all max-w-md">{err.message}</td>
                                <td className="p-4 text-xs font-mono text-slate-500">
                                    {err.endpoint && <div className='bg-slate-100 px-1 rounded inline-block mb-1'>{err.method} {err.endpoint}</div>}
                                    {err.metadata?.queue && <div>Queue: {err.metadata.queue}</div>}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function PerformanceTab() {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sourceFilter, setSourceFilter] = useState<'ALL' | 'INTERNAL' | 'API' | 'MOBILE'>('ALL');

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await fetchWithAuth(`/api/internal/health/performance?period=24h&source=${sourceFilter}`);
                setMetrics(data);
            } catch (error) {
                console.error('Failed to fetch performance:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetrics();
    }, [sourceFilter]);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading performance metrics...</div>;

    return (
        <div className="space-y-6">
            {/* Source Filter Toggle */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
                <label className="text-sm font-medium text-slate-700">Source:</label>
                <div className="flex gap-2">
                    {(['ALL', 'INTERNAL', 'API', 'MOBILE'] as const).map((source) => (
                        <button
                            key={source}
                            onClick={() => setSourceFilter(source)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceFilter === source
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            {source === 'ALL' ? 'All' : source.charAt(0) + source.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Zap className="text-amber-500" />
                    Slowest Endpoints (Avg Duration)
                </h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.filter(m => m.type === 'API_REQUEST').slice(0, 10)} layout="vertical" margin={{ left: 150 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" unit="ms" />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="avg_duration" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Avg Duration (ms)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(['API_REQUEST', 'WORKER_JOB'] as const).map(type => (
                    <div key={type} className="bg-white rounded-xl p-6 border border-slate-200">
                        <h3 className="font-semibold mb-4 text-slate-700">{type === 'API_REQUEST' ? 'API Latency' : 'Worker Job Latency'}</h3>
                        <div className="space-y-2">
                            {metrics.filter(m => m.type === type).slice(0, 5).map(m => (
                                <div key={m.name} className="flex justify-between items-center text-sm">
                                    <span className="truncate flex-1 pr-4" title={m.name}>{m.name}</span>
                                    <span className={`font-mono font-medium ${m.avg_duration > 1000 ? 'text-red-600' : 'text-slate-600'}`}>
                                        {m.avg_duration}ms
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WorkersTab() {
    const [stats, setStats] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await fetchWithAuth('/api/internal/health/workers');
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch worker stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading worker stats...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((queue) => (
                    <div key={queue.queue} className="bg-white rounded-xl p-6 border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg capitalize">{queue.queue}</h3>
                                <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${queue.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {queue.status}
                                </div>
                            </div>
                            <Server className="text-slate-400 w-5 h-5" />
                        </div>

                        <div className="space-y-3 text-sm">
                            <MetricRow label="Jobs (24h)" value={queue.count.toString()} />
                            <MetricRow label="Avg Duration" value={`${queue.avg_ms}ms`} />
                            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                                <span>Min: {queue.min_ms}ms</span>
                                <span>Max: {queue.max_ms}ms</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


function BackupsTab() {
    return (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Database Backups</h2>
            <div className="space-y-4">
                <MetricRow label="Last Backup" value="2 hours ago" status="success" />
                <MetricRow label="Next Scheduled" value="In 22 hours" />
                <MetricRow label="Backup Size" value="2.1 GB" />
                <MetricRow label="Retention" value="30 days" />
                <MetricRow label="Status" value="Automated" status="success" />
            </div>
        </div>
    );
}

function ProcessingTab() {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await fetchWithAuth('/api/internal/health/processing');
                if (data.success) {
                    setStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch processing stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        // Refresh every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading processing stats...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoices Card */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Faturas (Invoices)</h2>
                            <p className="text-sm text-slate-500">Importação e Processamento</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <MetricRow label="Total Processado" value={stats?.invoices?.total.toString()} />
                        <MetricRow
                            label="Sucesso (Importadas)"
                            value={stats?.invoices?.imported.toString()}
                            status="success"
                        />
                        <MetricRow
                            label="Taxa de Sucesso"
                            value={`${stats?.invoices?.success_rate}%`}
                            status={stats?.invoices?.success_rate > 90 ? 'success' : 'warning'}
                        />
                        <MetricRow label="Pendente / Em Revisão" value={stats?.invoices?.pending.toString()} />
                        <MetricRow
                            label="Rejeitadas"
                            value={stats?.invoices?.rejected.toString()}
                            status={stats?.invoices?.rejected > 0 ? 'warning' : undefined}
                        />
                        <MetricRow
                            label="Erros (OCR/AI)"
                            value={stats?.invoices?.error.toString()}
                            status={stats?.invoices?.error > 0 ? 'error' : 'success'}
                        />
                    </div>
                </div>

                {/* Sales Card */}
                <div className="bg-white rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Vendas (Sales)</h2>
                            <p className="text-sm text-slate-500">Importação e Ficheiros</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <MetricRow label="Total Processado" value={stats?.sales?.total.toString()} />
                        <MetricRow
                            label="Sucesso (Importadas)"
                            value={stats?.sales?.imported.toString()}
                            status="success"
                        />
                        <MetricRow
                            label="Taxa de Sucesso"
                            value={`${stats?.sales?.success_rate}%`}
                            status={stats?.sales?.success_rate > 90 ? 'success' : 'warning'}
                        />
                        <MetricRow label="Pendente / Em Revisão" value={stats?.sales?.pending.toString()} />
                        <MetricRow
                            label="Rejeitadas"
                            value={stats?.sales?.rejected.toString()}
                            status={stats?.sales?.rejected > 0 ? 'warning' : undefined}
                        />
                        <MetricRow
                            label="Erros"
                            value={stats?.sales?.error.toString()}
                            status={stats?.sales?.error > 0 ? 'error' : 'success'}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
                <p>ℹ️ <strong>Nota:</strong> Estas estatísticas refletem o estado atual da base de dados. Erros de AI ou OCR aparecem como "Erros". Documentos aguardando validação manual aparecem como "Pendente".</p>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, color }: {
    title: string;
    value: string;
    subtitle: string;
    color: 'green' | 'blue' | 'purple';
}) {
    const colors = {
        green: 'bg-green-50 text-green-700',
        blue: 'bg-blue-50 text-blue-700',
        purple: 'bg-purple-50 text-purple-700',
    };

    return (
        <div className={`rounded-xl p-6 ${colors[color]}`}>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="font-medium mb-1">{title}</div>
            <div className="text-sm opacity-75">{subtitle}</div>
        </div>
    );
}

function MetricRow({ label, value, status }: {
    label: string;
    value: string;
    status?: 'success' | 'warning' | 'error';
}) {
    const statusColors = {
        success: 'text-green-600',
        warning: 'text-yellow-600',
        error: 'text-red-600',
    };

    return (
        <div className="flex justify-between items-center py-2 border-b last:border-0">
            <span className="text-slate-600">{label}</span>
            <span className={`font-semibold ${status ? statusColors[status] : 'text-gray-900'}`}>
                {value}
            </span>
        </div>
    );
}

function OverviewTab() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        fetchWithAuth('/api/internal/health/overview').then(res => {
            if (res && res.health) setData(res.health);
        });
    }, []);

    const stats = data?.stats || {};

    const formatUptime = (sec: number) => {
        if (!sec) return '0s';
        if (sec < 60) return `${Math.floor(sec)}s`;
        const m = Math.floor(sec / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    };

    return (
        <div className="space-y-6">
            <SystemHealthCards healthData={data} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Process Uptime"
                    value={formatUptime(stats.uptime_seconds)}
                    subtitle="Backend Server"
                    color="green"
                />
                <StatCard
                    title="Avg Response (1h)"
                    value={`${stats.avg_response_time_1h || 0}ms`}
                    subtitle="Last Hour Latency"
                    color="blue"
                />
                <StatCard
                    title="Requests Today"
                    value={stats.total_requests_today?.toString() || '0'}
                    subtitle={`Success Rate: ${stats.success_rate_24h || 100}%`}
                    color="purple"
                />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">🚀 System Status</h3>
                <p className="text-blue-700 text-sm">Realtime monitoring is active. Metrics are aggregating from live traffic.</p>
            </div>
        </div>
    );
}

function DatabaseTab() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchWithAuth('/api/internal/health/database');
                if (data) {
                    setStats(data);
                }
            } catch (err) {
                console.error('Failed to load DB stats', err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                </div>
            </div>
        );
    }

    if (!stats) return <div className="p-4 text-red-500">Failed to load database metrics</div>;

    function formatBytes(mb: number) {
        if (mb < 1024) return `${mb} MB`;
        return `${(mb / 1024).toFixed(2)} GB`;
    }

    return (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Database Metrics (Realtime)</h2>
            <div className="space-y-4">
                <MetricRow label="Status" value={stats.status} status={stats.status === 'Connected' ? 'success' : 'error'} />
                <MetricRow label="Response Time (Latency)" value={`${stats.response_time_ms}ms`} />
                <MetricRow label="Active Connections" value={`${stats.active_connections} / ${stats.max_connections}`} />
                <MetricRow label="Database Size" value={formatBytes(stats.size_mb)} />
                <MetricRow label="Last Backup" value={stats.last_backup ? new Date(stats.last_backup.created_at).toLocaleString() : 'N/A'} />
            </div>
        </div>
    );
}

function RedisTab() {
    // Force update for Render deployment
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await fetchWithAuth('/api/internal/health/cache');
            if (data.success) {
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch Redis stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000); // 10s refresh
        return () => clearInterval(interval);
    }, []);

    const handleClearCache = async () => {
        if (!confirm('ATENÇÃO: Isto vai apagar TODA a cache do sistema (filas de jobs, sessões, etc). Tem a certeza?')) return;

        setCleaning(true);
        try {
            await fetchWithAuth('/api/internal/health/cache/clear', { method: 'POST' });
            alert('Cache limpa com sucesso!');
            fetchStats();
        } catch (error) {
            alert('Erro ao limpar cache');
        } finally {
            setCleaning(false);
        }
    };

    if (loading && !stats) return <div className="p-8 text-center text-gray-500">Loading Redis stats...</div>;

    const isHighMemory = stats?.memory_used?.includes('G') || (stats?.memory_used?.includes('M') && parseInt(stats?.memory_used) > 500);

    return (
        <div className="bg-white rounded-xl p-8 border border-slate-200">
            <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="text-amber-500" />
                    Redis Cache Status
                </h2>
                <button
                    onClick={handleClearCache}
                    disabled={cleaning}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    {cleaning ? 'Cleaning...' : 'Flush Cache (Danger)'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <MetricRow label="Keys / Jobs" value={stats?.keys?.toString() || '0'} />
                    <MetricRow
                        label="Memory Used"
                        value={stats?.memory_used || 'Unknown'}
                        status={isHighMemory ? 'warning' : 'success'}
                    />
                    <MetricRow label="Peak Memory" value={stats?.memory_peak || 'Unknown'} />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg text-xs font-mono text-slate-600 overflow-auto max-h-48">
                    <pre>{stats?.info || 'No info available'}</pre>
                </div>
            </div>
        </div>
    );
}

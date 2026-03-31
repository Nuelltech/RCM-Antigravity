"use client";

import { useEffect, useState } from "react";
import { internalCatalogService, GlobalProduct } from "@/services/internal-catalog.service";
import { Check, X, Clock, Database, Search, RefreshCw } from "lucide-react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CatalogApprovalPage() {
    const [products, setProducts] = useState<GlobalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("PENDING");
    const [filterOrigem, setFilterOrigem] = useState<string>("ALL");
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
    const [scanLoading, setScanLoading] = useState(false);
    const [scanMessage, setScanMessage] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const query: any = { status: filterStatus, limit: 100 };
            if (filterOrigem !== "ALL") query.origem = filterOrigem;

            const res = await internalCatalogService.getCatalog(query);
            if (res.items) {
                setProducts(res.items);
            }
        } catch (error) {
            console.error("Failed to load catalog", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filterStatus, filterOrigem]);

    const handleTriggerScan = async () => {
        setScanLoading(true);
        setScanMessage(null);
        try {
            const res = await internalCatalogService.triggerScan();
            if (res.success) {
                setScanMessage(`✅ Scan iniciado! Job ID: ${res.jobId}. Recarregue a página em alguns segundos para ver novos produtos.`);
            } else {
                setScanMessage('❌ Erro ao iniciar o scan.');
            }
        } catch (e) {
            setScanMessage('❌ Erro de comunicação com o servidor.');
        } finally {
            setScanLoading(false);
        }
    };

    const handleAction = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        try {
            await internalCatalogService.updateStatus(id, status);
            // Remove from list or refresh
            loadData();
        } catch (error) {
            alert("Erro ao atualizar status");
        }
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Catálogo Global (Inteligência Partilhada)</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Reveja, aprove ou rejeite sugestões submetidas pelos Lojistas via importação de faturas ou criação manual.
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={handleTriggerScan}
                                disabled={scanLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${scanLoading ? 'animate-spin' : ''}`} />
                                {scanLoading ? 'A iniciar scan...' : 'Scan Manual Agora'}
                            </button>
                            {scanMessage && (
                                <p className="text-xs text-gray-600 max-w-xs text-right">{scanMessage}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setFilterStatus("PENDING")}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${filterStatus === 'PENDING' ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Clock className="w-4 h-4 inline-block mr-2" />
                                Pendentes de Aprovação
                            </button>
                            <button
                                onClick={() => setFilterStatus("APPROVED")}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${filterStatus === 'APPROVED' ? 'bg-green-100 text-green-700 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                <Check className="w-4 h-4 inline-block mr-2" />
                                Aprovados
                            </button>
                            <button
                                onClick={() => setFilterStatus("REJECTED")}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${filterStatus === 'REJECTED' ? 'bg-red-100 text-red-700 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                <X className="w-4 h-4 inline-block mr-2" />
                                Rejeitados
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">Origem:</span>
                            <select
                                value={filterOrigem}
                                onChange={(e) => setFilterOrigem(e.target.value)}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="ALL">Todas</option>
                                <option value="SCRAPER">Somente Scrapers (Robots)</option>
                                <option value="MESA_BRANCA">Mesa Branca (Faturas)</option>
                                <option value="RODO">RODO (Manuais)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Métrica Acumulada</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origem</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400">A carregar catálogo...</td>
                                        </tr>
                                    ) : products.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                                Nenhum produto com o estado <strong>{filterStatus}</strong> encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{item.nome}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Família: {item.familia_codigo || 'N/A'} • Sub: {item.subfamilia_codigo || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-semibold">{Number(item.preco_mercado).toFixed(2)}€ / {item.unidade_medida}</div>
                                                    <div className="text-xs text-gray-500">Baseado em {item.numero_contribuicoes} contribuições</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.origem === 'SCRAPER' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800'}`}>
                                                        {item.origem}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {item.status === 'PENDING' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleAction(item.id, 'APPROVED')}
                                                                className="px-3 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                                                            >
                                                                Aprovar
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(item.id, 'REJECTED')}
                                                                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                            >
                                                                Rejeitar
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </InternalLayout >
        </ProtectedRoute >
    );
}

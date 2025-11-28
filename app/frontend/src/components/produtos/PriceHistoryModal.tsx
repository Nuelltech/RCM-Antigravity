'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, User, Calendar, Tag } from 'lucide-react';

interface PriceHistoryEntry {
    id: string;
    preco_anterior: number;
    preco_novo: number;
    preco_unitario_anterior: number | null;
    preco_unitario_novo: number | null;
    percentual_mudanca: number;
    origem: 'MANUAL' | 'COMPRA' | 'SISTEMA';
    alterado_por: number | null;
    receitas_afetadas: number;
    menus_afetados: number;
    data_mudanca: string;
    usuario: {
        id: number;
        nome: string;
        email: string;
    } | null;
}

interface PriceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    variacaoId: number;
    produtoNome: string;
}

export default function PriceHistoryModal({
    isOpen,
    onClose,
    variacaoId,
    produtoNome,
}: PriceHistoryModalProps) {
    const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen, variacaoId]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `/api/produtos/variations/${variacaoId}/price-history?limit=50`,
                {
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Erro ao carregar histórico');
            }

            const data = await response.json();
            setHistory(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const getOrigemBadge = (origem: string) => {
        const styles = {
            MANUAL: 'bg-blue-100 text-blue-800',
            COMPRA: 'bg-green-100 text-green-800',
            SISTEMA: 'bg-purple-100 text-purple-800',
        };
        return styles[origem as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Histórico de Preços
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">{produtoNome}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                            <p className="font-semibold">Erro</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {!loading && !error && history.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg font-medium">
                                Nenhum histórico de preços disponível
                            </p>
                            <p className="text-sm mt-2">
                                As alterações de preço aparecerão aqui.
                            </p>
                        </div>
                    )}

                    {!loading && !error && history.length > 0 && (
                        <div className="space-y-4">
                            {history.map((entry, index) => {
                                const isIncrease =
                                    entry.preco_novo > entry.preco_anterior;
                                const isSignificant =
                                    Math.abs(entry.percentual_mudanca) > 10;

                                return (
                                    <div
                                        key={entry.id}
                                        className={`border rounded-lg p-4 ${isSignificant
                                                ? 'border-orange-300 bg-orange-50'
                                                : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`flex items-center gap-1 px-2 py-1 rounded ${isIncrease
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                        }`}
                                                >
                                                    {isIncrease ? (
                                                        <TrendingUp className="w-4 h-4" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4" />
                                                    )}
                                                    <span className="text-sm font-semibold">
                                                        {isIncrease ? '+' : ''}
                                                        {entry.percentual_mudanca.toFixed(1)}
                                                        %
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded ${getOrigemBadge(
                                                        entry.origem
                                                    )}`}
                                                >
                                                    {entry.origem}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(entry.data_mudanca)}
                                            </div>
                                        </div>

                                        {/* Price Change */}
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Preço Anterior
                                                </p>
                                                <p className="text-lg font-bold text-gray-700">
                                                    €{entry.preco_anterior.toFixed(2)}
                                                </p>
                                                {entry.preco_unitario_anterior && (
                                                    <p className="text-xs text-gray-400">
                                                        €
                                                        {entry.preco_unitario_anterior.toFixed(
                                                            4
                                                        )}{' '}
                                                        /un
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">
                                                    Preço Novo
                                                </p>
                                                <p className="text-lg font-bold text-gray-900">
                                                    €{entry.preco_novo.toFixed(2)}
                                                </p>
                                                {entry.preco_unitario_novo && (
                                                    <p className="text-xs text-gray-400">
                                                        €
                                                        {entry.preco_unitario_novo.toFixed(
                                                            4
                                                        )}{' '}
                                                        /un
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Impact */}
                                        {(entry.receitas_afetadas > 0 ||
                                            entry.menus_afetados > 0) && (
                                                <div className="flex items-center gap-4 text-xs text-gray-600 pt-3 border-t border-gray-200">
                                                    {entry.receitas_afetadas > 0 && (
                                                        <span>
                                                            📋 {entry.receitas_afetadas} receita
                                                            {entry.receitas_afetadas !== 1
                                                                ? 's'
                                                                : ''}
                                                        </span>
                                                    )}
                                                    {entry.menus_afetados > 0 && (
                                                        <span>
                                                            🍽️ {entry.menus_afetados} menu
                                                            {entry.menus_afetados !== 1
                                                                ? 's'
                                                                : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                        {/* User */}
                                        {entry.usuario && (
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                                <User className="w-3 h-3" />
                                                {entry.usuario.nome}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="border-t px-6 py-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

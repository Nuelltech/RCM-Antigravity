'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PriceImpact {
    affected_recipes: number;
    affected_menus: number;
    recipe_details: Array<{
        id: number;
        nome: string;
        tipo: string;
    }>;
    menu_details: Array<{
        id: number;
        nome_comercial: string;
        receita_nome: string;
        pvp_atual: number;
    }>;
}

interface UpdatePriceModalProps {
    isOpen: boolean;
    onClose: () => void;
    variacao: {
        id: number;
        produto_id: number;
        tipo_unidade_compra: string;
        unidades_por_compra: number;
        preco_compra: number;
        preco_unitario: number;
        produto: {
            nome: string;
            codigo_interno?: string;
        };
    };
    onSuccess?: () => void;
}

export default function UpdatePriceModal({
    isOpen,
    onClose,
    variacao,
    onSuccess,
}: UpdatePriceModalProps) {
    const [novoPreco, setNovoPreco] = useState(variacao.preco_compra.toString());
    const [origem, setOrigem] = useState<'MANUAL' | 'COMPRA' | 'SISTEMA'>('MANUAL');
    const [impact, setImpact] = useState<PriceImpact | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingImpact, setLoadingImpact] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const novoPrecoNum = parseFloat(novoPreco) || 0;
    const novoPrecoUnitario = novoPrecoNum / variacao.unidades_por_compra;
    const percentualMudanca =
        variacao.preco_compra > 0
            ? ((novoPrecoNum - variacao.preco_compra) / variacao.preco_compra) * 100
            : 0;

    useEffect(() => {
        if (isOpen) {
            setNovoPreco(variacao.preco_compra.toString());
            setOrigem('MANUAL');
            setImpact(null);
            setError(null);
            setSuccess(false);
            loadImpact();
        }
    }, [isOpen]);

    const loadImpact = async () => {
        setLoadingImpact(true);
        try {
            const response = await fetch(
                `/api/produtos/variations/${variacao.id}/impact`,
                {
                    credentials: 'include',
                }
            );
            if (response.ok) {
                const data = await response.json();
                setImpact(data);
            }
        } catch (err) {
            console.error('Error loading impact:', err);
        } finally {
            setLoadingImpact(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/produtos/variations/${variacao.id}/price`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        preco_compra: novoPrecoNum,
                        origem,
                    }),
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao atualizar preço');
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isMudancaSignificativa = Math.abs(percentualMudanca) > 10;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Atualizar Preço do Produto
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {variacao.produto.nome}{' '}
                            {variacao.produto.codigo_interno && (
                                <span className="text-gray-400">
                                    ({variacao.produto.codigo_interno})
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Current Price Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Preço Atual
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Preço de Compra</p>
                                <p className="text-lg font-bold text-gray-900">
                                    €{variacao.preco_compra.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {variacao.tipo_unidade_compra}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Preço Unitário</p>
                                <p className="text-lg font-bold text-gray-900">
                                    €{variacao.preco_unitario.toFixed(4)}
                                </p>
                                <p className="text-xs text-gray-400">
                                    por unidade base
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* New Price Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Novo Preço de Compra *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                €
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                value={novoPreco}
                                onChange={(e) => setNovoPreco(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                required
                                min="0"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Novo preço unitário: €{novoPrecoUnitario.toFixed(4)}
                        </p>
                    </div>

                    {/* Price Change Indicator */}
                    {novoPrecoNum !== variacao.preco_compra && (
                        <div
                            className={`flex items-center gap-2 p-4 rounded-lg ${percentualMudanca > 0
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                                }`}
                        >
                            {percentualMudanca > 0 ? (
                                <TrendingUp className="w-5 h-5" />
                            ) : (
                                <TrendingDown className="w-5 h-5" />
                            )}
                            <div className="flex-1">
                                <p className="font-semibold">
                                    {percentualMudanca > 0 ? 'Aumento' : 'Redução'} de{' '}
                                    {Math.abs(percentualMudanca).toFixed(1)}%
                                </p>
                                <p className="text-sm">
                                    Diferença: €
                                    {Math.abs(novoPrecoNum - variacao.preco_compra).toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                            {isMudancaSignificativa && (
                                <AlertCircle className="w-5 h-5" />
                            )}
                        </div>
                    )}

                    {/* Origin Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Origem da Atualização
                        </label>
                        <select
                            value={origem}
                            onChange={(e) =>
                                setOrigem(e.target.value as 'MANUAL' | 'COMPRA' | 'SISTEMA')
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="MANUAL">Manual</option>
                            <option value="COMPRA">Compra</option>
                            <option value="SISTEMA">Sistema</option>
                        </select>
                    </div>

                    {/* Impact Preview */}
                    {impact && !loadingImpact && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">
                                Impacto Estimado
                            </h4>
                            <div className="space-y-2 text-sm text-blue-800">
                                <p>
                                    📋 <strong>{impact.affected_recipes}</strong> receita
                                    {impact.affected_recipes !== 1 ? 's' : ''} afetada
                                    {impact.affected_recipes !== 1 ? 's' : ''}
                                </p>
                                <p>
                                    🍽️ <strong>{impact.affected_menus}</strong> item
                                    {impact.affected_menus !== 1 ? 's' : ''} de menu afetado
                                    {impact.affected_menus !== 1 ? 's' : ''}
                                </p>
                                {impact.recipe_details.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-blue-700 hover:text-blue-900">
                                            Ver receitas afetadas
                                        </summary>
                                        <ul className="mt-2 ml-4 space-y-1">
                                            {impact.recipe_details.map((r) => (
                                                <li key={r.id} className="text-xs">
                                                    • {r.nome} ({r.tipo})
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        </div>
                    )}

                    {loadingImpact && (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                            Calculando impacto...
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
                            <p className="font-semibold">Erro</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4">
                            <p className="font-semibold">✓ Preço atualizado com sucesso!</p>
                            <p className="text-sm">
                                Todos os custos foram recalculados automaticamente.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-gray-400"
                            disabled={
                                loading || novoPrecoNum === variacao.preco_compra
                            }
                        >
                            {loading ? 'Atualizando...' : 'Atualizar Preço'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import { MenuSquare, Edit, Trash2, ToggleLeft, ToggleRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuItemWithRecipe } from "@/types/menu";

interface MenuCardProps {
    item: MenuItemWithRecipe;
    onEdit: (item: MenuItemWithRecipe) => void;
    onToggle: (itemId: number) => void;
    onDelete: (itemId: number) => void;
    getCMVColor: (cmv: number) => string;
}

export function MenuCard({ item, onEdit, onToggle, onDelete, getCMVColor }: MenuCardProps) {
    const nomeOriginal = item.receita?.nome || item.combo?.nome || item.formatoVenda?.nome || "";
    const imagemUrl = item.receita?.imagem_url || item.combo?.imagem_url || item.formatoVenda?.produto.imagem_url;

    let custo = 0;
    if (item.receita) custo = item.receita.custo_por_porcao;
    else if (item.combo) custo = item.combo.custo_total;
    else if (item.formatoVenda) custo = item.formatoVenda.custo_unitario;

    const isCombo = !!item.combo;
    const isProduct = !!item.formatoVenda;

    return (
        <div className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${!item.ativo ? 'opacity-60' : ''}`}>
            {/* Image */}
            <div className={`h-48 flex items-center justify-center relative ${isCombo
                ? "bg-gradient-to-br from-purple-50 to-purple-100"
                : isProduct
                    ? "bg-gradient-to-br from-blue-50 to-blue-100"
                    : "bg-gradient-to-br from-orange-50 to-orange-100"
                }`}>
                {imagemUrl ? (
                    <img
                        src={imagemUrl}
                        alt={item.nome_comercial}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    isProduct ? (
                        <Package className="h-20 w-20 text-blue-300" />
                    ) : (
                        <MenuSquare className={`h-20 w-20 ${isCombo ? "text-purple-300" : "text-orange-300"}`} />
                    )
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {item.destacado && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-400 text-yellow-900">
                            ⭐ Destacado
                        </span>
                    )}
                    {isCombo && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            Combo
                        </span>
                    )}
                    {isProduct && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Produto
                        </span>
                    )}
                    {!isCombo && !isProduct && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            Receita
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-semibold text-lg">{item.nome_comercial}</h3>
                    <p className="text-sm text-gray-500">{nomeOriginal}</p>
                    {item.categoria_menu && (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 mt-1">
                            {item.categoria_menu}
                        </span>
                    )}
                </div>

                {/* Pricing Section */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">PVP:</span>
                        <span className="text-xl font-bold text-green-600">€ {item.pvp.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Custo:</span>
                        <span className="font-medium text-gray-700">€ {custo.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                        <span className="text-gray-600">Margem:</span>
                        <div className="text-right">
                            <div className="font-semibold text-gray-900">€ {item.margem_bruta?.toFixed(2) ?? "0.00"}</div>
                            <div className="text-xs text-gray-500">{item.margem_percentual?.toFixed(1) ?? "0"}%</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-gray-600">CMV:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCMVColor(item.cmv_percentual)}`}>
                            {item.cmv_percentual.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Description */}
                {item.descricao_menu && (
                    <p className="text-sm text-gray-600 line-clamp-2">{item.descricao_menu}</p>
                )}

                {/* Additional Info */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {item.alergenos && (
                        <span className="px-2 py-1 bg-red-50 text-red-600 rounded">
                            ⚠️ {item.alergenos}
                        </span>
                    )}
                    {item.calorias && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                            🔥 {item.calorias} kcal
                        </span>
                    )}
                    {item.tempo_servico && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                            ⏱️ {item.tempo_servico} min
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/menu/${item.id}`}
                        title="Ver detalhes"
                    >
                        Ver
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(item)}
                    >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggle(item.id)}
                        title={item.ativo ? "Desativar" : "Ativar"}
                    >
                        {item.ativo ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(item.id)}
                        className="text-red-600 hover:bg-red-50"
                        title="Remover do menu"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

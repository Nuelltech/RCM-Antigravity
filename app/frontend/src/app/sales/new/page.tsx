"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchClient } from "@/lib/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface MenuItem {
    id: number;
    nome_comercial: string;
    pvp: number;
}

interface SaleItem {
    id: number;
    qty: number;
}

export default function NewSalePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

    // Form State
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [comment, setComment] = useState("");
    const [type, setType] = useState<"TOTAL" | "ITEM">("ITEM");
    const [amount, setAmount] = useState<number | undefined>();
    const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);

    useEffect(() => {
        loadMenuItems();
    }, []);

    const loadMenuItems = async () => {
        try {
            const data = await fetchClient("/menu");
            setMenuItems(data || []);
        } catch (error) {
            console.error("Failed to load menu items:", error);
        }
    };

    const addItem = () => {
        setSelectedItems([...selectedItems, { id: 0, qty: 1 }]);
    };

    const updateItem = (index: number, field: keyof SaleItem, value: number) => {
        const newItems = [...selectedItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setSelectedItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = selectedItems.filter((_, i) => i !== index);
        setSelectedItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                date: new Date(date).toISOString(),
                comment,
                type,
                amount: type === "TOTAL" ? amount : undefined,
                items: type === "ITEM" ? selectedItems.filter(i => i.id !== 0) : undefined,
            };

            await fetchClient("/sales", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            alert("✅ Venda registada com sucesso!");
            router.push("/sales");
        } catch (error: any) {
            console.error("Error:", error);
            alert(`❌ Erro: ${error.message || "Erro ao registar venda"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/sales">
                        <Button type="button" variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Nova Venda</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes da Venda</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Data</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tipo de Registo</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={type === "ITEM" ? "default" : "outline"}
                                        onClick={() => setType("ITEM")}
                                        className="flex-1"
                                    >
                                        Por Item
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={type === "TOTAL" ? "default" : "outline"}
                                        onClick={() => setType("TOTAL")}
                                        className="flex-1"
                                    >
                                        Total Diário
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Comentários</label>
                            <Input
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Observações opcionais..."
                            />
                        </div>

                        {type === "TOTAL" ? (
                            <div>
                                <label className="block text-sm font-medium mb-2">Valor Total (€)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    lang="en"
                                    inputMode="decimal"
                                    value={amount || ""}
                                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                                    required={type === "TOTAL"}
                                    placeholder="0.00"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-medium">Itens Vendidos</h3>
                                    <Button type="button" onClick={addItem} size="sm" variant="outline">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar Item
                                    </Button>
                                </div>

                                {selectedItems.map((item, index) => (
                                    <div key={index} className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label className="text-xs mb-1 block">Item</label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={item.id}
                                                onChange={(e) => updateItem(index, "id", parseInt(e.target.value))}
                                                required
                                            >
                                                <option value="0">Selecione...</option>
                                                {menuItems.map((mi) => (
                                                    <option key={mi.id} value={mi.id}>
                                                        {mi.nome_comercial} (€ {Number(mi.pvp).toFixed(2)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs mb-1 block">Qtd</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.qty}
                                                onChange={(e) => updateItem(index, "qty", parseInt(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500"
                                            onClick={() => removeItem(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {selectedItems.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4 border border-dashed rounded">
                                        Nenhum item adicionado.
                                    </p>
                                )}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "A registar..." : "Registar Venda"}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </AppLayout>
    );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { fetchClient } from '@/lib/api';

interface LogItem {
    id: number;
    entity_type: string;
    entity_id: number;
    entity_name: string;
    field_changed: string;
    old_value: number;
    new_value: number;
}

interface IntegrationReportModalProps {
    invoiceId: number;
    open: boolean;
    onClose: () => void;
}

export function IntegrationReportModal({ invoiceId, open, onClose }: IntegrationReportModalProps) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<LogItem[]>([]);
    const [activeTab, setActiveTab] = useState('PRODUCT');

    useEffect(() => {
        if (open && invoiceId) {
            fetchLogItems();
        }
    }, [open, invoiceId]);

    const fetchLogItems = async () => {
        setLoading(true);
        try {
            const data = await fetchClient(`/invoices/${invoiceId}/integration-log/items`);
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);
    };

    const formatPercent = (val: number) => {
        return new Intl.NumberFormat('pt-PT', { style: 'percent', minimumFractionDigits: 1 }).format(val / 100);
    };

    const renderChange = (oldVal: number, newVal: number, type: string) => {
        const diff = newVal - oldVal;
        const isHigher = diff > 0;
        const color = type === 'margin'
            ? (isHigher ? 'text-green-600' : 'text-red-600') // Margin up is good
            : (isHigher ? 'text-red-600' : 'text-green-600'); // Cost/Price up is bad (usually)

        return (
            <div className={`flex items-center gap-1 font-medium ${color}`}>
                {isHigher ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {type === 'margin' ? formatPercent(Math.abs(diff) * 100) : formatCurrency(Math.abs(diff))}
            </div>
        );
    };

    const filteredItems = items.filter(i => i.entity_type === activeTab);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Relatório de Integração</DialogTitle>
                    <DialogDescription>
                        Impacto da fatura #{invoiceId} nos custos e preços
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="PRODUCT">Produtos ({items.filter(i => i.entity_type === 'PRODUCT').length})</TabsTrigger>
                            <TabsTrigger value="RECIPE">Receitas ({items.filter(i => i.entity_type === 'RECIPE').length})</TabsTrigger>
                            <TabsTrigger value="MENU_ITEM">Menus ({items.filter(i => i.entity_type === 'MENU_ITEM').length})</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Campo</TableHead>
                                        <TableHead className="text-right">Anterior</TableHead>
                                        <TableHead className="text-right">Novo</TableHead>
                                        <TableHead className="text-right">Diferença</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                                Nenhuma alteração registada neste grupo.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.entity_name}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {item.field_changed === 'cost' ? 'Custo' :
                                                        item.field_changed === 'price_unit' ? 'Preço Uni.' :
                                                            item.field_changed === 'margin' ? 'Margem' : item.field_changed}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.field_changed === 'margin' ? formatPercent(item.old_value) : formatCurrency(item.old_value)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.field_changed === 'margin' ? formatPercent(item.new_value) : formatCurrency(item.new_value)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {renderChange(item.old_value, item.new_value, item.field_changed)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Building2, Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DadosRestaurante {
    id: number;
    numero_lugares: number;
    horas_trabalho_dia: number;
    dias_trabalho_semana: number;
    // Alert Thresholds
    cmv_alerta_amarelo: number;
    cmv_alerta_vermelho: number;
    alerta_aumento_custo_leve: number;
    alerta_aumento_custo_medio: number;
    alerta_aumento_custo_grave: number;
    alerta_inatividade_leve: number;
    alerta_inatividade_medio: number;
    alerta_inatividade_grave: number;
}

interface Custo {
    id: number;
    uuid: string;
    descricao: string;
    classificacao: string;
    valor_mensal: number;
    ativo: boolean;
}

interface CustoTotal {
    valor: number;
    periodo: string;
    totalMensal: number;
    breakdown: Custo[];
}

const CLASSIFICACOES = [
    'Salário',
    'Eletricidade',
    'Água',
    'Marketing',
    'Contabilidade',
    'Sistemas',
    'Internet',
    'Veículos',
    'Renda',
    'Gestão',
    'Outros'
];

const PERIODOS = [
    { value: 'mes', label: 'Mês' },
    { value: 'semana', label: 'Semana' },
    { value: 'dia', label: 'Dia' },
    { value: 'hora', label: 'Hora' },
];

export default function DadosRestaurantePage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [dados, setDados] = useState<DadosRestaurante | null>(null);
    const [custos, setCustos] = useState<Custo[]>([]);
    const [custoTotal, setCustoTotal] = useState<CustoTotal | null>(null);
    const [periodo, setPeriodo] = useState<string>('mes');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCusto, setEditingCusto] = useState<Custo | null>(null);

    // Form states
    const [formDados, setFormDados] = useState({
        numero_lugares: 0,
        horas_trabalho_dia: 8,
        dias_trabalho_semana: 5,
        cmv_alerta_amarelo: 30,
        cmv_alerta_vermelho: 35,
        alerta_aumento_custo_leve: 5,
        alerta_aumento_custo_medio: 10,
        alerta_aumento_custo_grave: 15,
        alerta_inatividade_leve: 3,
        alerta_inatividade_medio: 6,
        alerta_inatividade_grave: 10,
    });

    const [formCusto, setFormCusto] = useState({
        descricao: '',
        classificacao: 'Outros',
        valor_mensal: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (custos.length > 0) {
            loadCustoTotal();
        }
    }, [periodo, custos]);

    async function loadData() {
        try {
            const [dadosRes, custosRes] = await Promise.all([
                fetchClient('/dados-restaurante'),
                fetchClient('/dados-restaurante/custos'),
            ]);

            setDados(dadosRes);
            setFormDados({
                numero_lugares: dadosRes.numero_lugares,
                horas_trabalho_dia: dadosRes.horas_trabalho_dia,
                dias_trabalho_semana: dadosRes.dias_trabalho_semana,
                cmv_alerta_amarelo: dadosRes.cmv_alerta_amarelo,
                cmv_alerta_vermelho: dadosRes.cmv_alerta_vermelho,
                alerta_aumento_custo_leve: dadosRes.alerta_aumento_custo_leve,
                alerta_aumento_custo_medio: dadosRes.alerta_aumento_custo_medio,
                alerta_aumento_custo_grave: dadosRes.alerta_aumento_custo_grave,
                alerta_inatividade_leve: dadosRes.alerta_inatividade_leve,
                alerta_inatividade_medio: dadosRes.alerta_inatividade_medio,
                alerta_inatividade_grave: dadosRes.alerta_inatividade_grave,
            });
            setCustos(custosRes);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar os dados do restaurante.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadCustoTotal() {
        try {
            const total = await fetchClient(`/dados-restaurante/custos/total?periodo=${periodo}`);
            setCustoTotal(total);
        } catch (error) {
            console.error('Erro ao carregar custo total:', error);
        }
    }

    async function handleSaveDados() {
        try {
            const updated = await fetchClient('/dados-restaurante', {
                method: 'PUT',
                body: JSON.stringify(formDados),
            });
            setDados(updated);
            toast({
                title: 'Sucesso',
                description: 'Dados do restaurante atualizados com sucesso.',
            });
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível salvar os dados.',
                variant: 'destructive',
            });
        }
    }

    async function handleSaveCusto() {
        try {
            if (editingCusto) {
                await fetchClient(`/dados-restaurante/custos/${editingCusto.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formCusto),
                });
                toast({
                    title: 'Sucesso',
                    description: 'Custo atualizado com sucesso.',
                });
            } else {
                await fetchClient('/dados-restaurante/custos', {
                    method: 'POST',
                    body: JSON.stringify(formCusto),
                });
                toast({
                    title: 'Sucesso',
                    description: 'Custo criado com sucesso.',
                });
            }
            setModalOpen(false);
            setEditingCusto(null);
            setFormCusto({ descricao: '', classificacao: 'Outros', valor_mensal: 0 });
            loadData();
        } catch (error) {
            console.error('Erro ao salvar custo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível salvar o custo.',
                variant: 'destructive',
            });
        }
    }

    async function handleDeleteCusto(id: number) {
        if (!confirm('Tem certeza que deseja eliminar este custo?')) return;

        try {
            await fetchClient(`/dados-restaurante/custos/${id}`, {
                method: 'DELETE',
            });
            toast({
                title: 'Sucesso',
                description: 'Custo eliminado com sucesso.',
            });
            loadData();
        } catch (error) {
            console.error('Erro ao eliminar custo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível eliminar o custo.',
                variant: 'destructive',
            });
        }
    }

    function openEditModal(custo: Custo) {
        setEditingCusto(custo);
        setFormCusto({
            descricao: custo.descricao,
            classificacao: custo.classificacao,
            valor_mensal: custo.valor_mensal,
        });
        setModalOpen(true);
    }

    function openCreateModal() {
        setEditingCusto(null);
        setFormCusto({ descricao: '', classificacao: 'Outros', valor_mensal: 0 });
        setModalOpen(true);
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-screen">
                    <p>A carregar...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6 p-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Building2 className="h-8 w-8" />
                        Dados do Restaurante
                    </h1>
                    <p className="text-muted-foreground">
                        Configure as informações operacionais e gerencie os custos de estrutura.
                    </p>
                </div>

                {/* Operational Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configurações Operacionais</CardTitle>
                        <CardDescription>
                            Defina as características operacionais do seu restaurante
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="numero_lugares">Número de Lugares</Label>
                                <Input
                                    id="numero_lugares"
                                    type="number"
                                    value={formDados.numero_lugares}
                                    onChange={(e) => setFormDados({ ...formDados, numero_lugares: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="horas_trabalho_dia">Horas de Trabalho/Dia</Label>
                                <Input
                                    id="horas_trabalho_dia"
                                    type="number"
                                    step="0.5"
                                    value={formDados.horas_trabalho_dia}
                                    onChange={(e) => setFormDados({ ...formDados, horas_trabalho_dia: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dias_trabalho_semana">Dias de Trabalho/Semana</Label>
                                <Input
                                    id="dias_trabalho_semana"
                                    type="number"
                                    step="0.5"
                                    value={formDados.dias_trabalho_semana}
                                    onChange={(e) => setFormDados({ ...formDados, dias_trabalho_semana: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <Button onClick={handleSaveDados}>Guardar Configurações</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Alert Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configuração de Alertas</CardTitle>
                        <CardDescription>
                            Defina os critérios para os alertas do sistema
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* CMV Alerts */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Margens & CMV
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="cmv_alerta_amarelo">Alerta Amarelo (CMV %)</Label>
                                    <Input
                                        id="cmv_alerta_amarelo"
                                        type="number"
                                        value={formDados.cmv_alerta_amarelo}
                                        onChange={(e) => setFormDados({ ...formDados, cmv_alerta_amarelo: parseFloat(e.target.value) || 0 })}
                                    />
                                    <p className="text-xs text-muted-foreground">Acima deste valor gera alerta de atenção.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cmv_alerta_vermelho">Alerta Vermelho (CMV %)</Label>
                                    <Input
                                        id="cmv_alerta_vermelho"
                                        type="number"
                                        value={formDados.cmv_alerta_vermelho}
                                        onChange={(e) => setFormDados({ ...formDados, cmv_alerta_vermelho: parseFloat(e.target.value) || 0 })}
                                    />
                                    <p className="text-xs text-muted-foreground">Acima deste valor gera alerta crítico.</p>
                                </div>
                            </div>
                        </div>

                        {/* Cost Increase Alerts */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Aumento de Custos
                            </h3>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="alerta_aumento_custo_leve">Leve (%)</Label>
                                    <Input
                                        id="alerta_aumento_custo_leve"
                                        type="number"
                                        value={formDados.alerta_aumento_custo_leve}
                                        onChange={(e) => setFormDados({ ...formDados, alerta_aumento_custo_leve: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alerta_aumento_custo_medio">Médio (%)</Label>
                                    <Input
                                        id="alerta_aumento_custo_medio"
                                        type="number"
                                        value={formDados.alerta_aumento_custo_medio}
                                        onChange={(e) => setFormDados({ ...formDados, alerta_aumento_custo_medio: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alerta_aumento_custo_grave">Grave (%)</Label>
                                    <Input
                                        id="alerta_aumento_custo_grave"
                                        type="number"
                                        value={formDados.alerta_aumento_custo_grave}
                                        onChange={(e) => setFormDados({ ...formDados, alerta_aumento_custo_grave: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Inactivity Alerts */}
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Inatividade (Dias sem Vendas/Compras)
                            </h3>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="alerta_inatividade_leve">Leve (Dias)</Label>
                                    <Input
                                        id="alerta_inatividade_leve"
                                        type="number"
                                        value={formDados.alerta_inatividade_leve}
                                        onChange={(e) => setFormDados({ ...formDados, alerta_inatividade_leve: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alerta_inatividade_medio">Médio (Dias)</Label>
                                    <Input
                                        id="alerta_inatividade_medio"
                                        type="number"
                                        value={formDados.alerta_inatividade_medio}
                                        onChange={(e) => setFormDados({ ...formDados, alerta_inatividade_medio: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alerta_inatividade_grave">Grave (Dias)</Label>
                                    <Input
                                        id="alerta_inatividade_grave"
                                        type="number"
                                        value={formDados.alerta_inatividade_grave}
                                        onChange={(e) => setFormDados({ ...formDados, alerta_inatividade_grave: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Button onClick={handleSaveDados}>Guardar Configurações</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Cost Summary */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Custo de Estrutura
                                </CardTitle>
                                <CardDescription>
                                    Visualize o custo total por período
                                </CardDescription>
                            </div>
                            <Select value={periodo} onValueChange={setPeriodo}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Selecione o período" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERIODOS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {custoTotal && (
                            <div className="text-center">
                                <p className="text-4xl font-bold text-primary">
                                    € {custoTotal.valor.toFixed(2)}
                                </p>
                                <p className="text-muted-foreground mt-2">
                                    por {custoTotal.periodo}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Total Mensal: € {custoTotal.totalMensal.toFixed(2)}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Costs Management */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Gestão de Custos</CardTitle>
                                <CardDescription>
                                    Adicione e gerencie os custos de estrutura
                                </CardDescription>
                            </div>
                            <Button onClick={openCreateModal}>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Custo
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead>Classificação</TableHead>
                                    <TableHead className="text-right">Valor Mensal</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {custos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            Nenhum custo registado. Clique em "Adicionar Custo" para começar.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    custos.map((custo) => (
                                        <TableRow key={custo.id}>
                                            <TableCell className="font-medium">{custo.descricao}</TableCell>
                                            <TableCell>{custo.classificacao}</TableCell>
                                            <TableCell className="text-right">
                                                € {custo.valor_mensal.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditModal(custo)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteCusto(custo.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Cost Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCusto ? 'Editar Custo' : 'Adicionar Custo'}
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os detalhes do custo de estrutura
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="descricao">Descrição</Label>
                            <Input
                                id="descricao"
                                value={formCusto.descricao}
                                onChange={(e) => setFormCusto({ ...formCusto, descricao: e.target.value })}
                                placeholder="Ex: Salário do Chef"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="classificacao">Classificação</Label>
                            <Select
                                value={formCusto.classificacao}
                                onValueChange={(value) => setFormCusto({ ...formCusto, classificacao: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASSIFICACOES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="valor_mensal">Valor Mensal (€)</Label>
                            <Input
                                id="valor_mensal"
                                type="number"
                                step="0.01"
                                value={formCusto.valor_mensal}
                                onChange={(e) => setFormCusto({ ...formCusto, valor_mensal: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveCusto}>
                            {editingCusto ? 'Atualizar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

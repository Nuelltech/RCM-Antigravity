'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchClient } from '@/lib/api';

interface TemplateFormatoVenda {
    id: number;
    nome: string;
    descricao?: string;
    quantidade: number;
    unidade_medida: string;
    ativo: boolean;
    ordem_exibicao?: number;
    _count?: {
        formatosVenda: number;
    };
}

export default function TemplateFormatosVendaPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<TemplateFormatoVenda[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TemplateFormatoVenda | null>(null);

    // Form state
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [unidadeMedida, setUnidadeMedida] = useState('L');
    const [ativo, setAtivo] = useState(true);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await fetchClient('/template-formatos-venda');
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
            alert('Erro ao carregar templates');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setNome('');
        setDescricao('');
        setQuantidade('');
        setUnidadeMedida('L');
        setAtivo(true);
        setShowModal(true);
    };

    const openEditModal = (template: TemplateFormatoVenda) => {
        setEditingTemplate(template);
        setNome(template.nome);
        setDescricao(template.descricao || '');
        setQuantidade(template.quantidade.toString());
        setUnidadeMedida(template.unidade_medida);
        setAtivo(template.ativo);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data = {
            nome,
            descricao: descricao || undefined,
            quantidade: parseFloat(quantidade),
            unidade_medida: unidadeMedida,
            ativo,
        };

        try {
            if (editingTemplate) {
                await fetchClient(`/template-formatos-venda/${editingTemplate.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
            } else {
                await fetchClient('/template-formatos-venda', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            }

            setShowModal(false);
            loadTemplates();
        } catch (error: any) {
            console.error('Failed to save template:', error);
            alert(error.message || 'Erro ao guardar template');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem a certeza que deseja eliminar este template?')) return;

        try {
            await fetchClient(`/template-formatos-venda/${id}`, {
                method: 'DELETE',
            });
            loadTemplates();
        } catch (error: any) {
            console.error('Failed to delete template:', error);
            alert(error.message || 'Erro ao eliminar template');
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">A carregar...</div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Templates de Formatos de Venda</h1>
                        <p className="text-gray-600 mt-1">Gerir templates reutilizáveis para formatos de venda</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={20} />
                        Novo Template
                    </button>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Pesquisar templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Templates Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantidade
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Unidade
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Em Uso
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTemplates.map((template) => (
                                <tr key={template.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{template.nome}</div>
                                        {template.descricao && (
                                            <div className="text-sm text-gray-500">{template.descricao}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {template.quantidade}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {template.unidade_medida}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${template.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {template.ativo ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {template._count?.formatosVenda || 0} formato(s)
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(template)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredTemplates.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhum template encontrado
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">
                                {editingTemplate ? 'Editar Template' : 'Novo Template'}
                            </h2>

                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nome *
                                        </label>
                                        <input
                                            type="text"
                                            value={nome}
                                            onChange={(e) => setNome(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ex: Copo 25cl"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Descrição
                                        </label>
                                        <textarea
                                            value={descricao}
                                            onChange={(e) => setDescricao(e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Quantidade *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={quantidade}
                                                onChange={(e) => setQuantidade(e.target.value)}
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="0.25"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Unidade *
                                            </label>
                                            <select
                                                value={unidadeMedida}
                                                onChange={(e) => setUnidadeMedida(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="L">L</option>
                                                <option value="ML">ML</option>
                                                <option value="KG">KG</option>
                                                <option value="G">G</option>
                                                <option value="UN">UN</option>
                                                <option value="Unidade">Unidade</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="ativo"
                                            checked={ativo}
                                            onChange={(e) => setAtivo(e.target.checked)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">
                                            Ativo
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        {editingTemplate ? 'Atualizar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

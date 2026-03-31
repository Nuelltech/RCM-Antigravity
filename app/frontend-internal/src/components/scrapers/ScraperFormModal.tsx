"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ScraperConfig {
    id?: number;
    nome: string;
    slug: string;
    base_url: string;
    ativo: boolean;
    intervalo_horas: number;
    configuracao: any;
}

interface ScraperFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialData?: ScraperConfig | null;
}

export default function ScraperFormModal({ isOpen, onClose, onSave, initialData }: ScraperFormModalProps) {
    const [formData, setFormData] = useState<ScraperConfig>({
        nome: '',
        slug: '',
        base_url: '',
        ativo: true,
        intervalo_horas: 24,
        configuracao: {}
    });
    const [configJson, setConfigJson] = useState('{}');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
                setConfigJson(JSON.stringify(initialData.configuracao || {}, null, 2));
            } else {
                setFormData({
                    nome: '',
                    slug: '',
                    base_url: 'https://',
                    ativo: true,
                    intervalo_horas: 24,
                    configuracao: {}
                });
                setConfigJson('{\n  "email": "",\n  "password": ""\n}');
            }
            setError(null);
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Validate JSON
            let parsedConfig = {};
            try {
                parsedConfig = JSON.parse(configJson);
            } catch (err) {
                throw new Error("O JSON de Configuração é inválido.");
            }

            const payload = {
                ...formData,
                configuracao: parsedConfig
            };

            const token = localStorage.getItem('internal_token');
            const isEditing = !!formData.id;
            const url = isEditing
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/internal/scrapers/${formData.id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/internal/scrapers`;

            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao guardar ficheiro scraper.');
            }

            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {formData.id ? 'Editar Fornecedor Scraper' : 'Novo Fornecedor Scraper'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form id="scraper-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Fornecedor</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900"
                                    value={formData.nome}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: Makro PT"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug Interno (único)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-mono text-gray-700"
                                    value={formData.slug}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                    placeholder="ex: makro-pt"
                                    disabled={!!formData.id}
                                />
                                {formData.id && <p className="text-xs text-gray-400 mt-1">O slug não pode ser alterado após criação.</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Base (Loja)</label>
                            <input
                                type="url"
                                required
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm text-gray-700"
                                value={formData.base_url}
                                onChange={e => setFormData({ ...formData, base_url: e.target.value })}
                                placeholder="https://www.makro.pt"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo Auto (Horas)</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    value={formData.intervalo_horas}
                                    onChange={e => setFormData({ ...formData, intervalo_horas: parseInt(e.target.value) || 24 })}
                                />
                            </div>
                            <div className="flex items-center pt-6">
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.ativo}
                                            onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                                        />
                                        <div className={`block w-14 h-8 rounded-full transition-colors ${formData.ativo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.ativo ? 'transform translate-x-6' : ''}`}></div>
                                    </div>
                                    <div className="ml-3 font-medium text-gray-700">
                                        {formData.ativo ? 'Scraper Ativo' : 'Scraper Pausado'}
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Configuração JSON de Autenticação (Opcional)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">Se o fornecedor exigir login base (email/pass), tokens da API ou IDs de loja fixos.</p>
                            <textarea
                                className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm text-green-400"
                                value={configJson}
                                onChange={e => setConfigJson(e.target.value)}
                                spellCheck="false"
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="scraper-form"
                        disabled={loading}
                        className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? 'A Guardar...' : formData.id ? 'Atualizar Fornecedor' : 'Criar Fornecedor'}
                    </button>
                </div>
            </div>
        </div>
    );
}

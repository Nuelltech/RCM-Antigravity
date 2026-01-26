'use client';

import { useState } from 'react';
import { internalTenantsService } from '@/services/internal-tenants.service';
import { Trash2, Power, PowerOff, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuickActionsPanelProps {
    tenantId: string;
    tenantName: string;
    isActive: boolean;
}

export function QuickActionsPanel({ tenantId, tenantName, isActive }: QuickActionsPanelProps) {
    const [isClearing, setIsClearing] = useState(false);
    const [isSuspending, setIsSuspending] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [suspendReason, setSuspendReason] = useState('');

    const handleClearCache = async () => {
        if (!confirm(`Limpar cache de ${tenantName}?`)) return;

        try {
            setIsClearing(true);
            const response = await internalTenantsService.clearCache(tenantId);
            if (response.success) {
                toast.success('Cache limpa com sucesso!');
            }
        } catch (error) {
            toast.error('Erro ao limpar cache');
        } finally {
            setIsClearing(false);
        }
    };

    const handleSuspend = async () => {
        if (!suspendReason.trim()) {
            toast.error('Motivo obrigatório');
            return;
        }

        try {
            setIsSuspending(true);
            const response = await internalTenantsService.suspend(tenantId, suspendReason);
            if (response.success) {
                toast.success('Tenant suspendido');
                setShowSuspendModal(false);
                setSuspendReason('');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            toast.error('Erro ao suspender tenant');
        } finally {
            setIsSuspending(false);
        }
    };

    const handleActivate = async () => {
        if (!confirm(`Reativar ${tenantName}?`)) return;

        try {
            const response = await internalTenantsService.activate(tenantId);
            if (response.success) {
                toast.success('Tenant reativado');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            toast.error('Erro ao reativar tenant');
        }
    };

    const handleAddNote = async () => {
        if (!noteContent.trim()) {
            toast.error('Nota vazia');
            return;
        }

        try {
            const response = await internalTenantsService.addNote(tenantId, noteContent);
            if (response.success) {
                toast.success('Nota adicionada');
                setShowNoteModal(false);
                setNoteContent('');
            }
        } catch (error) {
            toast.error('Erro ao adicionar nota');
        }
    };

    return (
        <div className="space-y-6">
            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Clear Cache */}
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <Trash2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Limpar Cache</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Remove cache Redis deste tenant (health, timeline)
                            </p>
                            <button
                                onClick={handleClearCache}
                                disabled={isClearing}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                            >
                                {isClearing ? 'A limpar...' : 'Limpar Cache'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Suspend/Activate */}
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${isActive ? 'bg-red-50' : 'bg-green-50'}`}>
                            {isActive ? (
                                <PowerOff className="w-6 h-6 text-red-600" />
                            ) : (
                                <Power className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                                {isActive ? 'Suspender Tenant' : 'Reativar Tenant'}
                            </h3>
                            <p className="text-sm text-slate-600 mb-4">
                                {isActive
                                    ? 'Bloquear acesso temporariamente'
                                    : 'Restaurar acesso ao tenant'}
                            </p>
                            <button
                                onClick={isActive ? () => setShowSuspendModal(true) : handleActivate}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                            >
                                {isActive ? 'Suspender' : 'Reativar'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Note */}
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <StickyNote className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Adicionar Nota</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Nota interna de suporte (só visível internamente)
                            </p>
                            <button
                                onClick={() => setShowNoteModal(true)}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Nova Nota
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suspend Modal */}
            {showSuspendModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Suspender Tenant</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Indique o motivo da suspensão:
                        </p>
                        <textarea
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            placeholder="Ex: Falta de pagamento, Violação de termos..."
                            className="w-full p-3 border border-slate-300 rounded-lg mb-4 min-h-[100px]"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSuspendModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSuspend}
                                disabled={isSuspending}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                            >
                                {isSuspending ? 'A suspender...' : 'Confirmar Suspensão'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Nova Nota Interna</h3>
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Escreva a nota interna..."
                            className="w-full p-3 border border-slate-300 rounded-lg mb-4 min-h-[100px]"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowNoteModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddNote}
                                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Adicionar Nota
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

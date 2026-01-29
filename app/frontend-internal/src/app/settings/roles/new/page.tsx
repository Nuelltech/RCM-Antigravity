
"use client";

import { useEffect, useState } from "react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { internalRolesService, InternalPermission } from "@/services/internal-roles.service";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Save, CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewRolePage() {
    const router = useRouter();
    const [allPermissions, setAllPermissions] = useState<InternalPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

    useEffect(() => {
        const load = async () => {
            try {
                // Load all available permissions
                const permsRes = await internalRolesService.listPermissions();
                const perms = Array.isArray(permsRes) ? permsRes : (permsRes as any).data || [];
                setAllPermissions(perms);
            } catch (error) {
                console.error("Failed to load permissions", error);
                toast.error("Erro ao carregar permissões");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name) {
            toast.error("Nome do role é obrigatório");
            return;
        }

        setSaving(true);
        try {
            await internalRolesService.createRole({
                name,
                description,
                permissions: Array.from(selectedPermissions)
            });
            toast.success("Role criado com sucesso");
            router.push("/settings/roles");
        } catch (error: any) {
            toast.error(error.message || "Erro ao criar role");
        } finally {
            setSaving(false);
        }
    };

    const togglePermission = (permId: number) => {
        const newSet = new Set(selectedPermissions);
        if (newSet.has(permId)) {
            newSet.delete(permId);
        } else {
            newSet.add(permId);
        }
        setSelectedPermissions(newSet);
    };

    const toggleModule = (module: string) => {
        const modulePerms = allPermissions.filter(p => p.module === module);
        const allSelected = modulePerms.every(p => selectedPermissions.has(p.id));

        const newSet = new Set(selectedPermissions);
        if (allSelected) {
            modulePerms.forEach(p => newSet.delete(p.id));
        } else {
            modulePerms.forEach(p => newSet.add(p.id));
        }
        setSelectedPermissions(newSet);
    };

    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, InternalPermission[]>);

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/settings/roles" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Novo Role</h1>
                                <p className="text-gray-500">Criar novo perfil de acesso</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? "A criar..." : "Criar Role"}
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome (Identificador)</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono uppercase"
                                placeholder="EX: SALES_MANAGER"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use apenas letras maiúsculas e underscores.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 h-24"
                                placeholder="Descreva a função deste role..."
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Permissões por Módulo</h2>

                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(groupedPermissions).map(([module, perms]) => {
                                    const isAllSelected = perms.every(p => selectedPermissions.has(p.id));

                                    return (
                                        <div key={module} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <div
                                                className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => toggleModule(module)}
                                            >
                                                <h3 className="font-semibold text-gray-800 capitalize">{module.replace(/_/g, ' ')}</h3>
                                                <div className="text-xs font-medium text-orange-600">
                                                    {isAllSelected ? "Deselecionar Todos" : "Selecionar Todos"}
                                                </div>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {perms.map(perm => (
                                                    <div
                                                        key={perm.id}
                                                        className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                                        onClick={() => togglePermission(perm.id)}
                                                    >
                                                        <div className={`mt-0.5 ${selectedPermissions.has(perm.id) ? 'text-orange-600' : 'text-gray-300'}`}>
                                                            {selectedPermissions.has(perm.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm text-gray-900">{perm.slug}</div>
                                                            {perm.description && <div className="text-xs text-gray-500">{perm.description}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}


"use client";

import { useEffect, useState } from "react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { internalRolesService, InternalRole, InternalPermission } from "@/services/internal-roles.service";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, CheckSquare, Square } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function EditRolePage() {
    const { id } = useParams();
    const router = useRouter();
    const [role, setRole] = useState<InternalRole | null>(null);
    const [allPermissions, setAllPermissions] = useState<InternalPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

    useEffect(() => {
        const load = async () => {
            try {
                // Load all available permissions first
                const permsRes = await internalRolesService.listPermissions();
                // Check if permsRes is array directly or inside data
                const perms = Array.isArray(permsRes) ? permsRes : (permsRes as any).data || [];
                setAllPermissions(perms);

                // Load role
                const roleData = await internalRolesService.getRoleById(Number(id));
                const r = roleData as any; // Cast
                setRole(r);
                setDescription(r.description || "");

                // Set initial permissions
                // FIXED: Explicitly cast to number and Set<number> to avoid TS errors
                const permIds = new Set<number>(r.permissions.map((p: any) => Number(p.permission.id)));
                setSelectedPermissions(permIds);

            } catch (error) {
                console.error("Failed to load data", error);
                toast.error("Erro ao carregar dados");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await internalRolesService.updateRole(Number(id), {
                description,
                permissions: Array.from(selectedPermissions)
            });
            toast.success("Role atualizado com sucesso");
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem a certeza que deseja eliminar este role? Não pode ter utilizadores associados.")) return;
        try {
            await internalRolesService.deleteRole(Number(id));
            toast.success("Role eliminado");
            router.push("/settings/roles");
        } catch (error: any) {
            toast.error(error.message || "Erro ao eliminar role");
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
            // Deselect all
            modulePerms.forEach(p => newSet.delete(p.id));
        } else {
            // Select all
            modulePerms.forEach(p => newSet.add(p.id));
        }
        setSelectedPermissions(newSet);
    };

    // Group permissions by module
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, InternalPermission[]>);

    if (loading) {
        return (
            <ProtectedRoute>
                <InternalLayout>
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    </div>
                </InternalLayout>
            </ProtectedRoute>
        );
    }

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
                                <h1 className="text-2xl font-bold text-gray-900">Editar Role: {role?.name}</h1>
                                <p className="text-gray-500">Gerir permissões de acesso</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 font-medium"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? "A guardar..." : "Guardar"}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <label className="block text-sm font-medium text-gray-700">Descrição</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 h-24"
                            placeholder="Descreva a função deste role..."
                        />
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Permissões por Módulo</h2>

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
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

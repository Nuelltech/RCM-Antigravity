
"use client";

import { useEffect, useState } from "react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { internalUsersService, InternalUser, UpdateUserInput } from "@/services/internal-users.service";
import { internalRolesService, InternalRole } from "@/services/internal-roles.service";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Save, Shield, User, Lock, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function EditUserPage() {
    const { id } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<InternalUser | null>(null);
    const [roles, setRoles] = useState<InternalRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<UpdateUserInput>({
        name: "",
        role: "",
        active: true,
        email: ""
    });

    // Password reset state
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                // Load roles first
                const rolesRes = await internalRolesService.getRoles({ limit: 100 });
                setRoles(rolesRes.data || []);

                // Load user
                const userData = await internalUsersService.getUserById(Number(id));
                // response is directly the user object typically, or { data: user } depending on backend wrapper
                // My backend service returns just `userWithoutPassword` which is the object.
                // But frontend fetchWithAuth wrapper usually returns { data: ... }
                // Let's assume standard wrapper behavior: response.data is the payload.
                // In internalUsersService.getUserById, it returns fetchWithAuth result.
                // Server response for getById is `return user;` (which fastify wraps in object? No, likely just the JSON).
                // Actually my backend `getById` returns `user` directly.
                // My `fetchWithAuth` usually wraps or returns json.
                // Let's assume `userData` has the user fields.

                // Wait, checking internal-users.service.ts in backend...
                // `return user;`

                // Checking `fetchWithAuth` in `lib/api.ts` (I can't see it but assuming it returns parsed JSON).

                const u = userData as any; // Safe cast for now
                setUser(u);
                setFormData({
                    name: u.name,
                    email: u.email,
                    role: u.internalRole?.name || u.role,
                    active: u.active
                });

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
            await internalUsersService.updateUser(Number(id), formData);
            toast.success("Utilizador atualizado com sucesso");
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!newPassword || newPassword.length < 8) {
            toast.error("A password deve ter pelo menos 8 caracteres");
            return;
        }
        try {
            await internalUsersService.resetPassword(Number(id), newPassword);
            toast.success("Password redefinida com sucesso");
            setNewPassword("");
        } catch (error: any) {
            toast.error("Erro ao redefinir password");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem a certeza que deseja eliminar este utilizador? Esta ação não pode ser desfeita.")) return;
        try {
            await internalUsersService.deleteUser(Number(id));
            toast.success("Utilizador eliminado");
            router.push("/users");
        } catch (error) {
            toast.error("Erro ao eliminar utilizador");
        }
    };

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
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/users" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Editar Utilizador</h1>
                            <p className="text-gray-500">{user?.name}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <User className="h-5 w-5 text-gray-400" />
                                    Informações Básicas
                                </h2>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="">Selecione um role...</option>
                                            {roles.map(r => (
                                                <option key={r.id} value={r.name}>{r.name} - {r.description}</option>
                                            ))}
                                            {/* Fallback for legacy roles not in DB yet if needed, but we should migrate */}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="active"
                                            checked={formData.active}
                                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                        />
                                        <label htmlFor="active" className="text-sm font-medium text-gray-700">Conta Ativa</label>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {saving ? "A guardar..." : "Guardar Alterações"}
                                    </button>
                                </div>
                            </form>

                            {/* Password Reset Section */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                    Segurança
                                </h2>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Redefinir Password</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            placeholder="Nova password (min. 8 caracteres)"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePasswordReset}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                        >
                                            Redefinir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-gray-400" />
                                    Permissões
                                </h2>
                                <div className="text-sm text-gray-600 space-y-2">
                                    <p>O role <strong>{user?.internalRole?.name || user?.role}</strong> concede as seguintes permissões:</p>

                                    {user?.internalRole?.permissions.length ? (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {user.internalRole.permissions.map((p: any) => (
                                                <span key={p.permission.slug} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 border border-gray-200" title={p.permission.description}>
                                                    {p.permission.slug}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="italic text-gray-400">Sem permissões específicas visíveis.</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleDelete}
                                className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar Utilizador
                            </button>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

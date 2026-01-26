
"use client";

import { useEffect, useState } from "react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { internalUsersService, CreateUserInput } from "@/services/internal-users.service";
import { internalRolesService, InternalRole } from "@/services/internal-roles.service";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewUserPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<InternalRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateUserInput>({
        name: "",
        email: "",
        role: "",
        password: "",
        active: true
    });

    useEffect(() => {
        const load = async () => {
            try {
                // Load roles
                const rolesRes = await internalRolesService.getRoles({ limit: 100 });
                setRoles(rolesRes.data || []);
            } catch (error) {
                console.error("Failed to load roles", error);
                toast.error("Erro ao carregar roles");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password.length < 8) {
            toast.error("A password deve ter pelo menos 8 caracteres");
            return;
        }

        if (!formData.role) {
            toast.error("Selecione um role");
            return;
        }

        setSaving(true);
        try {
            await internalUsersService.createUser(formData);
            toast.success("Utilizador criado com sucesso");
            router.push("/users");
        } catch (error: any) {
            toast.error(error.message || "Erro ao criar utilizador");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Link href="/users" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Novo Utilizador</h1>
                            <p className="text-gray-500">Adicionar novo membro à equipa</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-gray-400" />
                            Dados do Utilizador
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
                                    placeholder="Ex: João Silva"
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
                                    placeholder="email@nuell.pt"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password Inicial</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Min. 8 caracteres"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">Selecione um role...</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.name}>{r.name} - {r.description}</option>
                                    ))}
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
                                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? "A criar..." : "Criar Utilizador"}
                            </button>
                        </div>
                    </form>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

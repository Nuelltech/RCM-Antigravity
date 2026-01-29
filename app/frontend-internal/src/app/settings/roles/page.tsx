
"use client";

import { useEffect, useState } from "react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { internalRolesService, InternalRole } from "@/services/internal-roles.service";
import toast from "react-hot-toast";
import Link from "next/link";
import { Shield, Plus, Edit2, Users, Lock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function RolesPage() {
    const [roles, setRoles] = useState<InternalRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            setLoading(true);
            const response = await internalRolesService.getRoles({ limit: 100 });
            setRoles(response.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar roles");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Perfis de Acesso (Roles)</h1>
                            <p className="text-gray-500">Defina os níveis de acesso e permissões.</p>
                        </div>
                        <Link
                            href="/settings/roles/new"
                            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium shadow-sm gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Novo Role
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-xl h-48 animate-pulse shadow-sm border border-gray-100"></div>
                            ))
                        ) : (
                            roles.map((role) => (
                                <Link
                                    key={role.id}
                                    href={`/settings/roles/${role.id}`}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-10 w-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                                            <Shield className="h-6 w-6" />
                                        </div>
                                        {/* <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                                            ID: {role.id}
                                        </span> */}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{role.name}</h3>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{role.description || "Sem descrição"}</p>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4">
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{role._count?.users || 0} Utilizadores</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Lock className="h-3.5 w-3.5" />
                                            <span>{role.permissions.length} Permissões</span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                        <ChevronRight className="h-5 w-5 text-gray-300" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

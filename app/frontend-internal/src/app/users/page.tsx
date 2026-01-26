
"use client";

import { useEffect, useState, useCallback } from "react";
import InternalLayout from "@/components/InternalLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { internalUsersService, InternalUser, UserFilters } from "@/services/internal-users.service";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
    Search,
    Filter,
    UserPlus,
    MoreVertical,
    Shield,
    CheckCircle,
    XCircle,
    Mail,
    Edit2
} from "lucide-react";
import Link from "next/link";
import { useInternalAuth } from "@/contexts/InternalAuthContext";

export default function UsersPage() {
    // const { user: currentUser } = useInternalAuth(); 

    const [users, setUsers] = useState<InternalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const [filters, setFilters] = useState<UserFilters>({
        page: 1,
        limit: 10,
        search: "",
        active: "",
    });

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await internalUsersService.getUsers(filters);
            setUsers(response.data || []);
            setTotalUsers(response.meta?.total || 0);
        } catch (error) {
            console.error("Failed to load users", error);
            toast.error("Erro ao carregar utilizadores");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters({ ...filters, page: 1 });
    };

    return (
        <ProtectedRoute>
            <InternalLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestão de Utilizadores</h1>
                            <p className="text-gray-500">Gira os membros da equipa e os seus acessos.</p>
                        </div>
                        <Link
                            href="/users/new"
                            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium shadow-sm transition-all hover:shadow-md gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            Novo Utilizador
                        </Link>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                        <form onSubmit={handleSearch} className="flex-1 min-w-[300px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome, email..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </form>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-gray-400" />
                                <select
                                    className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-600 cursor-pointer"
                                    value={filters.active}
                                    onChange={(e) => setFilters({ ...filters, active: e.target.value, page: 1 })}
                                >
                                    <option value="">Todos os status</option>
                                    <option value="true">Ativos</option>
                                    <option value="false">Inativos</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Utilizador</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Último Login</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                                                <td className="px-6 py-4"></td>
                                            </tr>
                                        ))
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                Nenhum utilizador encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium border border-gray-200">
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{u.name}</div>
                                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Shield className="h-4 w-4 text-gray-400" />
                                                        <span className="text-sm text-gray-700">
                                                            {u.internalRole ? u.internalRole.name : u.role}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.active ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Ativo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                            <XCircle className="w-3 h-3 mr-1" />
                                                            Inativo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {u.last_login_at ? (
                                                        format(new Date(u.last_login_at), "d MMM, HH:mm", { locale: pt })
                                                    ) : (
                                                        <span className="text-gray-400">Nunca</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link href={`/users/${u.id}`} className="p-2 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 inline-block transition-colors">
                                                        <Edit2 className="h-5 w-5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                A mostrar {((filters.page || 1) - 1) * (filters.limit || 10) + 1} a {Math.min((filters.page || 1) * (filters.limit || 10), totalUsers)} de {totalUsers}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    disabled={(filters.page || 1) === 1}
                                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <button
                                    disabled={(filters.page || 1) * (filters.limit || 10) >= totalUsers}
                                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Seguinte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </InternalLayout>
        </ProtectedRoute>
    );
}

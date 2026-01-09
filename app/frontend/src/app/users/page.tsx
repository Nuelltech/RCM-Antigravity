'use client';

import { useState, useEffect } from 'react';
import { fetchClient } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Search, Mail, CheckCircle, XCircle, Edit, RotateCcw, Trash2 } from 'lucide-react';
import { ROLE_METADATA } from '@/lib/permissions';

interface User {
    id: number;
    nome: string;
    email: string;
    role: string;
    active: boolean;
    email_verified: boolean;
    invite_token: string | null;
    invite_expires: string | null;
    last_login: string | null;
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Invite modal state
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ nome: '', email: '', role: 'operador' });
    const [inviteLoading, setInviteLoading] = useState(false);

    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newRole, setNewRole] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const result = await fetchClient('/users');

            // API returns { data: [...], meta: {...} }
            setUsers(result.data || []);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleInviteUser() {
        setInviteLoading(true);
        try {
            await fetchClient('/users/invite', {
                method: 'POST',
                body: JSON.stringify(inviteForm),
            });

            alert(`Convite enviado para ${inviteForm.email}`);
            setInviteModalOpen(false);
            setInviteForm({ nome: '', email: '', role: 'operador' });
            loadUsers();
        } catch (error) {
            alert('Erro ao enviar convite');
        } finally {
            setInviteLoading(false);
        }
    }

    async function handleChangeRole(userId: number, newRole: string) {
        try {
            await fetchClient(`/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole }),
            });

            alert('Role alterado com sucesso');
            setEditModalOpen(false);
            loadUsers();
        } catch (error) {
            alert('Erro ao alterar role');
        }
    }

    async function handleToggleActive(userId: number, currentActive: boolean) {
        const action = currentActive ? 'desativar' : 'reativar';
        if (!confirm(`Tem certeza que deseja ${action} este utilizador?`)) return;

        try {
            const url = currentActive
                ? `/users/${userId}`
                : `/users/${userId}/reactivate`;

            await fetchClient(url, {
                method: currentActive ? 'DELETE' : 'POST',
            });

            alert(`Utilizador ${currentActive ? 'desativado' : 'reativado'} com sucesso`);
            loadUsers();
        } catch (error) {
            alert(`Erro ao ${action} utilizador`);
        }
    }

    async function handleResendInvite(userId: number) {
        try {
            await fetchClient(`/users/${userId}/resend-invite`, {
                method: 'POST',
            });

            alert('Convite reenviado com sucesso');
        } catch (error) {
            alert('Erro ao reenviar convite');
        }
    }

    async function handleDeleteUser(userId: number, userName: string) {
        if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja REMOVER PERMANENTEMENTE o utilizador "${userName}"?\n\nEsta ação NÃO pode ser revertida!`)) {
            return;
        }

        try {
            await fetchClient(`/users/${userId}/permanent-delete`, {
                method: 'DELETE',
            });

            alert('Utilizador removido permanentemente');
            loadUsers();
        } catch (error) {
            alert('Erro ao remover utilizador');
        }
    }

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && user.active) ||
            (filterStatus === 'inactive' && !user.active) ||
            (filterStatus === 'pending' && user.invite_token !== null);
        return matchesSearch && matchesRole && matchesStatus;
    });

    function getRoleBadgeColor(role: string) {
        if (role === 'admin') return 'bg-red-100 text-red-800';
        if (role === 'gestor') return 'bg-blue-100 text-blue-800';
        return 'bg-green-100 text-green-800';
    }

    function getStatusBadge(user: User) {
        if (user.invite_token) {
            return <Badge className="bg-yellow-100 text-yellow-800">⏳ Convite Pendente</Badge>;
        }
        if (user.active) {
            return <Badge className="bg-green-100 text-green-800">✅ Ativo</Badge>;
        }
        return <Badge className="bg-red-100 text-red-800">❌ Inativo</Badge>;
    }

    function formatLastLogin(lastLogin: string | null) {
        if (!lastLogin) return 'Nunca';
        const date = new Date(lastLogin);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return 'Há alguns minutos';
        if (diffHours < 24) return `Há ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `Há ${diffDays} dias`;
        return date.toLocaleDateString('pt-PT');
    }

    return (
        <ProtectedRoute permission="USERS_VIEW">
            <AppLayout>
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestão de Utilizadores</h1>
                            <p className="text-gray-600 mt-1">Gerir utilizadores e permissões do restaurante</p>
                        </div>

                        <Button className="gap-2" onClick={() => setInviteModalOpen(true)}>
                            <UserPlus className="h-4 w-4" />
                            Convidar Utilizador
                        </Button>
                    </div>

                    {/* Invite Modal */}
                    <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>✉️ Convidar Novo Utilizador</DialogTitle>
                                <DialogDescription>
                                    Enviar convite por email para novo membro da equipa
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <Label htmlFor="nome">Nome Completo *</Label>
                                    <Input
                                        id="nome"
                                        value={inviteForm.nome}
                                        onChange={(e) => setInviteForm({ ...inviteForm, nome: e.target.value })}
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        placeholder="joao@example.com"
                                    />
                                </div>
                                <div>
                                    <Label>Role *</Label>
                                    <div className="space-y-2 mt-2">
                                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="admin"
                                                checked={inviteForm.role === 'admin'}
                                                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-medium">Administrador</div>
                                                <div className="text-sm text-gray-500">Acesso total ao sistema</div>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="gestor"
                                                checked={inviteForm.role === 'gestor'}
                                                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-medium">Gestor</div>
                                                <div className="text-sm text-gray-500">Gestão completa exceto utilizadores</div>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="role"
                                                value="operador"
                                                checked={inviteForm.role === 'operador'}
                                                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-medium">Operador</div>
                                                <div className="text-sm text-gray-500">Receitas, menus e inventário</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" onClick={() => setInviteModalOpen(false)} className="flex-1">
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleInviteUser}
                                        disabled={inviteLoading || !inviteForm.nome || !inviteForm.email}
                                        className="flex-1"
                                    >
                                        {inviteLoading ? 'A enviar...' : 'Enviar Convite →'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Filters */}
                    <Card className="p-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Pesquisar por nome ou email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                <option value="all">Todos os Roles</option>
                                <option value="admin">Admin</option>
                                <option value="gestor">Gestor</option>
                                <option value="operador">Operador</option>
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="active">Ativos</option>
                                <option value="inactive">Inativos</option>
                                <option value="pending">Pendentes</option>
                            </select>
                        </div>
                    </Card>

                    {/* Table */}
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilizador</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verificado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Acesso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                A carregar...
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center">
                                                <div className="text-gray-400">
                                                    <UserPlus className="h-12 w-12 mx-auto mb-4" />
                                                    <p className="text-lg font-medium text-gray-900">Nenhum utilizador encontrado</p>
                                                    <p className="text-sm text-gray-500 mt-1">Ajuste os filtros ou convide novos utilizadores</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">
                                                            {user.nome.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="font-medium text-gray-900">{user.nome}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <Badge className={getRoleBadgeColor(user.role)}>
                                                        {user.role === 'admin' ? '🔴 Admin' : user.role === 'gestor' ? '🔵 Gestor' : '🟢 Operador'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">{getStatusBadge(user)}</td>
                                                <td className="px-6 py-4">
                                                    {user.email_verified ? (
                                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-yellow-600" />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-sm">{formatLastLogin(user.last_login)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingUser(user);
                                                                setNewRole(user.role);
                                                                setEditModalOpen(true);
                                                            }}
                                                            title="Editar Role"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {!user.email_verified && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleResendInvite(user.id)}
                                                                title="Reenviar Convite"
                                                            >
                                                                <Mail className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {user.active ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleToggleActive(user.id, user.active)}
                                                                title="Desativar Utilizador"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleToggleActive(user.id, user.active)}
                                                                    title="Reativar Utilizador"
                                                                >
                                                                    <RotateCcw className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteUser(user.id, user.nome)}
                                                                    title="Remover Permanentemente"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Edit Role Modal */}
                    <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>✏️ Editar Utilizador</DialogTitle>
                                <DialogDescription>Alterar role e permissões</DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                                <div className="space-y-4 pt-4">
                                    <div>
                                        <Label>Nome:</Label>
                                        <p className="font-medium">{editingUser.nome}</p>
                                    </div>
                                    <div>
                                        <Label>Email:</Label>
                                        <p className="font-medium">{editingUser.email}</p>
                                    </div>
                                    <div>
                                        <Label>Role Atual:</Label>
                                        <p className="font-medium capitalize">{editingUser.role}</p>
                                    </div>
                                    <div>
                                        <Label htmlFor="newRole">Alterar Role para:</Label>
                                        <select
                                            id="newRole"
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg mt-2"
                                        >
                                            <option value="admin">Administrador</option>
                                            <option value="gestor">Gestor</option>
                                            <option value="operador">Operador</option>
                                        </select>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-sm text-yellow-800">
                                            ⚠️ O utilizador será notificado da mudança de permissões
                                        </p>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button variant="outline" onClick={() => setEditModalOpen(false)} className="flex-1">
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={() => handleChangeRole(editingUser.id, newRole)}
                                            disabled={newRole === editingUser.role}
                                            className="flex-1"
                                        >
                                            Guardar Alterações
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </AppLayout>
        </ProtectedRoute >
    );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight } from "lucide-react";

interface Tenant {
    id: number;
    nome_restaurante: string;
    slug: string;
}

interface TenantSelectorProps {
    tenants: Tenant[];
    onSelect: (tenantId: number) => void;
    loading?: boolean;
}

export function TenantSelector({ tenants, onSelect, loading = false }: TenantSelectorProps) {
    const [selectedTenant, setSelectedTenant] = useState<number | null>(
        tenants.length === 1 ? tenants[0].id : null
    );

    const handleSelect = (tenantId: number) => {
        setSelectedTenant(tenantId);
    };

    const handleContinue = () => {
        if (selectedTenant) {
            onSelect(selectedTenant);
        }
    };

    return (
        <div className="w-full max-w-md space-y-6">
            <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                        <Building2 className="h-8 w-8 text-orange-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Escolha um Restaurante
                </h2>
                <p className="text-gray-600">
                    Tem acesso a {tenants.length} {tenants.length === 1 ? "restaurante" : "restaurantes"}.
                    Selecione qual deseja aceder.
                </p>
            </div>

            <div className="space-y-3">
                {tenants.map((tenant) => (
                    <button
                        key={tenant.id}
                        onClick={() => handleSelect(tenant.id)}
                        className={`
                            w-full p-4 rounded-lg border-2 transition-all duration-200
                            flex items-center justify-between group
                            ${selectedTenant === tenant.id
                                ? "border-orange-500 bg-orange-50 shadow-md"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                            }
                        `}
                        type="button"
                    >
                        <div className="flex items-center space-x-3">
                            <div
                                className={`
                                    p-2 rounded-lg transition-colors
                                    ${selectedTenant === tenant.id
                                        ? "bg-orange-100"
                                        : "bg-gray-100 group-hover:bg-gray-200"
                                    }
                                `}
                            >
                                <Building2
                                    className={`
                                        h-5 w-5
                                        ${selectedTenant === tenant.id ? "text-orange-600" : "text-gray-600"}
                                    `}
                                />
                            </div>
                            <div className="text-left">
                                <div
                                    className={`
                                        font-semibold
                                        ${selectedTenant === tenant.id ? "text-orange-900" : "text-gray-900"}
                                    `}
                                >
                                    {tenant.nome_restaurante}
                                </div>
                                <div className="text-sm text-gray-500">@{tenant.slug}</div>
                            </div>
                        </div>

                        {selectedTenant === tenant.id && (
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500">
                                <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <Button
                onClick={handleContinue}
                disabled={!selectedTenant || loading}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold"
            >
                {loading ? "A carregar..." : "Continuar"}
                {!loading && <ChevronRight className="ml-2 h-5 w-5" />}
            </Button>
        </div>
    );
}

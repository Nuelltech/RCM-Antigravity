"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: LeadData) => void;
    isLoading?: boolean;
}

export interface LeadData {
    name: string;
    email: string;
    business_type: string;
}

export function LeadCaptureModal({ isOpen, onClose, onSubmit, isLoading = false }: LeadCaptureModalProps) {
    const [formData, setFormData] = useState<LeadData>({
        name: "",
        email: "",
        business_type: "",
    });

    const [errors, setErrors] = useState<Partial<LeadData>>({});

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Partial<LeadData> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Nome é obrigatório";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email é obrigatório";
        } else if (!validateEmail(formData.email)) {
            newErrors.email = "Email inválido";
        }

        if (!formData.business_type) {
            newErrors.business_type = "Selecione o tipo de negócio";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
        // Do not reset form here, let the parent handle success/close
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content */}
                <div className="p-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Aceder à Demonstração
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Preencha os seus dados para ver a demonstração completa
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nome */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Nome
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={isLoading}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.name ? "border-red-500" : "border-gray-300"
                                    } disabled:bg-gray-100`}
                                placeholder="João Silva"
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email profissional
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={isLoading}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.email ? "border-red-500" : "border-gray-300"
                                    } disabled:bg-gray-100`}
                                placeholder="joao@restaurante.pt"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                            )}
                        </div>

                        {/* Tipo de Negócio */}
                        <div>
                            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de negócio
                            </label>
                            <select
                                id="businessType"
                                value={formData.business_type}
                                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                                disabled={isLoading}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.business_type ? "border-red-500" : "border-gray-300"
                                    } disabled:bg-gray-100`}
                            >
                                <option value="">Selecione uma opção</option>
                                <option value="restaurante_independente">Restaurante independente</option>
                                <option value="restaurante_fine_dining">Restaurante fine dining</option>
                                <option value="hotel">Hotel</option>
                                <option value="grupo_cadeia">Grupo / Cadeia</option>
                            </select>
                            {errors.business_type && (
                                <p className="text-red-500 text-sm mt-1">{errors.business_type}</p>
                            )}
                        </div>

                        {/* Submit button */}
                        <Button
                            type="submit"
                            size="lg"
                            disabled={isLoading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg disabled:opacity-70"
                        >
                            {isLoading ? "A processar..." : "Aceder à demonstração"}
                        </Button>
                    </form>

                    {/* Trust message */}
                    <p className="text-xs text-gray-500 text-center mt-4">
                        Não criamos contas automáticas. Sem spam.
                    </p>
                </div>
            </div>
        </div>
    );
}

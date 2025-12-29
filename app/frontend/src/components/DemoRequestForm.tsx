"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { leadsService } from "@/services/leads.service";

export interface DemoRequestData {
    name: string;
    email: string;
    restaurant: string;
    locations: string;
    challenge: string;
}

interface DemoRequestFormProps {
    leadId?: number;
}

export function DemoRequestForm({ leadId }: DemoRequestFormProps) {
    const [formData, setFormData] = useState<DemoRequestData>({
        name: "",
        email: "",
        restaurant: "",
        locations: "",
        challenge: "",
    });

    const [errors, setErrors] = useState<Partial<DemoRequestData>>({});
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Partial<DemoRequestData> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Nome é obrigatório";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email é obrigatório";
        } else if (!validateEmail(formData.email)) {
            newErrors.email = "Email inválido";
        }

        if (!formData.restaurant.trim()) {
            newErrors.restaurant = "Nome do restaurante é obrigatório";
        }

        if (!formData.locations) {
            newErrors.locations = "Selecione o número de locais";
        }

        if (!formData.challenge) {
            newErrors.challenge = "Selecione o principal desafio";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        setSubmitError(null);

        try {
            await leadsService.createDemoRequest({
                ...formData,
                lead_id: leadId,
            });

            setSubmitted(true);
            setFormData({ name: "", email: "", restaurant: "", locations: "", challenge: "" });
            setErrors({});
        } catch (error) {
            console.error("Error submitting demo request:", error);
            setSubmitError("Ocorreu um erro ao enviar o pedido. Por favor tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-10 text-center max-w-2xl mx-auto">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Pedido Recebido!
                </h3>
                <p className="text-gray-700 text-lg mb-2">
                    Obrigado pelo seu interesse no RCM.
                </p>
                <p className="text-gray-600">
                    Entraremos em contacto em breve para agendar a sua demonstração personalizada.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
                Demonstração Personalizada
            </h3>
            <p className="text-gray-600 mb-8">
                Queremos entender o seu restaurante para mostrar exatamente como o RCM pode ajudar
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {submitError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                        {submitError}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div>
                        <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome *
                        </label>
                        <input
                            type="text"
                            id="demo-name"
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
                        <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            id="demo-email"
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
                </div>

                {/* Restaurante */}
                <div>
                    <label htmlFor="demo-restaurant" className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurante *
                    </label>
                    <input
                        type="text"
                        id="demo-restaurant"
                        value={formData.restaurant}
                        onChange={(e) => setFormData({ ...formData, restaurant: e.target.value })}
                        disabled={isLoading}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.restaurant ? "border-red-500" : "border-gray-300"
                            } disabled:bg-gray-100`}
                        placeholder="Nome do restaurante"
                    />
                    {errors.restaurant && (
                        <p className="text-red-500 text-sm mt-1">{errors.restaurant}</p>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Nº de locais */}
                    <div>
                        <label htmlFor="demo-locations" className="block text-sm font-medium text-gray-700 mb-1">
                            Nº de locais *
                        </label>
                        <select
                            id="demo-locations"
                            value={formData.locations}
                            onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                            disabled={isLoading}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.locations ? "border-red-500" : "border-gray-300"
                                } disabled:bg-gray-100`}
                        >
                            <option value="">Selecione</option>
                            <option value="1">1</option>
                            <option value="2-5">2-5</option>
                            <option value="+5">+5</option>
                        </select>
                        {errors.locations && (
                            <p className="text-red-500 text-sm mt-1">{errors.locations}</p>
                        )}
                    </div>

                    {/* Principal desafio */}
                    <div>
                        <label htmlFor="demo-challenge" className="block text-sm font-medium text-gray-700 mb-1">
                            Principal desafio *
                        </label>
                        <select
                            id="demo-challenge"
                            value={formData.challenge}
                            onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
                            disabled={isLoading}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${errors.challenge ? "border-red-500" : "border-gray-300"
                                } disabled:bg-gray-100`}
                        >
                            <option value="">Selecione</option>
                            <option value="margens">Margens</option>
                            <option value="compras">Compras</option>
                            <option value="precos">Preços</option>
                            <option value="falta_controlo">Falta de controlo</option>
                        </select>
                        {errors.challenge && (
                            <p className="text-red-500 text-sm mt-1">{errors.challenge}</p>
                        )}
                    </div>
                </div>

                {/* Submit button */}
                <Button
                    type="submit"
                    size="lg"
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg disabled:opacity-70"
                >
                    {isLoading ? "A enviar..." : "Agendar demonstração"}
                </Button>
            </form>
        </div>
    );
}

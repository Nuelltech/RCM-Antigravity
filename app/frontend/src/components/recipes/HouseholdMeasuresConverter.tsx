import React, { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MEASURES = [
    { measure: "1 Chávena (Xícara) de Chá", volume: "240 ml", weight: "120g - 150g (Farinha/Açúcar)" },
    { measure: "1 Colher de Sopa", volume: "15 ml", weight: "15g (Líquidos/Açúcar) / 10g (Farinha)" },
    { measure: "1 Colher de Sobremesa", volume: "10 ml", weight: "10g" },
    { measure: "1 Colher de Chá", volume: "5 ml", weight: "5g" },
    { measure: "1 Colher de Café", volume: "2.5 ml", weight: "2.5g" },
    { measure: "1 Cálice (Vinho do Porto)", volume: "50 ml", weight: "-" },
    { measure: "1 Fio de Azeite/Óleo", volume: "~10 ml", weight: "10g" },
    { measure: "1 Pitada", volume: "-", weight: "1g - 2g" },
    { measure: "1 Ovo (Tamanho M)", volume: "50 ml", weight: "50g" },
];

export function HouseholdMeasuresConverter() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 my-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="p-2 bg-slate-200 rounded-md text-slate-600">
                        <Calculator className="w-4 h-4" />
                    </div>
                    <span>Conversor de Medidas Caseiras de Referência</span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-9 p-0"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle</span>
                </Button>
            </div>

            {isOpen && (
                <div className="mt-4">
                    <div className="rounded-md border bg-white overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-700">Medida Caseira</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Volume (Líquidos)</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Peso (Aprox. Sólidos)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MEASURES.map((item, index) => (
                                    <TableRow key={index} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-700">{item.measure}</TableCell>
                                        <TableCell className="text-slate-600">{item.volume}</TableCell>
                                        <TableCell className="text-slate-600">{item.weight}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 italic">
                        * Nota: Os pesos para ingredientes sólidos variam muito consoante a densidade (ex: farinha vs açúcar). Esta tabela serve apenas como guia de aproximação para a concepção das Fichas Técnicas.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Export Button Component with PDF Download
 * Generates PDF on demand when user clicks
 */

'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExportButtonProps {
    pdfDocument: React.ReactElement;
    fileName: string;
    disabled?: boolean;
}

export function ExportButton({ pdfDocument, fileName, disabled = false }: ExportButtonProps) {
    const [isClient, setIsClient] = useState(false);
    const [shouldGenerate, setShouldGenerate] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <Button variant="outline" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
            </Button>
        );
    }

    if (!shouldGenerate) {
        return (
            <Button
                variant="outline"
                onClick={() => setShouldGenerate(true)}
                disabled={disabled}
            >
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
            </Button>
        );
    }

    // When shouldGenerate is true, we mount the PDF engine
    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShouldGenerate(false)}>
                Cancelar
            </Button>

            <PDFDownloadLink
                document={pdfDocument}
                fileName={`${fileName}.pdf`}
                className="no-underline"
            >
                {({ loading, error }) => {
                    if (loading) {
                        return (
                            <Button variant="default" disabled>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Gerando PDF...
                            </Button>
                        );
                    }
                    if (error) {
                        console.error('[PDF Export] Error inside link:', error);
                        return (
                            <Button variant="destructive">
                                Erro ao Gerar
                            </Button>
                        );
                    }
                    return (
                        <Button variant="default">
                            <Download className="w-4 h-4 mr-2" />
                            Baixar Agora
                        </Button>
                    );
                }}
            </PDFDownloadLink>
        </div>
    );
}

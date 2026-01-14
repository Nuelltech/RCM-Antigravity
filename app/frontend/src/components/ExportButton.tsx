/**
 * Export Button Component with PDF Download
 * Generates PDF on demand when user clicks
 */

'use client';

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ExportButtonProps {
    pdfDocument: React.ReactElement;
    fileName: string;
    disabled?: boolean;
}

export function ExportButton({ pdfDocument, fileName, disabled = false }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await pdf(pdfDocument).toBlob();
            saveAs(blob, `${fileName}.pdf`);
        } catch (error) {
            console.error('[PDF Export] Error generating PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={disabled || isExporting}
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando PDF...
                </>
            ) : (
                <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                </>
            )}
        </Button>
    );
}

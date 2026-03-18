/**
 * Export Button Component with PDF Download
 * Generates PDF on demand when user clicks
 */

'use client';

import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface ExportButtonProps {
    pdfDocument: React.ReactElement;
    fileName: string;
    disabled?: boolean;
}

export function ExportButton({ pdfDocument, fileName, disabled = false }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (message: string, type: 'info' | 'success' | 'error', duration = 4000) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, type });
        toastTimer.current = setTimeout(() => setToast(null), duration);
    };

    useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

    const handleExport = async () => {
        setIsExporting(true);
        showToast('📄 A gerar relatório em background... O download iniciará automaticamente.', 'info', 15000);
        try {
            const blob = await pdf(pdfDocument).toBlob();
            saveAs(blob, `${fileName}.pdf`);
            showToast('✅ Relatório gerado com sucesso!', 'success', 3000);
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : (error === null ? 'null thrown' : error === undefined ? 'undefined thrown' : String(error));
            const errStack = error instanceof Error ? error.stack : 'no stack';
            console.error('[PDF Export] Error generating PDF:', errMsg);
            console.error('[PDF Export] Stack:', errStack);
            if (error != null && typeof error === 'object') {
                console.error('[PDF Export] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            }
            showToast('❌ Erro ao gerar o relatório. Ver consola para detalhes.', 'error', 5000);
        } finally {
            setIsExporting(false);
        }
    };

    const toastColors = {
        info: 'bg-blue-600',
        success: 'bg-green-600',
        error: 'bg-red-600',
    };

    return (
        <>
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

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${toastColors[toast.type]}`}
                    style={{ maxWidth: '420px' }}
                >
                    {toast.type === 'info' && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
                    <span>{toast.message}</span>
                </div>
            )}
        </>
    );
}

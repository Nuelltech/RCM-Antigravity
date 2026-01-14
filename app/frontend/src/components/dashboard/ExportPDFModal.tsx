"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2 } from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

interface ExportPDFModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pdfDocument: React.ReactElement;
    fileName: string;
}

export function ExportPDFModal({ open, onOpenChange, pdfDocument, fileName }: ExportPDFModalProps) {
    const [comments, setComments] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // Clone the PDF document and inject comments if provided
            const pdfWithComments = comments.trim()
                ? { ...pdfDocument, props: { ...pdfDocument.props, conclusions: comments } }
                : pdfDocument;

            const blob = await pdf(pdfWithComments).toBlob();
            saveAs(blob, `${fileName}.pdf`);

            // Close modal and reset
            onOpenChange(false);
            setComments('');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Exportar Dashboard - PDF</DialogTitle>
                    <DialogDescription>
                        Adicione comentários ou observações para incluir no relatório (opcional).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="comments">
                            Comentário do Gestor
                        </Label>
                        <Textarea
                            id="comments"
                            placeholder="Escreva aqui as observações, análises ou conclusões para incluir no PDF exportado..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Este comentário aparecerá na seção "Conclusões e Notas" do relatório PDF.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isExporting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exportando...
                            </>
                        ) : (
                            <>
                                <FileDown className="mr-2 h-4 w-4" />
                                Exportar PDF
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

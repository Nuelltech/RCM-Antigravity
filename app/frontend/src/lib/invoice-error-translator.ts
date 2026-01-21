/**
 * Traduz mensagens de erro técnicas do backend para mensagens user-friendly
 * com instruções claras sobre o que fazer
 */

interface ErrorTranslation {
    title: string;
    message: string;
    action: 'retry' | 'delete' | 'contact' | 'wait';
    actionLabel: string;
}

export function translateInvoiceError(backendError: string | null): ErrorTranslation {
    if (!backendError) {
        return {
            title: 'Erro Desconhecido',
            message: 'Ocorreu um erro ao processar a fatura. Por favor, tente enviar novamente.',
            action: 'delete',
            actionLabel: 'Eliminar e Tentar Novamente'
        };
    }

    // Gemini API Indisponível
    if (
        backendError.includes('GEMINI_UNAVAILABLE') ||
        backendError.includes('Gemini AI temporariamente indisponível') ||
        backendError.includes('503') ||
        backendError.includes('overloaded')
    ) {
        return {
            title: 'Serviço de IA Temporariamente Indisponível',
            message: 'O serviço de processamento automático está temporariamente indisponível. A fatura será processada automaticamente quando o serviço voltar (normalmente dentro de alguns minutos).',
            action: 'wait',
            actionLabel: 'Aguardar Processamento Automático'
        };
    }

    // API Key Inválida (configuração)
    if (
        backendError.includes('API key not valid') ||
        backendError.includes('API_KEY_INVALID')
    ) {
        return {
            title: 'Erro de Configuração',
            message: 'Há um problema com a configuração do sistema. Por favor, contacte o suporte técnico.',
            action: 'contact',
            actionLabel: 'Contactar Suporte'
        };
    }

    // Rate Limit / Quota Exceeded
    if (
        backendError.includes('rate limit') ||
        backendError.includes('quota exceeded') ||
        backendError.includes('429')
    ) {
        return {
            title: 'Limite de Processamento Atingido',
            message: 'Foi atingido o limite temporário de processamento. Por favor, aguarde alguns minutos e tente novamente.',
            action: 'retry',
            actionLabel: 'Tentar Novamente Mais Tarde'
        };
    }

    // OCR Failed
    if (
        backendError.includes('OCR failed') ||
        backendError.includes('Failed to extract text')
    ) {
        return {
            title: 'Não Foi Possível Ler a Fatura',
            message: 'A qualidade da imagem/PDF não permite a leitura automática. Por favor, envie uma imagem mais clara ou digitalize com melhor qualidade.',
            action: 'delete',
            actionLabel: 'Enviar Fatura de Melhor Qualidade'
        };
    }

    // File too large
    if (backendError.includes('file too large') || backendError.includes('size limit')) {
        return {
            title: 'Ficheiro Demasiado Grande',
            message: 'O ficheiro excede o tamanho máximo permitido. Por favor, comprima a imagem ou reduza o tamanho do PDF.',
            action: 'delete',
            actionLabel: 'Enviar Ficheiro Mais Pequeno'
        };
    }

    // Invalid file format
    if (
        backendError.includes('invalid format') ||
        backendError.includes('unsupported file')
    ) {
        return {
            title: 'Formato de Ficheiro Não Suportado',
            message: 'Por favor, envie a fatura em formato PDF, JPG ou PNG.',
            action: 'delete',
            actionLabel: 'Enviar Ficheiro Válido'
        };
    }

    // Parsing/Validation errors
    if (
        backendError.includes('validation failed') ||
        backendError.includes('invalid invoice data')
    ) {
        return {
            title: 'Dados da Fatura Inválidos',
            message: 'A fatura não contém dados válidos ou está num formato não reconhecido. Por favor, verifique se a fatura está completa e legível.',
            action: 'delete',
            actionLabel: 'Verificar e Reenviar Fatura'
        };
    }

    // Network/Timeout errors
    if (
        backendError.includes('timeout') ||
        backendError.includes('network error') ||
        backendError.includes('ECONNREFUSED')
    ) {
        return {
            title: 'Erro de Conexão',
            message: 'Houve um problema de conexão durante o processamento. Por favor, tente novamente.',
            action: 'retry',
            actionLabel: 'Tentar Novamente'
        };
    }

    // Generic fallback
    return {
        title: 'Erro ao Processar Fatura',
        message: `Ocorreu um erro inesperado: ${backendError}. Por favor, tente enviar a fatura novamente ou contacte o suporte se o problema persistir.`,
        action: 'delete',
        actionLabel: 'Eliminar e Tentar Novamente'
    };
}

/**
 * Retorna a cor do alert baseado no tipo de ação
 */
export function getErrorAlertVariant(action: ErrorTranslation['action']): 'destructive' | 'default' {
    // 'wait' é menos grave (sistema vai resolver)
    if (action === 'wait') return 'default';
    // Outros erros são mais graves
    return 'destructive';
}

import { ParsedInvoice, InvoiceLineItem, InvoiceHeader } from './gemini-parser.service';

/**
 * Validation result interface
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Invoice Validation Service
 * 
 * Multi-layer validation:
 * 1. Format validation (descriptions, prices, quantities)
 * 2. Mathematical validation (totalSemIva + totalIva = totalComIva)
 * 3. Business rules (IVA rates, reasonable values)
 * 
 * Prevents garbage data like:
 * - Descriptions: "Inf", phone numbers, addresses
 * - Prices: 0, negative, or absurd values
 * - Math errors: totalSemIva + totalIva ≠ totalComIva
 */
export class InvoiceValidationService {

    // Portugal IVA rates
    private readonly VALID_IVA_RATES = [0.00, 0.06, 0.13, 0.23];

    // Thresholds
    private readonly MAX_QUANTITY = 10000;
    private readonly MIN_DESCRIPTION_LENGTH = 3;
    private readonly MATH_TOLERANCE = 0.02;  // €0.02 tolerance for rounding
    private readonly LINE_SUM_TOLERANCE = 0.50;  // €0.50 tolerance for line items sum

    /**
     * Validate single line item format
     */
    validateLineItem(item: InvoiceLineItem, index: number): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Description validation
        if (!item.descricaoOriginal || item.descricaoOriginal.trim().length < this.MIN_DESCRIPTION_LENGTH) {
            errors.push(`Line ${index}: Description too short ("${item.descricaoOriginal}")`);
        }

        // Detect phone numbers as description
        if (item.descricaoOriginal && /^\d{9,15}$/.test(item.descricaoOriginal.trim())) {
            errors.push(`Line ${index}: Description appears to be a phone number`);
        }

        // Detect common garbage patterns
        const garbagePatterns = [
            /praias/i,
            /Devolusão/i,
            /teletônicos/i,
            /accesses/i,
            /^\s*inf\s*$/i,  // Just "Inf"
            /^\s*tel\s*$/i,  // Just "Tel"
        ];

        if (item.descricaoOriginal && garbagePatterns.some(pattern => pattern.test(item.descricaoOriginal))) {
            errors.push(`Line ${index}: Description contains suspicious text ("${item.descricaoOriginal}")`);
        }

        // 2. Price validation
        if (item.precoUnitario === undefined || item.precoUnitario === null) {
            errors.push(`Line ${index}: Missing price`);
        } else if (item.precoUnitario <= 0) {
            errors.push(`Line ${index}: Invalid price (${item.precoUnitario})`);
        } else if (item.precoUnitario > 100000) {
            warnings.push(`Line ${index}: Very high price (${item.precoUnitario}€) - please verify`);
        }

        // 3. Quantity validation
        if (item.quantidade === undefined || item.quantidade === null) {
            errors.push(`Line ${index}: Missing quantity`);
        } else if (item.quantidade <= 0) {
            errors.push(`Line ${index}: Invalid quantity (${item.quantidade})`);
        } else if (item.quantidade > this.MAX_QUANTITY) {
            warnings.push(`Line ${index}: Very high quantity (${item.quantidade}) - please verify`);
        }

        // 4. Total calculation check (if present)
        if (item.precoTotal !== undefined && item.precoUnitario && item.quantidade) {
            const calculatedTotal = item.precoUnitario * item.quantidade;
            const diff = Math.abs(calculatedTotal - item.precoTotal);

            if (diff > 0.02) {
                // Check if this could be a discount scenario
                // If we have original price and discount info, skip this check
                if (item.precoUnitarioOriginal && item.descontoPercentual) {
                    // Has discount info - verify consistency
                    const expectedDiscount = item.precoUnitarioOriginal * (item.descontoPercentual / 100);
                    const expectedFinal = item.precoUnitarioOriginal - expectedDiscount;
                    const priceDiff = Math.abs(item.precoUnitario - expectedFinal);

                    if (priceDiff > 0.02) {
                        warnings.push(
                            `Line ${index}: Discount calculation mismatch - ` +
                            `${item.precoUnitarioOriginal}€ - ${item.descontoPercentual}% should be ${expectedFinal.toFixed(2)}€ ` +
                            `but got ${item.precoUnitario}€`
                        );
                    }
                } else {
                    // No discount info provided - check if it looks like a discount pattern
                    const ratio = item.precoTotal / calculatedTotal;

                    if (ratio >= 0.70 && ratio <= 0.95) {
                        // Looks like a discount (15-30% off)
                        const impliedDiscount = ((1 - ratio) * 100).toFixed(1);
                        warnings.push(
                            `Line ${index}: Possible discount detected (~${impliedDiscount}%) - ` +
                            `${item.quantidade} × ${item.precoUnitario} = ${calculatedTotal.toFixed(2)} ` +
                            `but got ${item.precoTotal.toFixed(2)}. Consider extracting discount explicitly.`
                        );
                    } else {
                        // Not a discount pattern - this is an error
                        errors.push(
                            `Line ${index}: Total mismatch - ` +
                            `${item.quantidade} × ${item.precoUnitario} = ${calculatedTotal.toFixed(2)} ` +
                            `but got ${item.precoTotal.toFixed(2)}`
                        );
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate invoice mathematics
     */
    validateMath(invoice: ParsedInvoice): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        const header = invoice.header;
        const items = invoice.lineItems;

        // Skip if no items (empty invoice)
        if (!items || items.length === 0) {
            return { valid: true, errors: [], warnings: [] };
        }

        // 1. Line items sum should match totalSemIva
        // IMPORTANT: Use precoTotal from each line (already accounts for discounts)
        // NOT quantidade × precoUnitario (which may be wrong if discounts present)

        // Calculate tolerance: 1% of total or 2.00€ minimum (whichever is greater)
        const tolerance = Math.max(2.00, (header.totalSemIva || 0) * 0.01);

        // Sum lines
        const sumLines = items.reduce((sum, item) => sum + (item.precoTotal || 0), 0);

        const netDiff = Math.abs(sumLines - (header.totalSemIva || 0));

        if (netDiff > tolerance) {
            errors.push(`Line items sum (${sumLines.toFixed(2)}€) differs significantly from totalSemIva (${(header.totalSemIva || 0).toFixed(2)}€) by ${netDiff.toFixed(2)}€ (tolerance: ${tolerance.toFixed(2)}€)`);
        } else if (netDiff > 0.05) {
            warnings.push(`Small discrepancy in line totals: ${netDiff.toFixed(2)}€ (within tolerance of ${tolerance.toFixed(2)}€)`);
        }

        // 2. totalSemIva + totalIva should equal totalComIva
        if (header.totalSemIva !== undefined && header.totalIva !== undefined && header.totalComIva !== undefined) {
            const calculatedTotal = header.totalSemIva + header.totalIva;
            const totalDiff = Math.abs(calculatedTotal - header.totalComIva);

            if (totalDiff > this.MATH_TOLERANCE) {
                errors.push(
                    `TotalSemIva (${header.totalSemIva.toFixed(2)}€) + TotalIva (${header.totalIva.toFixed(2)}€) ` +
                    `= ${calculatedTotal.toFixed(2)}€ but totalComIva is ${header.totalComIva.toFixed(2)}€ ` +
                    `(difference: ${totalDiff.toFixed(2)}€)`
                );
            }
        }

        // 3. totalComIva should be greater than any single line item
        if (header.totalComIva !== undefined) {
            const maxLineTotal = Math.max(...items.map(item =>
                (item.precoUnitario || 0) * (item.quantidade || 0)
            ));

            if (header.totalComIva < maxLineTotal - 0.01) {
                errors.push(
                    `TotalComIva (${header.totalComIva.toFixed(2)}€) is less than largest line item ` +
                    `(${maxLineTotal.toFixed(2)}€)`
                );
            }
        }

        // 4. IVA rate reasonable check
        if (header.totalIva !== undefined && header.totalSemIva !== undefined && header.totalIva > 0) {
            const ivaRate = header.totalIva / header.totalSemIva;

            // Check if close to any valid rate
            const closeToValidRate = this.VALID_IVA_RATES.some(validRate =>
                Math.abs(ivaRate - validRate) < 0.02
            );

            if (!closeToValidRate) {
                warnings.push(
                    `Unusual IVA rate: ${(ivaRate * 100).toFixed(1)}% ` +
                    `(expected: ${this.VALID_IVA_RATES.map(r => r * 100).join('%, ')}%)`
                );
            }
        }

        // 5. Totals should be positive
        if (header.totalComIva !== undefined && header.totalComIva <= 0) {
            errors.push(`TotalComIva must be positive (got ${header.totalComIva}€)`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Full invoice validation (format + math)
     */
    validate(invoice: ParsedInvoice): ValidationResult {
        const allErrors: string[] = [];
        const allWarnings: string[] = [];

        // Validate each line item
        invoice.lineItems.forEach((item, index) => {
            const lineValidation = this.validateLineItem(item, index + 1);
            allErrors.push(...lineValidation.errors);
            allWarnings.push(...lineValidation.warnings);
        });

        // Validate mathematics
        const mathValidation = this.validateMath(invoice);
        allErrors.push(...mathValidation.errors);
        allWarnings.push(...mathValidation.warnings);

        return {
            valid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings
        };
    }
}

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required feature
 */
export const FEATURE_KEY = 'required_feature';

/**
 * Decorator to protect routes based on subscription features
 * 
 * Usage:
 * ``` typescript
 * @RequiresFeature('sales')
 * @Post('import')
 * async importSales() { ... }
 * ```
 * 
 * @param feature - Feature key from feature_catalog table
 */
export const RequiresFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

// lib/airtable-fifo.ts
// FIFO Inventory Management with Batch Tracking

import Airtable from 'airtable';

const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.error('Missing Airtable credentials');
}

const base = new Airtable({ apiKey }).base(baseId!);

export const tables = {
  rawMaterials: base(process.env.NEXT_PUBLIC_TABLE_RAW_MATERIALS || 'Raw Materials'),
  finishedProducts: base(process.env.NEXT_PUBLIC_TABLE_FINISHED_PRODUCTS || 'Finished Products'),
  recipes: base(process.env.NEXT_PUBLIC_TABLE_RECIPES || 'Recipes'),
  transactions: base(process.env.NEXT_PUBLIC_TABLE_TRANSACTIONS || 'Transactions'),
  materialBatches: base('Material Batches'),
};

// Types
export interface RawMaterial {
  id: string;
  fields: {
    'Material ID': string;
    'Material Name': string;
    'Barcode'?: string;
    'Unit': string;
    'Current Stock'?: number;
    'Unit Cost AVG'?: number;
    'Minimum Stock'?: number;
    'Low Stock Alert'?: string;
    'Supplier'?: string;
  };
}

export interface MaterialBatch {
  id: string;
  fields: {
    'Batch ID'?: number;
    'Raw Material': string[];
    'Material Name'?: string[];
    'Received Date': string;
    'Initial Quantity': number;
    'Current Quantity'?: number;
    'Unit Cost': number;
    'Batch Value'?: number;
    'Unit'?: string[];
    'Supplier'?: string;
    'Lot Number'?: string;
    'Expiry Date'?: string;
    'Status'?: string;
    'Notes'?: string;
  };
}

export interface FinishedProduct {
  id: string;
  fields: {
    'Product ID': string;
    'Product Name': string;
    'Barcode'?: string;
    'Current Stock'?: number;
    'Unit Cost'?: number;
    'Selling Price'?: number;
    'Recipe Items'?: string[];
  };
}

export interface Recipe {
  id: string;
  fields: {
    'Product': string[];
    'Raw Material': string[];
    'Quantity Needed': number;
    'Recipe Line'?: string;
  };
}

export interface Transaction {
  id?: string;
  fields: {
    'Type': string;
    'Raw Material'?: string[];
    'Finished Product'?: string[];
    'Material Batches'?: string[];
    'Quantity Change': number;
    'User'?: string;
    'Notes'?: string;
    'Barcode Scanned'?: string;
    'Unit Cost'?: number;
  };
}

// ==================== FIFO FUNCTIONS ====================

/**
 * Get active batches for a material in FIFO order (oldest first)
 */
export async function getActiveBatchesFIFO(materialRecordId: string): Promise<MaterialBatch[]> {
  try {
    const records = await tables.materialBatches
      .select({
        sort: [{ field: 'Received Date', direction: 'asc' }],
      })
      .all();

    const batches = records as unknown as MaterialBatch[];

    return batches.filter((batch) => {
      const linked = batch.fields['Raw Material'] || [];
      if (!linked.includes(materialRecordId)) return false;
      const qty = batch.fields['Current Quantity'] ?? batch.fields['Initial Quantity'];
      return qty > 0;
    });
  } catch (error) {
    console.error('Error getting batches:', error);
    return [];
  }
}

/**
 * Create a new batch when receiving raw materials
 */
export async function createMaterialBatch(
  materialRecordId: string,
  quantity: number,
  unitCost: number,
  supplier?: string,
  lotNumber?: string,
  expiryDate?: string
): Promise<{ success: boolean; batchId?: string; error?: string }> {
  try {
    const batch = await tables.materialBatches.create([
      {
        fields: {
          'Raw Material': [materialRecordId],
          'Received Date': new Date().toISOString().split('T')[0],
          'Initial Quantity': quantity,
          'Unit Cost': unitCost,
          ...(supplier ? { 'Supplier': supplier } : {}),
          ...(lotNumber ? { 'Lot Number': lotNumber } : {}),
          ...(expiryDate ? { 'Expiry Date': expiryDate } : {}),
        },
      },
    ]);

    await tables.transactions.create([
      {
        fields: {
          'Type': 'Raw Material IN',
          'Raw Material': [materialRecordId],
          'Material Batches': [batch[0]!.id],
          'Quantity Change': quantity,
          'Notes': `Initial batch - Lot: ${lotNumber || 'N/A'}`,
        },
      },
    ]);

    return { success: true, batchId: batch[0]!.id };
  } catch (error) {
    console.error('Error creating batch:', error);
    return { success: false, error: 'Failed to create batch' };
  }
}

/**
 * Deduct quantity from batches using FIFO
 */
export async function deductFromBatchesFIFO(
  materialRecordId: string,
  quantityNeeded: number,
  user: string,
  notes?: string,
  type: 'Production' | 'Raw Material OUT' = 'Production'
): Promise<{
  success: boolean;
  deductions?: Array<{ batchId: string; quantity: number; cost: number }>;
  totalCost?: number;
  error?: string;
}> {
  try {
    const batches = await getActiveBatchesFIFO(materialRecordId);

    if (batches.length === 0) {
      return { success: false, error: 'No active batches available' };
    }

    let remaining = quantityNeeded;
    const deductions: Array<{ batchId: string; quantity: number; cost: number }> = [];
    let totalCost = 0;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available = batch.fields['Current Quantity'] ?? batch.fields['Initial Quantity'];
      const toDeduct = Math.min(remaining, available);
      const batchCost = batch.fields['Unit Cost'];

      deductions.push({ batchId: batch.id, quantity: toDeduct, cost: batchCost });
      totalCost += toDeduct * batchCost;
      remaining -= toDeduct;

      await tables.transactions.create([
        {
          fields: {
            'Type': type,
            'Raw Material': [materialRecordId],
            'Material Batches': [batch.id],
            'Quantity Change': -toDeduct,
            'Unit Cost': batchCost,
            'User': user,
            'Notes': notes || `FIFO deduction — ${type}`,
          },
        },
      ]);
    }

    if (remaining > 0) {
      return {
        success: false,
        error: `Insufficient stock. Need ${quantityNeeded}, only ${quantityNeeded - remaining} available`,
      };
    }

    return { success: true, deductions, totalCost };
  } catch (error) {
    console.error('Error deducting from batches:', error);
    return { success: false, error: 'Failed to deduct from batches' };
  }
}

/**
 * Remove finished product stock
 */
export async function exitFinishedProduct(
  productRecordId: string,
  quantity: number,
  user: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.transactions.create([
      {
        fields: {
          'Type': 'Finished Product OUT',
          'Finished Product': [productRecordId],
          'Quantity Change': -Math.abs(quantity),
          'User': user,
          ...(notes ? { 'Notes': notes } : {}),
        },
      },
    ]);
    return { success: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('Error exiting finished product:', message);
    return { success: false, error: message };
  }
}

/**
 * Add finished product stock directly (no production process)
 */
export async function enterFinishedProduct(
  productRecordId: string,
  quantity: number,
  user: string,
  unitCost?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.transactions.create([
      {
        fields: {
          'Type': 'Finished Product IN',
          'Finished Product': [productRecordId],
          'Quantity Change': Math.abs(quantity),
          'User': user,
          ...(unitCost ? { 'Unit Cost': unitCost } : {}),
          ...(notes ? { 'Notes': notes } : {}),
        },
      },
    ]);
    return { success: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('Error entering finished product:', message);
    return { success: false, error: message };
  }
}

/**
 * Produce finished product using FIFO for raw materials
 */
export async function produceFinishedProductFIFO(
  productRecordId: string,
  quantity: number,
  user: string,
  recipes: Recipe[]
): Promise<{
  success: boolean;
  totalCost?: number;
  costBreakdown?: Array<{ material: string; cost: number }>;
  error?: string;
}> {
  try {
    let totalProductionCost = 0;
    const costBreakdown: Array<{ material: string; cost: number }> = [];

    for (const recipe of recipes) {
      const materialRecordId = recipe.fields['Raw Material'][0]!;
      const quantityNeeded = recipe.fields['Quantity Needed'] * quantity;

      const result = await deductFromBatchesFIFO(
        materialRecordId,
        quantityNeeded,
        user,
        `Production of ${quantity} units`
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to deduct materials',
        };
      }

      totalProductionCost += result.totalCost || 0;
      costBreakdown.push({
        material: materialRecordId,
        cost: result.totalCost || 0,
      });
    }

    await tables.transactions.create([
      {
        fields: {
          'Type': 'Finished Product IN',
          'Finished Product': [productRecordId],
          'Quantity Change': quantity,
          'Unit Cost': totalProductionCost / quantity,
          'User': user,
          'Notes': `Production - Total cost: €${totalProductionCost.toFixed(2)}`,
        },
      },
    ]);

    return { success: true, totalCost: totalProductionCost, costBreakdown };
  } catch (error) {
    console.error('Error producing product:', error);
    return { success: false, error: 'Production failed' };
  }
}

/**
 * Check if enough stock is available across all batches
 */
export async function checkMaterialAvailability(
  materialRecordId: string,
  quantityNeeded: number
): Promise<{ available: boolean; totalStock: number; shortfall: number }> {
  const batches = await getActiveBatchesFIFO(materialRecordId);

  const totalStock = batches.reduce(
    (sum, batch) =>
      sum + (batch.fields['Current Quantity'] || batch.fields['Initial Quantity']),
    0
  );

  return {
    available: totalStock >= quantityNeeded,
    totalStock,
    shortfall: Math.max(0, quantityNeeded - totalStock),
  };
}

/**
 * Get batch details for cost breakdown display
 */
export async function getBatchCostBreakdown(materialRecordId: string): Promise<
  Array<{
    batchId: string;
    receivedDate: string;
    quantity: number;
    unitCost: number;
    supplier?: string;
    lotNumber?: string;
  }>
> {
  const batches = await getActiveBatchesFIFO(materialRecordId);

  return batches.map((batch) => ({
    batchId: batch.id,
    receivedDate: batch.fields['Received Date'],
    quantity: batch.fields['Current Quantity'] || batch.fields['Initial Quantity'],
    unitCost: batch.fields['Unit Cost'],
    supplier: batch.fields['Supplier'],
    lotNumber: batch.fields['Lot Number'],
  }));
}

// Re-export all non-FIFO functions from airtable.ts
export {
  findMaterialByBarcode,
  findProductByBarcode,
  getAllRawMaterials,
  getAllFinishedProducts,
  getRecipesForProduct,
  getRecentTransactions,
  getLowStockMaterials,
  addRawMaterialStock,
  removeRawMaterialStock,
  createTransaction,
  produceFinishedProduct,
  getAllRecipes,
  createRawMaterial,
  updateRawMaterial,
  createFinishedProduct,
  updateFinishedProduct,
  createRecipe,
  deleteRecipe,
} from './airtable';

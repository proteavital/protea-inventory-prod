// lib/airtable.ts
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

export interface FinishedProduct {
  id: string;
  fields: {
    'Product ID': string;
    'Product Name': string;
    'Barcode'?: string;
    'Current Stock'?: number;
    'Unit Cost AVG'?: number;
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
    'Quantity Change': number;
    'User'?: string;
    'Notes'?: string;
    'Unit Cost AVG'?: number;
  };
}

// API Functions

export async function findMaterialByBarcode(barcode: string): Promise<RawMaterial | null> {
  try {
    const records = await tables.rawMaterials
      .select({
        filterByFormula: `{Barcode} = '${barcode}'`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0 ? (records[0] as unknown as RawMaterial) : null;
  } catch (error) {
    console.error('Error finding material:', error);
    return null;
  }
}

export async function findProductByBarcode(barcode: string): Promise<FinishedProduct | null> {
  try {
    const records = await tables.finishedProducts
      .select({
        filterByFormula: `{Barcode} = '${barcode}'`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0 ? (records[0] as unknown as FinishedProduct) : null;
  } catch (error) {
    console.error('Error finding product:', error);
    return null;
  }
}

export async function getAllRawMaterials(): Promise<RawMaterial[]> {
  try {
    const records = await tables.rawMaterials
      .select({
        sort: [{ field: 'Material Name', direction: 'asc' }],
      })
      .all();

    return records as unknown as RawMaterial[];
  } catch (error) {
    console.error('Error getting materials:', error);
    return [];
  }
}

export async function getAllFinishedProducts(): Promise<FinishedProduct[]> {
  try {
    const records = await tables.finishedProducts
      .select({
        sort: [{ field: 'Product Name', direction: 'asc' }],
      })
      .all();

    return records as unknown as FinishedProduct[];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
}

export async function getRecipesForProduct(productId: string): Promise<Recipe[]> {
  try {
    const records = await tables.recipes.select().all();
    const recipes = records as unknown as Recipe[];
    return recipes.filter((r) => r.fields['Product']?.includes(productId));
  } catch (error) {
    console.error('Error getting recipes:', error);
    return [];
  }
}

export async function createTransaction(transaction: Transaction): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.transactions.create([transaction]);
    return { success: true };
  } catch (error: any) {
    const message = error?.message || String(error);
    console.error('Error creating transaction:', message);
    return { success: false, error: message };
  }
}

export async function addRawMaterialStock(
  materialId: string,
  quantity: number,
  user: string
): Promise<{ success: boolean; error?: string }> {
  const transaction: Transaction = {
    fields: {
      'Type': 'Raw Material IN',
      'Raw Material': [materialId],
      'Quantity Change': Math.abs(quantity),
      'User': user,
    },
  };

  return createTransaction(transaction);
}

export async function removeRawMaterialStock(
  materialId: string,
  quantity: number,
  user: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const transaction: Transaction = {
    fields: {
      'Type': 'Raw Material OUT',
      'Raw Material': [materialId],
      'Quantity Change': -Math.abs(quantity),
      'User': user,
      ...(notes ? { 'Notes': notes } : {}),
    },
  };

  return createTransaction(transaction);
}

export async function produceFinishedProduct(
  productRecordId: string,
  quantity: number,
  user: string,
  recipes: Recipe[],
  rawMaterials: RawMaterial[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const materialTransactions: Transaction[] = recipes.map((recipe) => {
      const quantityNeeded = recipe.fields['Quantity Needed'] * quantity;
      return {
        fields: {
          'Type': 'Production',
          'Raw Material': recipe.fields['Raw Material'],
          'Quantity Change': -quantityNeeded,
          'User': user,
          'Notes': `Used for production of ${quantity} units`,
        },
      };
    });

    const productTransaction: Transaction = {
      fields: {
        'Type': 'Finished Product IN',
        'Finished Product': [productRecordId],
        'Quantity Change': quantity,
        'User': user,
        'Notes': 'Production',
      },
    };

    await tables.transactions.create([...materialTransactions, productTransaction]);
    return { success: true };
  } catch (error) {
    console.error('Error producing product:', error);
    return { success: false, error: 'Failed to create production transactions' };
  }
}

export async function getFinishedProductTransactions(): Promise<any[]> {
  try {
    const records = await tables.transactions
      .select({
        filterByFormula: `{Type} = 'Finished Product IN'`,
        sort: [{ field: 'Date', direction: 'asc' }],
      })
      .all();
    return records as any[];
  } catch (error) {
    console.error('Error fetching finished product transactions:', error);
    return [];
  }
}

export async function getRecentTransactions(limit: number = 50): Promise<any[]> {
  try {
    const records = await tables.transactions
      .select({
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: limit,
      })
      .all();

    return records as any[];
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const records = await tables.recipes.select().all();
    return records as unknown as Recipe[];
  } catch (error) {
    console.error('Error getting recipes:', error);
    return [];
  }
}

export async function createRawMaterial(
  fields: Omit<RawMaterial['fields'], 'Current Stock' | 'Low Stock Alert'>
): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.rawMaterials.create([{ fields }]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function updateRawMaterial(
  id: string,
  fields: Partial<RawMaterial['fields']>
): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.rawMaterials.update([{ id, fields }]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function createFinishedProduct(
  fields: Omit<FinishedProduct['fields'], 'Current Stock' | 'Unit Cost AVG'>
): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.finishedProducts.create([{ fields }]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function updateFinishedProduct(
  id: string,
  fields: Partial<FinishedProduct['fields']>
): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.finishedProducts.update([{ id, fields }]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function createRecipe(fields: Recipe['fields']): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.recipes.create([{ fields }]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function deleteRecipe(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await tables.recipes.destroy([id]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function getLowStockMaterials(): Promise<RawMaterial[]> {
  try {
    const records = await tables.rawMaterials
      .select({
        filterByFormula: `{Low Stock Alert} = '🔴 LOW'`,
      })
      .all();

    return records as unknown as RawMaterial[];
  } catch (error) {
    console.error('Error getting low stock materials:', error);
    return [];
  }
}

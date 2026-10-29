import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/db';
import type { StockTransaction, MovementType } from '../types/stock';

export interface RecordMovementInput {
  productId: string;
  type: MovementType;
  quantityChange: number;
  reason?: string | null;
  note?: string | null;
}

/**
 * Records a stock movement and updates product quantity atomically.
 * Throws if movement would result in negative stock (depending on policy).
 */
export async function recordMovement(
  input: RecordMovementInput,
  allowNegative = false,
): Promise<StockTransaction> {
  return await db.transaction('rw', [db.products, db.stockTransactions], async () => {
    const product = await db.products.get(input.productId);
    if (!product) throw new Error(`Product ${input.productId} not found`);

    const previousQuantity = product.quantity;
    const resultingQuantity = previousQuantity + input.quantityChange;

    if (!allowNegative && resultingQuantity < 0) {
      throw new Error(
        `Stock cannot go below zero. Current: ${previousQuantity}, Change: ${input.quantityChange}`,
      );
    }

    const now = new Date();
    const transaction: StockTransaction = {
      id: uuidv4(),
      productId: input.productId,
      type: input.type,
      quantityChange: input.quantityChange,
      previousQuantity,
      resultingQuantity,
      reason: input.reason ?? null,
      note: input.note ?? null,
      createdAt: now,
    };

    await db.stockTransactions.add(transaction);
    await db.products.update(input.productId, {
      quantity: resultingQuantity,
      updatedAt: now,
    });

    return transaction;
  });
}

/**
 * Sets the opening stock for a product.
 * This creates a single 'opening' transaction replacing any prior one.
 */
export async function setOpeningStock(
  productId: string,
  quantity: number,
  note?: string,
): Promise<StockTransaction> {
  return recordMovement(
    {
      productId,
      type: 'opening',
      quantityChange: quantity,
      note: note ?? 'Opening stock',
    },
    true, // allow negative for corrections
  );
}

/**
 * Gets all transactions for a product, newest first.
 */
export async function getTransactionsForProduct(productId: string): Promise<StockTransaction[]> {
  return db.stockTransactions
    .where('productId')
    .equals(productId)
    .reverse()
    .sortBy('createdAt');
}

/**
 * Gets recent transactions across all products.
 */
export async function getRecentTransactions(limit = 50): Promise<StockTransaction[]> {
  return db.stockTransactions.orderBy('createdAt').reverse().limit(limit).toArray();
}

/**
 * Gets all transactions in a date range.
 */
export async function getTransactionsByDateRange(
  from: Date,
  to: Date,
): Promise<StockTransaction[]> {
  return db.stockTransactions
    .where('createdAt')
    .between(from, to, true, true)
    .toArray();
}

/**
 * Counts total stock movements.
 */
export async function countTransactions(): Promise<number> {
  return db.stockTransactions.count();
}

/**
 * Gets a summary of movements grouped by type for a product.
 */
export async function getMovementSummary(
  productId: string,
): Promise<Record<MovementType, number>> {
  const transactions = await db.stockTransactions.where('productId').equals(productId).toArray();
  const summary: Record<MovementType, number> = {
    opening: 0,
    received: 0,
    sale: 0,
    return: 0,
    adjustment: 0,
    damaged: 0,
    correction: 0,
  };
  for (const t of transactions) {
    summary[t.type] += t.quantityChange;
  }
  return summary;
}

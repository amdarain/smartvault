export type MovementType =
  | 'opening'
  | 'received'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'damaged'
  | 'correction';

export interface StockTransaction {
  id: string;
  productId: string;
  type: MovementType;
  quantityChange: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string | null;
  note: string | null;
  createdAt: Date;
}

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  opening: 'Opening Stock',
  received: 'Stock Received',
  sale: 'Sale / Issued',
  return: 'Return',
  adjustment: 'Adjustment',
  damaged: 'Damaged / Lost',
  correction: 'Manual Correction',
};

export const MOVEMENT_COLORS: Record<MovementType, string> = {
  opening: 'blue',
  received: 'green',
  sale: 'orange',
  return: 'teal',
  adjustment: 'purple',
  damaged: 'red',
  correction: 'gray',
};

export type Vegetable = {
  id: string;
  name: string;
  description: string;
  /** Price stored in cents so we never do money math with decimals. */
  priceCents: number;
  unit: string;
  available: boolean;
};

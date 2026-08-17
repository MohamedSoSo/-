/**
 * Payment gateway seam. `mockAdapter` simulates a successful charge so the
 * checkout flow is fully clickable end-to-end today. Wiring a real gateway
 * (Moyasar/HyperPay/Stripe are the common choices for KSA) means implementing
 * this interface and swapping the export in getPaymentAdapter() — no other
 * file in the checkout flow needs to change.
 */

export type PaymentMethod = "card" | "apple_pay" | "cash_on_delivery";

export interface ChargeInput {
  amount: number;
  currency: "SAR";
  method: PaymentMethod;
  orderId: string;
}

export interface ChargeResult {
  success: boolean;
  reference?: string;
  error?: string;
}

export interface PaymentAdapter {
  charge(input: ChargeInput): Promise<ChargeResult>;
}

const mockAdapter: PaymentAdapter = {
  async charge(input) {
    if (input.method === "cash_on_delivery") {
      return { success: true, reference: `COD-${input.orderId.slice(0, 8)}` };
    }
    // simulate gateway round-trip
    await new Promise((r) => setTimeout(r, 900));
    return { success: true, reference: `MOCK-${input.orderId.slice(0, 8)}` };
  },
};

export function getPaymentAdapter(): PaymentAdapter {
  return mockAdapter;
}

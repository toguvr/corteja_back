export class CreateOrderDto {
  amount: number;
  barbershopId: string; // ou um objeto `BarbershopDto` se quiser
  customerId: string; // ou um objeto `CustomerDto`
  cartIds: string[];
  status: 'PENDING' | 'PAID' | 'CANCELLED'; // exemplo de enum
  document?: string;
  phone?: string;
  installments?: string;
  isPix?: boolean;
  card: any;
  constructor(data: Partial<CreateOrderDto>) {
    Object.assign(this, data);
  }
}

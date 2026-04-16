export type PickStatus = 'Deslocando' | 'Aguardando coleta' | 'CONCLUIDO' | 'CANCELADO';

export interface PickItem {
  id: string;
  orderId: string;
  truckId: string;
  timestamp: string;
  area: string;
  zona: string;
  corredor: string;
  compartimento: string;
  nivel: string;
  posicao: string;
  comando: string;
  status: PickStatus;
  productName: string;
  productImage: string;
  sequence: number;
}

export interface Wave {
  id: string;
  name: string;
  picks: PickItem[];
  createdAt: string;
}

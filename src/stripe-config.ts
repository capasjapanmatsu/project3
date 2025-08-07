export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const products: Product[] = [
  {
    id: 'prod_STbyLoouD9odGI',
    priceId: 'price_1RZpDjAHWLDQ7ynZP7zD3TQB',
    name: 'ドッグパークJPサブスク',
    description: '月額3,800円で全国のドッグラン使い放題 + ペットショップ10%OFF',
    mode: 'subscription',
  },
  {
    id: 'prod_SUPYdaPibyt70U',
    priceId: 'price_1Ra8ZvAHWLDQ7ynZQnuailVL',
    name: 'ドッグラン1Dayパス',
    description: 'ドッグラン施設利用1Dayパスです',
    mode: 'payment',
  },
  {
    id: 'prod_facility_rental',
    priceId: 'price_1Ra8awAHWLDQ7ynZvp1jAlPT',
    name: '施設貸し切り',
    description: '施設貸し切り1時間',
    mode: 'payment',
  },
  {
    id: 'prod_shop_item',
    priceId: 'price_1RcGbaAHWLDQ7ynZA0PmtKbS',
    name: 'ペットショップ購入品',
    description: 'ペットショップ商品',
    mode: 'payment',
  }
];
export interface AddToCartReqBody {
  product_id: string
  quantity: number
}

export interface UpdateCartReqBody {
  product_id: string
  quantity: number
}

export interface CreateOrderReqBody {
  payment_method?: 'cod' | 'card' | 'bank_transfer'
  shipping_address?: string
  note?: string
}

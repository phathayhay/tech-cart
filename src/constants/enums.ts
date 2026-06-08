export enum UserVerifyStatus {
  Unverified, // chưa xác thực email, mặc định = 0
  Verified, // đã xác thực email
  Banned // bị khóa
}
export enum USER_ROLE {
  Admin, //0
  Staff, //1
  User //2
}

export enum TokenType {
  AccessToken, //0
  RefreshToken, //1
  ForgotPasswordToken, //2
  EmailVerificationToken //3
}

export enum ProductCategory {
  Laptop = 'Laptop',
  Phone = 'Phone',
  Tablet = 'Tablet',
  Headphone = 'Headphone',
  Watch = 'Watch',
  Accessory = 'Accessory'
}

export enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Confirmed = 'confirmed',
  Shipping = 'shipping',
  Delivered = 'delivered',
  Cancelled = 'cancelled'
}

export enum PaymentMethod {
  COD = 'cod',
  Card = 'card',
  BankTransfer = 'bank_transfer'
}

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  Refunded = 'refunded'
}

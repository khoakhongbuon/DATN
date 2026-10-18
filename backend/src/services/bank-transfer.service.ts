export type BankTransferConfig = {
  configured: boolean
  bankId: string
  bankAccountNumber: string
  bankAccountName: string
  bankName: string
  template: string
}

export type BankTransferQrData = {
  qrCodeUrl: string
  bankId: string
  bankName: string
  accountNumber: string
  accountName: string
  amount: number
  orderCode: string
  transferMemo: string
  instructions: string
}

export function getBankTransferConfig(): BankTransferConfig {
  const bankId = process.env.BANK_ID?.trim() || ''
  const bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim() || ''
  const bankAccountName = process.env.BANK_ACCOUNT_NAME?.trim() || ''
  const bankName = process.env.BANK_NAME?.trim() || bankId
  const template = process.env.VIETQR_TEMPLATE?.trim() || 'compact2'

  const configured = Boolean(bankId && bankAccountNumber && bankAccountName)

  return {
    configured,
    bankId,
    bankAccountNumber,
    bankAccountName,
    bankName,
    template,
  }
}

export function generateVietQrData(params: { amount: number; orderCode: string }): BankTransferQrData | null {
  const config = getBankTransferConfig()
  if (!config.configured) {
    return null
  }

  const memo = params.orderCode
  const encodedAccountName = encodeURIComponent(config.bankAccountName)
  const encodedAddInfo = encodeURIComponent(memo)

  // Standard VietQR image format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png
  const qrCodeUrl = `https://img.vietqr.io/image/${config.bankId}-${config.bankAccountNumber}-${config.template}.png?amount=${params.amount}&addInfo=${encodedAddInfo}&accountName=${encodedAccountName}`

  return {
    qrCodeUrl,
    bankId: config.bankId,
    bankName: config.bankName,
    accountNumber: config.bankAccountNumber,
    accountName: config.bankAccountName,
    amount: params.amount,
    orderCode: params.orderCode,
    transferMemo: memo,
    instructions:
      'Mở ứng dụng Ngân hàng trên điện thoại, chọn Quét mã QR để thanh toán. Vui lòng giữ nguyên số tiền và nội dung chuyển khoản để đơn hàng được đối soát và xử lý nhanh nhất.',
  }
}

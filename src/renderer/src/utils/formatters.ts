export const formatIDR = (amount: number | string) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return '0'
  return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export const unformatIDR = (formattedValue: string) => {
  return formattedValue.replace(/\./g, '')
}

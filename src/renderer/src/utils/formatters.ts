export const formatIDR = (amount: number | string) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return '0'
  return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export const unformatIDR = (formattedValue: string) => {
  if (!formattedValue) return '0'
  const str = formattedValue.toString()
  // Jika mengandung koma, berarti format Indonesia (titik = ribuan, koma = desimal)
  if (str.includes(',')) {
    return str.replace(/\./g, '').replace(/,/g, '.')
  }
  // Jika mengandung titik, cek apakah ini titik ribuan atau desimal JS
  // Titik ribuan biasanya diikuti tepat 3 angka (misal 1.000 atau 1.000.000)
  // Kalau ada lebih dari satu titik, pasti itu ribuan.
  const parts = str.split('.')
  if (parts.length > 2) {
    return str.replace(/\./g, '')
  }
  if (parts.length === 2 && parts[1].length !== 3) {
    // Kalau cuma satu titik dan angka di belakangnya bukan 3 digit, 
    // anggap saja desimal JS (seperti 97280.0000001)
    return str
  }
  return str.replace(/\./g, '')
}

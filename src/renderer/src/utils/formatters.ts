export const formatIDR = (amount: number | string) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(value)) return '0'
  return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export const unformatIDR = (formattedValue: string) => {
  if (!formattedValue) return '0'
  const str = formattedValue.toString().trim()

  // Jika mengandung koma: format Indonesia (titik = ribuan, koma = desimal)
  // Contoh: "1.000,50" → "1000.50"
  if (str.includes(',')) {
    return str.replace(/\./g, '').replace(/,/g, '.')
  }

  // Jika string hanya berisi digit dan titik (tidak ada koma),
  // ini adalah angka format lokal Indonesia → strip semua titik.
  // Contoh: "1.000" → "1000", "10.000" → "10000", "1.000.000" → "1000000"
  // Termasuk saat user sedang mengetik: "1.0000" → "10000"
  if (/^[\d.]+$/.test(str)) {
    return str.replace(/\./g, '')
  }

  return str
}

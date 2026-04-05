export const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

export const getLocalDate = (d = new Date()) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const formatFullDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

export const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2023; // Base start year for the app
  const endYear = currentYear + 20; // 20 years into the future
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
};

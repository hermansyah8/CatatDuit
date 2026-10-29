import { normalizeCategory, isCategoryMatch } from '../src/utils/categories.js'

const availableCategories = [
  'Belanja Bulanan',
  'Susu Kotak',
  'nenda+abah',
  'telor',
  'Gas dan Galon',
  'Transportasi',
]

function parsePesanKeuangan(text, availableCategories = []) {
  if (!text) return null
  const clean = text.trim()
  const lower = clean.toLowerCase()

  let amount = 0
  const matchJt = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i)
  const matchK = clean.match(/(\d+)\s*(?:rb|k|ribu)/i)

  if (matchJt) {
    amount = Math.round(parseFloat(matchJt[1].replace(',', '.')) * 1000000)
  } else if (matchK) {
    amount = parseInt(matchK[1], 10) * 1000
  } else {
    const matchNumber = clean.replace(/\./g, '').match(/\b(\d{3,12})\b/)
    if (matchNumber) {
      amount = parseInt(matchNumber[1], 10)
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) return null

  let type = 'expense'
  let category = 'Lainnya'

  let matchedCustomCategory = null
  if (/\b(nenda|abah)\b/i.test(clean)) {
    const targetCat = availableCategories.find((cat) => isCategoryMatch(cat, 'nenda+abah')) || 'nenda+abah'
    matchedCustomCategory = targetCat
  } else {
    for (const cat of availableCategories) {
      const normCat = normalizeCategory(cat)
      if (lower.includes(normCat) || isCategoryMatch(clean, cat)) {
        matchedCustomCategory = cat
        break
      }
      const words = normCat.split(' ').filter((w) => w.length > 2 && w !== 'dan' && w !== 'belanja')
      for (const w of words) {
        const wordRegex = new RegExp(`\\b${w}\\b`, 'i')
        if (wordRegex.test(clean)) {
          matchedCustomCategory = cat
          break
        }
      }
      if (matchedCustomCategory) break
    }
  }

  if (matchedCustomCategory) {
    category = matchedCustomCategory
  } else if (lower.includes('bensin')) {
    category = 'Transportasi'
  }

  let description = clean
    .replace(/(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|k|ribu)?)/gi, '')
    .replace(/\brp\b/gi, '')
    .trim()

  if (!description) description = category

  return {
    amount,
    type,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
  }
}

const tests = [
  { input: 'nenda 100000', expectedCat: 'nenda+abah', shouldMatch: true },
  { input: 'abah 50000', expectedCat: 'nenda+abah', shouldMatch: true },
  { input: 'Abah 75000', expectedCat: 'nenda+abah', shouldMatch: true },
  { input: 'NENDA 100k', expectedCat: 'nenda+abah', shouldMatch: true },
  { input: 'ABAH 50rb', expectedCat: 'nenda+abah', shouldMatch: true },
  { input: 'nenda dan abah 300000', expectedCat: 'nenda+abah', shouldMatch: true },
  { input: 'sabah 50000', expectedCat: 'nenda+abah', shouldMatch: false },
  { input: 'nendang bola 20000', expectedCat: 'nenda+abah', shouldMatch: false },
  { input: 'agendanya 50000', expectedCat: 'nenda+abah', shouldMatch: false },
  { input: 'telor 20000', expectedCat: 'telor', shouldMatch: true },
  { input: 'beli bensin 25rb', expectedCat: 'Transportasi', shouldMatch: true },
]

console.log('--- Testing Deteksi Nenda + Abah & Kategori Lain ---')
let passed = 0
for (const t of tests) {
  const res = parsePesanKeuangan(t.input, availableCategories)
  const isMatch = res && res.category === t.expectedCat
  const ok = t.shouldMatch ? isMatch : !isMatch
  if (ok) {
    passed++
    console.log(`✅ PASS: "${t.input}" -> cat: "${res?.category}", desc: "${res?.description}", amount: ${res?.amount}`)
  } else {
    console.error(`❌ FAIL: "${t.input}" -> expected ${t.shouldMatch ? '' : 'NOT '}"${t.expectedCat}", got "${res?.category}"`)
  }
}

console.log(`\nResult: ${passed}/${tests.length} tests passed!`)
if (passed === tests.length) {
  console.log('🎉 SEMUA PENGUJIAN KATEGORI BERHASIL!')
}

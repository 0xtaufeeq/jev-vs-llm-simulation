export type Category =
  | 'Shopping'
  | 'Dining'
  | 'Transport'
  | 'Bills'
  | 'Entertainment'
  | 'Groceries'
  | 'Income'
  | 'Other'

export const CATEGORIES: Category[] = [
  'Shopping',
  'Dining',
  'Transport',
  'Bills',
  'Entertainment',
  'Groceries',
  'Income',
  'Other',
]

export const COLORS: Record<Category, string> = {
  Shopping: '#6c45bd',
  Dining: '#d4603a',
  Transport: '#1a6cc4',
  Bills: '#b8860f',
  Entertainment: '#a1307c',
  Groceries: '#13ae8a',
  Income: '#1b8a3c',
  Other: '#98a72e',
}

export interface Txn {
  id: number
  date: Date
  name: string
  amount: number // negative = money out
  category: Category
}

export type Currency = 'USD' | 'INR'

export interface Dataset {
  source: string // caption label, e.g. "Chase checking export"
  fileName: string
  currency: Currency
  /** true when categories are known-correct (samples, or a CSV with a Category column) */
  labelled: boolean
  txns: Txn[] // processing order (newest first)
  months: { key: string; label: string }[] // chronological
}

// ---------- seeded RNG ----------
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MERCHANTS: Record<Category, [string, number, number][]> = {
  // [name, min, max]
  Shopping: [
    ['Amazon.com', 12, 110],
    ['Target', 18, 95],
    ['Walgreens', 6, 40],
    ['Uniqlo', 30, 120],
    ['Best Buy', 25, 160],
    ['Etsy', 15, 60],
  ],
  Dining: [
    ['Starbucks', 5, 9],
    ['Blue Bottle Coffee', 6, 14],
    ['Sweetgreen Mission', 13, 19],
    ['Thai House', 18, 42],
    ['Tacolicious', 16, 38],
    ['Uber Eats', 22, 58],
    ['Philz Coffee', 5, 9],
    ['Chipotle', 11, 16],
  ],
  Transport: [
    ['Uber Trip', 11, 38],
    ['Lyft Ride', 10, 34],
    ['Clipper Service', 20, 60],
    ['Shell Oil', 38, 72],
    ['Waymo', 12, 30],
  ],
  Bills: [
    ['Rent · Mission Props', 2950, 2950],
    ['PG&E', 70, 140],
    ['Comcast Xfinity', 79, 79],
    ['Verizon Wireless', 85, 85],
    ['Geico Insurance', 112, 112],
  ],
  Entertainment: [
    ['Spotify', 11.99, 11.99],
    ['Netflix', 15.49, 15.49],
    ['AMC Theatres', 14, 36],
    ['Steam Games', 8, 40],
    ['Alamo Drafthouse', 18, 44],
  ],
  Groceries: [
    ["Trader Joe's", 28, 78],
    ['Whole Foods', 30, 95],
    ['Rainbow Grocery', 22, 70],
    ['Safeway', 20, 65],
    ['Bi-Rite Market', 12, 40],
  ],
  Income: [
    ['Gusto Payroll', 3800, 3800],
    ['Venmo Cashout', 40, 180],
    ['Interest Payment', 4, 12],
  ],
  Other: [
    ['Zelle To Jordan', 20, 90],
    ['ATM Withdrawal', 40, 100],
    ['Check #1042', 30, 90],
  ],
}

// Target figures, taken from the finished summary in the video
const COUNTS: Record<Category, number> = {
  Shopping: 24,
  Dining: 59,
  Transport: 29,
  Bills: 15,
  Entertainment: 15,
  Groceries: 50,
  Income: 9,
  Other: 6,
}
const TOTALS: Record<Category, number> = {
  Shopping: 1549.82,
  Dining: 1397.2,
  Transport: 1193.9,
  Bills: 9720.0,
  Entertainment: 320.6,
  Groceries: 2732.6,
  Income: 23649.0,
  Other: 325.9,
}

// First cards in the video, so the opening reads the same
const OPENING: [string, number, string, Category][] = [
  ['2026-03-28', -24.92, 'Uber Trip', 'Transport'],
  ['2026-03-28', -6.52, 'Starbucks', 'Dining'],
  ['2026-03-27', -12.03, 'Blue Bottle Coffee', 'Dining'],
  ['2026-03-27', 31.0, 'Amazon.com Refund', 'Income'],
  ['2026-03-27', -16.53, 'Sweetgreen Mission', 'Dining'],
  ['2026-03-26', -16.67, 'Lyft Ride', 'Transport'],
  ['2026-03-26', -13.54, 'Amazon.com', 'Shopping'],
]

function d(s: string) {
  const [y, m, day] = s.split('-').map(Number)
  return new Date(y, m - 1, day)
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function buildSampleDataset(): Dataset {
  const rnd = mulberry32(20260328)
  const txns: Omit<Txn, 'id'>[] = []

  const opening = OPENING.map(([ds, amount, name, category]) => ({
    date: d(ds),
    amount,
    name,
    category,
  }))

  for (const cat of CATEGORIES) {
    const fixed = opening.filter((o) => o.category === cat)
    const n = COUNTS[cat] - fixed.length
    const gen: Omit<Txn, 'id'>[] = []

    if (cat === 'Bills') {
      // 5 recurring bills per month for Jan, Feb, Mar
      for (let m = 0; m < 3; m++) {
        MERCHANTS.Bills.forEach(([name, lo, hi], j) => {
          gen.push({
            date: new Date(2026, m, 1 + j * 3 + Math.floor(rnd() * 2)),
            name,
            amount: -(lo + rnd() * (hi - lo)),
            category: cat,
          })
        })
      }
    } else if (cat === 'Income') {
      // twice-monthly payroll plus odds and ends
      const paydays = ['2026-01-15', '2026-01-30', '2026-02-13', '2026-02-27', '2026-03-13', '2026-03-24']
      paydays.forEach((p) => gen.push({ date: d(p), name: 'Gusto Payroll', amount: 3800, category: cat }))
      gen.push({ date: d('2026-02-06'), name: 'Venmo Cashout', amount: 120, category: cat })
      gen.push({ date: d('2026-01-31'), name: 'Interest Payment', amount: 8.4, category: cat })
    } else {
      for (let i = 0; i < n; i++) {
        const list = MERCHANTS[cat]
        const [name, lo, hi] = list[Math.floor(rnd() * list.length)]
        // spread across Jan 1 – Mar 26
        const dayOfQ = Math.floor(rnd() * 85)
        const date = new Date(2026, 0, 1 + dayOfQ)
        gen.push({ date, name, amount: -(lo + rnd() * (hi - lo)), category: cat })
      }
    }

    // scale generated amounts so category total matches exactly
    const fixedSum = fixed.reduce((s, t) => s + Math.abs(t.amount), 0)
    const target = TOTALS[cat] - fixedSum
    const genSum = gen.reduce((s, t) => s + Math.abs(t.amount), 0)
    const k = target / genSum
    let acc = 0
    gen.forEach((t, i) => {
      const sign = Math.sign(t.amount)
      if (i === gen.length - 1) {
        t.amount = sign * round2(target - acc)
      } else {
        const v = round2(Math.abs(t.amount) * k)
        t.amount = sign * v
        acc += v
      }
    })

    txns.push(...gen)
  }

  balanceMonths(txns, rnd)
  txns.sort((a, b) => b.date.getTime() - a.date.getTime() || rnd() - 0.5)
  const all = [...opening, ...txns].map((t, id) => ({ ...t, id }))

  return {
    source: 'Chase checking export',
    fileName: 'chase-checking-jan-mar-2026.csv',
    currency: 'USD',
    labelled: true,
    txns: all,
    months: monthsOf(all),
  }
}

// ---------- India sample: 6 months, Apr–Sep 2026, Bengaluru ----------

type Spec = [name: string, min: number, max: number, weight?: number]

const IN_MERCHANTS: Partial<Record<Category, Spec[]>> = {
  Shopping: [
    ['Amazon.in', 299, 4999, 3],
    ['Flipkart', 399, 6999, 3],
    ['Myntra', 799, 3499, 2],
    ['Nykaa', 399, 1899, 1],
    ['Decathlon', 999, 4999, 1],
    ['Croma', 1499, 12999, 0.4],
  ],
  Dining: [
    ['Swiggy', 249, 899, 5],
    ['Zomato', 219, 999, 5],
    ['Third Wave Coffee', 220, 480, 2],
    ['Chai Point', 60, 180, 2],
    ['Blue Tokai Coffee', 250, 520, 1],
    ['Rameshwaram Cafe', 120, 340, 2],
    ['Meghana Foods', 450, 1400, 1],
    ['Truffles', 400, 1100, 1],
  ],
  Transport: [
    ['Uber India', 140, 620, 4],
    ['Ola Cabs', 120, 540, 2],
    ['Rapido', 45, 180, 4],
    ['Namma Metro Recharge', 200, 500, 2],
    ['Indian Oil Petrol', 500, 2500, 2],
    ['FASTag Recharge', 500, 1000, 1],
    ['IndiGo Airlines', 4500, 8900, 0.25],
  ],
  Entertainment: [
    ['BookMyShow', 350, 1400, 2],
    ['PVR INOX', 400, 1200, 1],
    ['Steam Games', 199, 1499, 0.5],
  ],
  Groceries: [
    ['BigBasket', 800, 3500, 3],
    ['Blinkit', 150, 1200, 4],
    ['Zepto', 150, 1100, 4],
    ['DMart', 1200, 4500, 2],
    ['Swiggy Instamart', 180, 1200, 3],
    ['Nilgiris Supermarket', 200, 900, 1],
  ],
  Other: [['ATM Cash Withdrawal', 2000, 5000]],
}

// ad-hoc spends per month (± 1)
const IN_PER_MONTH: Partial<Record<Category, number>> = {
  Shopping: 5,
  Dining: 15,
  Transport: 11,
  Entertainment: 1,
  Groceries: 14,
  Other: 1,
}

function pick(list: Spec[], rnd: () => number): Spec {
  const total = list.reduce((s, m) => s + (m[3] ?? 1), 0)
  let r = rnd() * total
  for (const m of list) if ((r -= m[3] ?? 1) <= 0) return m
  return list[list.length - 1]
}

// realistic price endings: ₹349, ₹1,299, ₹612.40 …
function inrPrice(v: number, rnd: () => number) {
  if (v > 900 && rnd() < 0.5) return Math.round(v / 100) * 100 - 1
  if (rnd() < 0.4) return Math.round(v)
  return round2(v)
}

export function buildIndiaDataset(): Dataset {
  const rnd = mulberry32(20260928)
  const txns: Omit<Txn, 'id'>[] = []
  const add = (m: number, day: number, name: string, amount: number, category: Category) =>
    txns.push({ date: new Date(2026, m, day), name, amount, category })

  for (let m = 3; m <= 8; m++) {
    // Apr (3) … Sep (8); the statement ends 28 Sep
    const last = m === 8 ? 28 : new Date(2026, m + 1, 0).getDate()
    const day = () => 1 + Math.floor(rnd() * last)

    add(m, 1, 'Salary · Acme Technologies Pvt Ltd', 142500, 'Income')

    // fixed monthly outgoings
    add(m, 2, 'House Rent · UPI to landlord', -28000, 'Bills')
    add(m, 3, 'UPI to Lakshmi (house help)', -4000, 'Other')
    add(m, 5, 'Zerodha SIP', -10000, 'Other')
    add(m, 8 + Math.floor(rnd() * 3), 'BESCOM Electricity', -round2(900 + rnd() * 1500), 'Bills')
    add(m, 10, 'Airtel Xstream Fiber', -1178, 'Bills')
    add(m, 12, 'Jio Postpaid', -449, 'Bills')
    add(m, 14 + Math.floor(rnd() * 4), 'BWSSB Water', -round2(300 + rnd() * 300), 'Bills')
    add(m, 7, 'Netflix', -649, 'Entertainment')
    add(m, 9, 'Spotify', -119, 'Entertainment')
    add(m, 15, 'JioHotstar', -299, 'Entertainment')

    for (const [cat, per] of Object.entries(IN_PER_MONTH) as [Category, number][]) {
      const count = per + Math.floor(rnd() * 3) - 1
      for (let i = 0; i < count; i++) {
        const [name, lo, hi] = pick(IN_MERCHANTS[cat]!, rnd)
        add(m, day(), name, -inrPrice(lo + rnd() * (hi - lo), rnd), cat)
      }
    }
  }

  // one-offs on the money-in side
  add(4, 18, 'Freelance · Upwork payout', 38500, 'Income')
  add(5, 30, 'SB Interest Credit', 2140, 'Income')
  add(6, 11, 'UPI from Rahul (trip split)', 3850, 'Income')
  add(7, 22, 'Freelance · Upwork payout', 42000, 'Income')
  add(7, 26, 'Flipkart Refund', 2499, 'Income')
  add(8, 19, 'Amazon.in Refund', 1299, 'Income')

  txns.sort((a, b) => b.date.getTime() - a.date.getTime() || rnd() - 0.5)
  const all = txns.map((t, id) => ({ ...t, id }))
  return {
    source: 'HDFC savings export',
    fileName: 'hdfc-savings-apr-sep-2026.csv',
    currency: 'INR',
    labelled: true,
    txns: all,
    months: monthsOf(all),
  }
}

// Monthly money-out totals from the recording: $5.6K, $5.7K, $5.9K (opening cards add ~$107 to March)
const MONTH_TARGETS = [5620, 5700, 5810]

/** swap dates between same-category spends until monthly totals land on target (keeps category sums intact) */
function balanceMonths(txns: Omit<Txn, 'id'>[], rnd: () => number) {
  const spend = txns.filter((t) => t.amount < 0 && t.category !== 'Bills')
  const totals = [0, 0, 0]
  txns.forEach((t) => t.amount < 0 && (totals[t.date.getMonth()] += -t.amount))
  const err = () => totals.reduce((s, v, i) => s + (v - MONTH_TARGETS[i]) ** 2, 0)
  for (let it = 0; it < 20000 && err() > 30; it++) {
    const a = spend[Math.floor(rnd() * spend.length)]
    const b = spend[Math.floor(rnd() * spend.length)]
    const ma = a.date.getMonth()
    const mb = b.date.getMonth()
    if (a.category !== b.category || ma === mb) continue
    const before = err()
    const delta = -a.amount - -b.amount
    totals[ma] -= delta
    totals[mb] += delta
    if (err() < before) {
      const tmp = a.date
      a.date = b.date
      b.date = tmp
    } else {
      totals[ma] += delta
      totals[mb] -= delta
    }
  }
}

export function monthKey(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function monthsOf(txns: Txn[]) {
  const keys = Array.from(new Set(txns.map((t) => monthKey(t.date)))).sort()
  return keys.slice(-6).map((key) => {
    const [y, m] = key.split('-').map(Number)
    return { key, label: new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' }) }
  })
}

// ---------- CSV upload + mock "Jev" categorizer ----------

const RULES: [RegExp, Category][] = [
  [/payroll|salary|direct dep|deposit|refund|interest|cashout|cashback|reimburse|payout/i, 'Income'],
  [/trader joe|whole foods|safeway|grocery|market|kroger|costco|aldi|bi-rite|sprouts|basket|blinkit|zepto|dmart|instamart|nilgiris|kirana|supermarket/i, 'Groceries'],
  [/uber eats|doordash|grubhub|swiggy|zomato|starbucks|coffee|cafe|chai|restaurant|sweetgreen|chipotle|thai|taco|pizza|burger|bar |kitchen|philz|diner|sushi|foods|truffles|biryani/i, 'Dining'],
  [/spotify|netflix|hulu|disney|hotstar|amc|cinema|theatre|theater|pvr|inox|bookmyshow|steam|playstation|xbox|concert|alamo|hbo|youtube/i, 'Entertainment'],
  [/rent|pg&e|electric|water|bescom|bwssb|comcast|xfinity|verizon|at&t|t-mobile|airtel|jio|fibernet|broadband|insurance|geico|lic |utility|internet|phone/i, 'Bills'],
  [/uber|lyft|ola |rapido|clipper|bart|shell|chevron|petrol|indian oil|hpcl|fastag|gas|parking|waymo|transit|metro|toll|irctc|indigo|airline|delta|united/i, 'Transport'],
  [/amazon|flipkart|myntra|nykaa|ajio|meesho|decathlon|croma|target|walgreens|cvs|best buy|uniqlo|etsy|ikea|apple|nike|zara|walmart|ebay|shop|store/i, 'Shopping'],
]

export function categorize(name: string, amount: number): Category {
  if (amount > 0) return 'Income'
  for (const [re, cat] of RULES) if (re.test(name)) return cat
  return 'Other'
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseMoney(s: string | undefined): number {
  if (!s) return NaN
  const neg = /^\(.*\)$/.test(s) || s.includes('-')
  const v = parseFloat(s.replace(/[^0-9.]/g, ''))
  return neg ? -v : v
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** 03/04/2026 is ambiguous: look for a part > 12, else fall back on the statement's country */
function detectDayFirst(values: string[], currency: Currency) {
  for (const v of values) {
    const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}$/)
    if (!m) continue
    if (+m[1] > 12) return true
    if (+m[2] > 12) return false
  }
  return currency === 'INR'
}

function parseDate(v: string | undefined, dayFirst: boolean): Date {
  if (!v) return new Date(NaN)
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])
  const num = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (num) {
    const y = +num[3] < 100 ? 2000 + +num[3] : +num[3]
    return dayFirst ? new Date(y, +num[2] - 1, +num[1]) : new Date(y, +num[1] - 1, +num[2])
  }
  const named = v.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-](\d{2,4})$/) // 28-Sep-2026
  if (named) {
    const mi = MONTHS.indexOf(named[2].toLowerCase())
    const y = +named[3] < 100 ? 2000 + +named[3] : +named[3]
    if (mi >= 0) return new Date(y, mi, +named[1])
  }
  return new Date(v)
}

export function parseCsv(text: string, fileName: string): Dataset {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) throw new Error('That file looks empty.')
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const find = (re: RegExp) => header.findIndex((h) => re.test(h))
  const iDate = find(/date/)
  const iDesc = [/desc/, /narration/, /merchant|payee|name/, /memo|details|particulars/].map(find).find((i) => i >= 0) ?? -1
  const iAmt = find(/^amount|amount$/)
  const iDebit = find(/debit|withdraw/)
  const iCredit = find(/credit|deposit/)
  const iCat = find(/^category$/)
  const currency: Currency =
    /inr|₹|\brs\b/.test(header.join(' ')) || /₹|\bINR\b|\bUPI\b|\bNEFT\b/.test(lines.slice(1, 40).join(' ')) ? 'INR' : 'USD'
  const rows = lines.slice(1).map(splitCsvLine)
  const dayFirst = detectDayFirst(rows.map((r) => r[iDate] ?? ''), currency)
  if (iDate < 0 || iDesc < 0 || (iAmt < 0 && iDebit < 0)) {
    throw new Error('Expected columns: Date, Description, Amount.')
  }

  const txns: Txn[] = []
  for (const cells of rows) {
    const date = parseDate(cells[iDate], dayFirst)
    if (isNaN(date.getTime())) continue
    let amount = iAmt >= 0 ? parseMoney(cells[iAmt]) : NaN
    if (isNaN(amount)) {
      const debit = parseMoney(cells[iDebit])
      const credit = parseMoney(cells[iCredit])
      amount = !isNaN(debit) && debit !== 0 ? -Math.abs(debit) : Math.abs(credit || 0)
    }
    if (isNaN(amount)) continue
    const name = cells[iDesc] || 'Unknown'
    const given = iCat >= 0 ? (CATEGORIES.find((c) => c.toLowerCase() === cells[iCat]?.toLowerCase()) ?? null) : null
    txns.push({ id: 0, date, name, amount, category: given ?? categorize(name, amount) })
  }
  if (!txns.length) throw new Error('No transactions found in that file.')

  txns.sort((a, b) => b.date.getTime() - a.date.getTime())
  txns.forEach((t, i) => (t.id = i))
  return {
    source: fileName.replace(/\.csv$/i, ''),
    fileName,
    currency,
    labelled: iCat >= 0,
    txns,
    months: monthsOf(txns),
  }
}

const q = (v: string) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const pad2 = (n: number) => String(n).padStart(2, '0')

function inrMode(name: string) {
  if (/^(Salary|Freelance)/.test(name)) return 'NEFT'
  if (name.startsWith('ATM')) return 'ATM'
  if (name.startsWith('Zerodha')) return 'ACH'
  if (name.includes('Interest')) return 'INT'
  return 'UPI'
}

function usType(t: Txn) {
  if (t.amount > 0) return t.name.includes('Payroll') ? 'ACH_CREDIT' : 'MISC_CREDIT'
  if (t.category === 'Bills') return 'ACH_DEBIT'
  if (t.name.startsWith('ATM')) return 'ATM'
  if (t.name.startsWith('Zelle')) return 'QUICKPAY_DEBIT'
  if (t.name.startsWith('Check')) return 'CHECK_PAID'
  return 'DEBIT_CARD'
}

/** Chase-style (US) or HDFC-style (India) export, oldest first, with explicit in/out columns */
export function toCsv(ds: Dataset): string {
  const chrono = [...ds.txns].sort((a, b) => a.date.getTime() - b.date.getTime() || b.id - a.id)
  if (ds.currency === 'INR') {
    let bal = 184250
    const rows = chrono.map((t, i) => {
      bal = round2(bal + t.amount)
      const dt = `${pad2(t.date.getDate())}/${pad2(t.date.getMonth() + 1)}/${t.date.getFullYear()}`
      const mode = inrMode(t.name)
      const ref = `${mode}${600000000 + i * 7919}`
      const out = t.amount < 0 ? (-t.amount).toFixed(2) : ''
      const inn = t.amount > 0 ? t.amount.toFixed(2) : ''
      return [dt, q(t.name), mode, ref, out, inn, bal.toFixed(2)].join(',')
    })
    return ['Date,Narration,Mode,Ref No.,Withdrawal Amt (INR),Deposit Amt (INR),Closing Balance (INR)', ...rows].join('\n')
  }
  let bal = 8420.55
  const rows = chrono.map((t) => {
    bal = round2(bal + t.amount)
    const dt = `${pad2(t.date.getMonth() + 1)}/${pad2(t.date.getDate())}/${t.date.getFullYear()}`
    return [t.amount > 0 ? 'CREDIT' : 'DEBIT', dt, q(t.name), t.amount.toFixed(2), usType(t), bal.toFixed(2)].join(',')
  })
  return ['Details,Posting Date,Description,Amount,Type,Balance', ...rows].join('\n')
}

// ---------- formatting ----------
export interface Money {
  card: (n: number) => string
  whole: (n: number) => string
  short: (n: number) => string
  date: (d: Date) => string
}

const trim1 = (v: number) => v.toFixed(1).replace(/\.0$/, '')

export function moneyFor(currency: Currency): Money {
  if (currency === 'INR') {
    return {
      // Indian digit grouping: 1,42,500
      card: (n) => `${n < 0 ? '−' : '+'}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      whole: (n) => `₹${Math.round(n).toLocaleString('en-IN')}`,
      short: (n) =>
        n >= 1e7 ? `₹${trim1(n / 1e7)}Cr` : n >= 1e5 ? `₹${trim1(n / 1e5)}L` : n >= 1e3 ? `₹${trim1(n / 1e3)}K` : `₹${Math.round(n)}`,
      date: (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
  }
  return {
    card: (n) => `${n < 0 ? '−' : '+'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    whole: (n) => `$${Math.round(n).toLocaleString('en-US')}`,
    short: (n) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`),
    date: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

export function fmtPct(count: number, total: number) {
  if (count === 0) return '0%'
  const p = (count / total) * 100
  if (p < 1) return '<1%'
  return `${Math.round(p)}%`
}

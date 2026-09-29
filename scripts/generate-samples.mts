// Writes the sample statements to public/samples and checks that re-importing
// each CSV reproduces the same categories (i.e. the mock categorizer covers every merchant).
// Run: npm run samples
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildIndiaDataset, buildSampleDataset, moneyFor, parseCsv, toCsv, type Dataset } from '../src/data.ts'

const outDir = new URL('../public/samples/', import.meta.url)
mkdirSync(outDir, { recursive: true })

function check(ds: Dataset) {
  const csv = toCsv(ds)
  writeFileSync(new URL(ds.fileName, outDir), csv + '\n')

  const back = parseCsv(csv, ds.fileName)
  const fmt = moneyFor(ds.currency)
  // same-day rows may come back in a different order, so match on content
  const key = (t: { date: Date; name: string; amount: number }) => `${t.date.getTime()}|${t.name}|${t.amount.toFixed(2)}`
  const pool = new Map<string, string[]>()
  back.txns.forEach((b) => pool.set(key(b), [...(pool.get(key(b)) ?? []), b.category]))
  const mismatches = ds.txns.filter((t) => {
    const cats = pool.get(key(t))
    const i = cats?.indexOf(t.category) ?? -1
    if (i < 0) return true
    cats!.splice(i, 1)
    return false
  })
  const sum = (sign: 1 | -1) => ds.txns.filter((t) => Math.sign(t.amount) === sign).reduce((s, t) => s + Math.abs(t.amount), 0)

  console.log(`\n${ds.fileName}  (${ds.currency}, ${back.currency} on re-import)`)
  console.log(`  ${ds.txns.length} transactions · ${ds.months.map((m) => m.label).join(' ')}`)
  console.log(`  in ${fmt.whole(sum(1))} · out ${fmt.whole(sum(-1))}`)
  if (mismatches.length || back.currency !== ds.currency) {
    console.error(`  ✗ ${mismatches.length} rows differ after re-import`, mismatches.slice(0, 5).map((t) => t.name))
    process.exitCode = 1
  } else {
    console.log('  ✓ round-trips cleanly')
  }
}

check(buildSampleDataset())
check(buildIndiaDataset())

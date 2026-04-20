/**
 * Валидация баланса дерева классов.
 * Запуск: node scripts/validate_balance.js
 *
 * Считает суммарную "силу" каждого класса по всей цепочке предков,
 * группирует по ветке и глубине, флажит выбросы (отклонение > 15% от среднего).
 */

import { ALL_CLASSES, CLASS_MAP, getCumulativeBonuses } from '../src/data/classes.js';

// Веса значимости бонусов для расчёта "силы"
const WEIGHTS = {
  atk:      1.0,
  hp:       0.7,
  def:      0.6,
  spd:      1.1,
  crit:     1.4,
  critDmg:  0.8,
  xpMult:   0.5,
  goldMult: 0.4,
};

function powerScore(bonuses) {
  let score = 0;
  for (const [k, v] of Object.entries(bonuses)) {
    score += (v || 0) * (WEIGHTS[k] ?? 0.5);
  }
  return score;
}

function mean(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function stddev(arr, avg) {
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
}

// Собираем данные по всем классам с depth >= 1
const byDepth = new Map(); // depth → Map<branch, power[]>

for (const cls of ALL_CLASSES) {
  if (!cls.depth || cls.depth < 1) continue;
  const bonuses = getCumulativeBonuses(cls.id);
  const power   = powerScore(bonuses);

  if (!byDepth.has(cls.depth)) byDepth.set(cls.depth, new Map());
  const branches = byDepth.get(cls.depth);
  if (!branches.has(cls.branch)) branches.set(cls.branch, []);
  branches.get(cls.branch).push({ id: cls.id, name: cls.name, power });
}

const OUTLIER_THRESHOLD = 0.15; // 15% отклонение от среднего
let outlierCount = 0;

console.log('═══════════════════════════════════════════════════════');
console.log('  BALANCE REPORT — Idle RPG Class Tree');
console.log('═══════════════════════════════════════════════════════\n');

for (const [depth, branches] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
  // Все значения силы на этой глубине
  const allPowers = [...branches.values()].flat().map(c => c.power);
  const avg = mean(allPowers);
  const sd  = stddev(allPowers, avg);

  const branchSummary = [...branches.entries()]
    .map(([branch, classes]) => {
      const powers  = classes.map(c => c.power);
      const brAvg   = mean(powers);
      const dev     = Math.abs(brAvg - avg) / avg;
      const isHigh  = brAvg > avg * (1 + OUTLIER_THRESHOLD);
      const isLow   = brAvg < avg * (1 - OUTLIER_THRESHOLD);
      const flag    = isHigh ? '🔴 HIGH' : isLow ? '🔵 LOW ' : '✅     ';
      if (isHigh || isLow) outlierCount++;
      return { branch, brAvg, dev, flag, count: classes.length };
    })
    .sort((a, b) => b.brAvg - a.brAvg);

  console.log(`Depth ${depth}  (avg power: ${avg.toFixed(2)}, σ=${sd.toFixed(2)}, classes: ${allPowers.length})`);
  for (const s of branchSummary) {
    const bar = '█'.repeat(Math.round(s.brAvg * 2)).slice(0, 30);
    console.log(`  ${s.flag}  ${s.branch.padEnd(8)}  avg=${s.brAvg.toFixed(2).padStart(6)}  dev=${(s.dev * 100).toFixed(1).padStart(5)}%  n=${s.count}  ${bar}`);
  }

  // Топ-3 самых сильных и слабых на этой глубине (только для depth 4 и 10)
  if (depth === 4 || depth === 10) {
    const flat = [...branches.values()].flat().sort((a, b) => b.power - a.power);
    console.log(`  ┌─ Топ-3 сильнейших:`);
    flat.slice(0, 3).forEach(c => console.log(`  │  ${c.name.padEnd(30)} power=${c.power.toFixed(2)}`));
    console.log(`  └─ Топ-3 слабейших:`);
    flat.slice(-3).reverse().forEach(c => console.log(`  │  ${c.name.padEnd(30)} power=${c.power.toFixed(2)}`));
  }

  console.log();
}

console.log('═══════════════════════════════════════════════════════');
if (outlierCount === 0) {
  console.log('✅  Выбросов не обнаружено. Баланс в норме.');
} else {
  console.log(`⚠️   Обнаружено выбросов: ${outlierCount} (ветки с отклонением > ${OUTLIER_THRESHOLD * 100}% от среднего)`);
  console.log('    🔴 HIGH — ветка слишком сильная, рассмотри снижение бонусов');
  console.log('    🔵 LOW  — ветка слишком слабая, рассмотри усиление бонусов');
}
console.log('═══════════════════════════════════════════════════════');

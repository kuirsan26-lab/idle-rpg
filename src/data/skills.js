/**
 * Активные скилы — по одному на ветку класса
 */

export const SKILLS_BY_BRANCH = {
  novice:  { id: 'focus',       name: 'Концентрация', icon: '✨', desc: 'Восстанавливает 25% макс. HP',               cdMs: 20000 },
  warrior: { id: 'shield_bash', name: 'Удар щитом',   icon: '🛡️', desc: 'Оглушает первого врага на 1 сек',           cdMs: 8000  },
  rogue:   { id: 'poison_stab', name: 'Отравить',      icon: '☠️', desc: 'Следующая атака +80% урон + яд (3 тика)',  cdMs: 10000 },
  archer:  { id: 'volley',      name: 'Залп',           icon: '🏹', desc: 'Атакует всех врагов (50% ATK)',            cdMs: 12000 },
  mage:    { id: 'fireball',    name: 'Огненный шар',   icon: '🔥', desc: 'Урон всем (80% ATK) + горение 3 тика',    cdMs: 15000 },
};

// ── Усиление скиллов (по 5 уровней на ветку) ─────────────────────────────────
// Уровни 1–3 за золото, 4–5 за ПО (очки престижа). Не сбрасывается при престиже.
export const SKILL_MAX_LEVEL = 5;

export const SKILL_UPGRADES = {
  novice: [
    { type: 'gold', cost: 400,  label: 'Лечит 35% HP' },
    { type: 'gold', cost: 1200, label: 'Кулдаун 14с' },
    { type: 'gold', cost: 3000, label: 'Лечит до 60% HP' },
    { type: 'pp',   cost: 6,    label: 'Баф +20% урона на 10с' },
    { type: 'pp',   cost: 15,   label: 'Щит при возрождении' },
  ],
  warrior: [
    { type: 'gold', cost: 500,  label: 'Стан 2 врагов' },
    { type: 'gold', cost: 1500, label: 'Стан 2 сек' },
    { type: 'gold', cost: 4000, label: 'Стан всех врагов' },
    { type: 'pp',   cost: 8,    label: 'Стан 3 сек' },
    { type: 'pp',   cost: 20,   label: '+1 заряд' },
  ],
  rogue: [
    { type: 'gold', cost: 800,  label: 'Яд 5 тиков' },
    { type: 'gold', cost: 2000, label: 'Урон ×2.2' },
    { type: 'gold', cost: 6000, label: 'Яд 20% ATK/тик' },
    { type: 'pp',   cost: 10,   label: 'Кулдаун 6с' },
    { type: 'pp',   cost: 25,   label: 'Яд стакается' },
  ],
  archer: [
    { type: 'gold', cost: 600,  label: '70% ATK по всем' },
    { type: 'gold', cost: 1500, label: 'Яд на залп' },
    { type: 'gold', cost: 4000, label: 'Крит на залп' },
    { type: 'pp',   cost: 8,    label: 'Кулдаун 7с' },
    { type: 'pp',   cost: 20,   label: '+1 заряд' },
  ],
  mage: [
    { type: 'gold', cost: 1000, label: 'Горение 5 тиков' },
    { type: 'gold', cost: 2500, label: '+30% урон' },
    { type: 'gold', cost: 6000, label: 'Кулдаун 10с' },
    { type: 'pp',   cost: 12,   label: 'Горение дольше (8 тиков)' },
    { type: 'pp',   cost: 30,   label: 'Взрыв при смерти' },
  ],
};

/**
 * Эффективные параметры скилла ветки на заданном уровне прокачки (кумулятивно).
 * Combat._applySkill читает их вместо хардкода.
 */
export function getSkillParams(branch, level) {
  const cdMs = SKILLS_BY_BRANCH[branch]?.cdMs ?? 20000;
  const p = { cdMs, charges: 1 };

  switch (branch) {
    case 'novice':
      p.healPct = 0.25;
      if (level >= 1) p.healPct = 0.35;
      if (level >= 2) p.cdMs = 14000;
      if (level >= 3) p.healPct = 0.60;
      p.atkBuff       = level >= 4; // +20% урона на 10с
      p.respawnShield = level >= 5; // щит при возрождении
      break;
    case 'warrior':
      p.stunTicks = 5; p.targets = 1;
      if (level >= 1) p.targets = 2;
      if (level >= 2) p.stunTicks = 10;
      if (level >= 3) p.targets = 'all';
      if (level >= 4) p.stunTicks = 15;
      if (level >= 5) p.charges = 2;
      break;
    case 'rogue':
      p.dmgMult = 1.8; p.poisonTicks = 3; p.poisonPct = 0.15;
      if (level >= 1) p.poisonTicks = 5;
      if (level >= 2) p.dmgMult = 2.2;
      if (level >= 3) p.poisonPct = 0.20;
      if (level >= 4) p.cdMs = 6000;
      p.poisonStacks = level >= 5;
      break;
    case 'archer':
      p.dmgPct = 0.5;
      if (level >= 1) p.dmgPct = 0.70;
      p.volleyDot  = level >= 2;
      p.volleyCrit = level >= 3;
      if (level >= 4) p.cdMs = 7000;
      if (level >= 5) p.charges = 2;
      break;
    case 'mage':
      p.dmgPct = 0.8; p.burnTicks = 3;
      if (level >= 1) p.burnTicks = 5;
      if (level >= 2) p.dmgPct = 0.8 * 1.3;
      if (level >= 3) p.cdMs = 10000;
      if (level >= 4) p.burnTicks = 8;
      p.explodeOnDeath = level >= 5;
      break;
  }
  return p;
}

/** Человекочитаемое описание эффекта скилла на текущем уровне прокачки */
export function describeSkill(branch, level) {
  const p   = getSkillParams(branch, level);
  const cd  = (p.cdMs / 1000).toFixed(0);
  const parts = [];

  switch (branch) {
    case 'novice':
      parts.push(`Лечит ${Math.round(p.healPct * 100)}% HP`);
      if (p.atkBuff)       parts.push('+20% урона на 10с');
      if (p.respawnShield) parts.push('щит при возрождении');
      break;
    case 'warrior': {
      const tgt = p.targets === 'all' ? 'всех врагов' : `${p.targets} ${p.targets > 1 ? 'врагов' : 'врага'}`;
      parts.push(`Стан ${tgt} на ${(p.stunTicks * 0.2).toFixed(1)}с`);
      break;
    }
    case 'rogue':
      parts.push(`След. удар ×${p.dmgMult}`);
      parts.push(`яд ${p.poisonTicks} тик (${Math.round(p.poisonPct * 100)}% ATK)`);
      if (p.poisonStacks) parts.push('стакается');
      break;
    case 'archer':
      parts.push(`${Math.round(p.dmgPct * 100)}% ATK по всем`);
      if (p.volleyCrit) parts.push('может крит');
      if (p.volleyDot)  parts.push('+яд');
      break;
    case 'mage':
      parts.push(`${Math.round(p.dmgPct * 100)}% ATK по всем`);
      parts.push(`горение ${p.burnTicks} тик`);
      if (p.explodeOnDeath) parts.push('взрыв при смерти');
      break;
  }

  let s = parts.join(', ') + ` · КД ${cd}с`;
  if ((p.charges ?? 1) > 1) s += ` · заряды ${p.charges}`;
  return s;
}

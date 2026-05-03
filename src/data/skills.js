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

/**
 * Точка входа: инициализация Phaser + UI систем
 */
import { inject } from '@vercel/analytics';
inject();

import Phaser from 'phaser';
import { GameScene }     from './phaser/GameScene.js';
import { GameState }     from './core/GameState.js';
import { CombatSystem }  from './core/Combat.js';
import { StatsPanel }     from './ui/StatsPanel.js';
import { HUD }            from './ui/HUD.js';
import { BattleStrip }   from './ui/BattleStrip.js';
import { SettingsMenu }  from './ui/SettingsMenu.js';
import { PrestigeShop }  from './ui/PrestigeShop.js';
import { InventoryPanel }  from './ui/InventoryPanel.js';
import { MainMenu }        from './ui/MainMenu.js';
import { ClassTreeGraph }     from './ui/ClassTreeGraph.js';
import { AchievementsPanel }  from './ui/AchievementsPanel.js';
import { MobileNav }          from './ui/MobileNav.js';
import { OfflineModal }       from './ui/OfflineModal.js';
import { ZoneMap }            from './ui/ZoneMap.js';
import { RunSummary }         from './ui/RunSummary.js';
import { ShadowMirror }       from './ui/ShadowMirror.js';
import { Tutorial }           from './ui/Tutorial.js';
import { BattleInfoPanel }    from './ui/BattleInfoPanel.js';
import { CLASS_MAP }     from './data/classes.js';

window._classMap = CLASS_MAP;

// ── 1. Состояние ──────────────────────────────────────────────────────────────
const state  = new GameState();
state.initialize();

// ── 2. Боевая система ─────────────────────────────────────────────────────────
const combat = new CombatSystem(state);

// ── 3. Phaser — КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: не автостартовать сцену ──────────────
// При scene:[GameScene] Phaser автостартует сцену без данных → crash → чёрный экран.
// Правильный путь: scene:[] + ручной add с данными после ready.
const SCENE_W = 620;
const SCENE_H = 480;

const phaserGame = new Phaser.Game({
  type:            Phaser.AUTO,
  width:           SCENE_W,
  height:          SCENE_H,
  parent:          'game-container',
  backgroundColor: '#080810',
  antialias:       false,
  roundPixels:     true,
  resolution:      window.devicePixelRatio || 1,
  scene:           [],      // ← пусто, добавим вручную
  scale: {
    mode:       Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  banner: false,
});

phaserGame.events.once('ready', () => {
  // add(key, sceneClass, autoStart, initData)
  phaserGame.scene.add('GameScene', GameScene, true, { state, combat });
});

// ── 4. HTML UI ────────────────────────────────────────────────────────────────
const hud           = new HUD(state);
const statsPanel    = new StatsPanel(state);
const battleStrip   = new BattleStrip(state, combat);
const settingsMenu   = new SettingsMenu(state);
const prestigeShop   = new PrestigeShop(state);
const inventoryPanel  = new InventoryPanel(state);
const classTreeGraph   = new ClassTreeGraph(state);
const achievementsPanel = new AchievementsPanel(state);
const mobileNav         = new MobileNav();
const offlineModal      = new OfflineModal();
const zoneMap           = new ZoneMap(state);
const runSummary        = new RunSummary();
const shadowMirror      = new ShadowMirror(state);
const battleInfoPanel   = new BattleInfoPanel(state, combat);

// restartCombat — перезапуск боя после конца рана
window.game.restartCombat = () => {
  combat.mobs = [];
  combat.waveState = 'fighting';
  combat.deathsOnWave = 0;
  combat.attackCooldown = 0;
  combat._pendingPoison = null;
  state.isAlive  = true;
  state.currentHp = state.getStats().maxHp;
  state.emit('player:hpChanged', { hp: state.currentHp });
  combat._emit('onRespawn', {});
  combat._spawnWave();
};

// Логирование боевых событий
combat.register({
  onPlayerAttack: ({ mob, damage, isCrit }) => {
    if (isCrit) hud.logCombat(`⚡ КРИТ по ${mob.data.name}: ${damage} урона!`, 'crit');
  },
  onMobDeath: ({ mob, xpGained, goldGained, itemDrop }) => {
    hud.logCombat(`☠ ${mob.data.name} убит! +${goldGained}g +${xpGained}XP`, 'kill');
    if (itemDrop) hud.logCombat(`🎁 Дроп: ${itemDrop.name}`, 'level');
  },
  onPlayerDeath: ({ deathsOnWave, maxDeaths }) => {
    const remaining = maxDeaths - deathsOnWave;
    if (remaining > 0) {
      hud.logCombat(`💀 Погиб! Ещё ${remaining} смерт${remaining === 1 ? 'ь' : 'и'} — откат волны`, 'hit');
    }
  },
  onWaveRollback: ({ wave }) => {
    hud.logCombat(`⬇️ Слишком сложно — возврат на волну ${wave}`, 'system');
  },
});

// Пробрасываем combat в battleStrip для real-time обновлений
combat.register({
  onWaveSpawn:     (d) => battleStrip.onWaveSpawn(d),
  onMobDeath:      (d) => battleStrip.onMobDeath(d),
  onPlayerDeath:   (d) => battleStrip.onPlayerDeath(d),
  onRespawn:       ()  => battleStrip.onRespawn(),
  onPlayerHit:     (d) => battleStrip.onPlayerHit(d),
  onPlayerAttack:  (d) => battleStrip.onPlayerAttack(d),
  onWaveRollback:  (d) => battleStrip.onWaveRollback(d),
});

// Пробрасываем combat в battleInfoPanel
combat.register({
  onWaveSpawn: ({ mobs }) => { battleInfoPanel.resetKills(); battleInfoPanel.updateEnemies(mobs); },
  onMobDeath:  ()         => battleInfoPanel.addKill(),
});

// Обновление HP врагов в реальном времени
setInterval(() => {
  if (combat.mobs) battleInfoPanel.updateEnemies(combat.mobs);
}, 500);

// ── 5. Главное меню → старт боя ───────────────────────────────────────────────
const tutorial = new Tutorial(state);

const menu = new MainMenu({
  onStart:   () => {
    setTimeout(() => combat.start(), 200);
    // Экран «С возвращением» — после старта боя, если был офлайн-прогресс
    if (state.offlineSummary) {
      const summary = state.offlineSummary;
      state.offlineSummary = null;
      setTimeout(() => offlineModal.show(summary), 450);
    }
    // Онбординг первого запуска (после небольшой задержки, чтобы всё успело отрендериться)
    setTimeout(() => tutorial.start(), 600);
  },
  onNewGame: () => state.hardReset(),
});
menu.show();

// ── 6. Resize ─────────────────────────────────────────────────────────────────
// На мобилке (≤820px) макет резиновый — CSS @media управляет вёрсткой,
// а scale() надо снять, иначе фиксированный слой 1280×720 «съёжится».
const mqMobile = window.matchMedia('(max-width: 820px)');
function handleResize() {
  const app = document.getElementById('app');
  if (!app) return;
  if (mqMobile.matches) {
    app.style.transform = 'none';
    app.style.transformOrigin = '';
    return;
  }
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  const x = (window.innerWidth - 1280 * scale) / 2;
  app.style.transformOrigin = 'top left';
  app.style.transform = `translate(${x}px, 0px) scale(${scale})`;
}
window.addEventListener('resize', handleResize);
mqMobile.addEventListener('change', handleResize);
handleResize();

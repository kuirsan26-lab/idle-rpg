/**
 * Данные раскадровки анимаций героев + регистрация Phaser-анимаций.
 * Изолирует конфиг анимаций от логики сцены.
 *
 * Спрайтшиты: public/sprites/heroes/hero_<branch>.png (сетка 96×96, один ряд)
 * Раскадровка: hero_<branch>.json — { frameSize, states: { <state>: {start,count,frameRate} } }
 * (генерируются scripts/import_pixellab_hero.py из вывода Pixellab)
 */
import Phaser from 'phaser';

export const HERO_BRANCHES = ['novice', 'warrior', 'rogue', 'archer', 'mage'];
export const HERO_STATES   = ['idle', 'attack', 'hit', 'death'];

export const heroAnimKey = (branch, state) => `hero_${branch}_${state}`;

/**
 * Создаёт Phaser-анимации всех состояний героя и ставит NEAREST-фильтр
 * на текстуру `hero_anim_<branch>` (чёткие пиксели при апскейле).
 * @param {Phaser.Scene} scene
 * @param {string} branch — ветка героя
 * @param {object} sheetJson — содержимое hero_<branch>.json
 */
export function registerHeroAnims(scene, branch, sheetJson) {
  const texKey = `hero_anim_${branch}`;
  if (scene.textures.exists(texKey)) {
    scene.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  for (const state of HERO_STATES) {
    const s = sheetJson?.states?.[state];
    if (!s) continue;
    const key = heroAnimKey(branch, state);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(texKey, {
        start: s.start,
        end: s.start + s.count - 1,
      }),
      frameRate: s.frameRate ?? 8,
      repeat: state === 'idle' ? -1 : 0,
    });
  }
}

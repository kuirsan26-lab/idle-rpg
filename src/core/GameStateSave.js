/**
 * Mixin: сохранение, загрузка, автосейв, хард-ресет
 * Устанавливается на GameState.prototype
 */

export function installSave(proto) {
  proto.save = function() {
    const data = {
      v: 2,
      level:          this.level,
      xp:             this.xp,
      gold:           this.gold,
      totalKills:     this.totalKills,
      totalGold:      this.totalGold,
      playTime:       this.playTime,
      prestigeCount:  this.prestigeCount,
      prestigePoints: this.prestigePoints,
      prestigeShop:   { ...this.prestigeShop },
      currentClass:   this.currentClass,
      unlockedClasses: [...this.unlockedClasses],
      upgrades:       { ...this.upgrades },
      currentWave:    this.currentWave,
      maxWaveReached: this.maxWaveReached,
      inventory:      this.inventory,
      equipment:      this.equipment,
      timestamp:      Date.now(),
    };
    try {
      localStorage.setItem('idle_rpg_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  };

  proto._load = function() {
    try {
      const raw = localStorage.getItem('idle_rpg_save');
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || (data.v !== 1 && data.v !== 2)) return false;

      this.level          = data.level ?? 1;
      this.xp             = data.xp ?? 0;
      this.gold           = data.gold ?? 0;
      this.totalKills     = data.totalKills ?? 0;
      this.totalGold      = data.totalGold ?? 0;
      this.playTime       = data.playTime ?? 0;
      this.prestigeCount  = data.prestigeCount ?? 0;
      this.prestigePoints = data.prestigePoints ?? 0;
      this.prestigeShop   = data.prestigeShop ?? {};
      this.currentClass   = data.currentClass ?? 'novice';
      this.unlockedClasses = new Set(data.unlockedClasses ?? ['novice']);
      this.upgrades = { atk: 0, def: 0, hp: 0, spd: 0, crit: 0, critDmg: 0, ...data.upgrades };
      this.currentWave    = data.currentWave ?? 1;
      this.maxWaveReached = data.maxWaveReached ?? (data.currentWave ?? 0);
      this.inventory      = data.inventory ?? [];
      this.equipment      = { weapon: null, armor: null, accessory: null, ...(data.equipment ?? {}) };

      // Офлайн-прогресс (до 8 часов)
      const elapsed = Math.min((Date.now() - (data.timestamp ?? Date.now())) / 1000, 8 * 3600);
      if (elapsed > 10) {
        const dps        = this.getStats().atk * this.getStats().spd;
        const goldPerSec = dps * 0.5 * this.getStats().goldMult;
        const xpPerSec   = dps * 0.3 * this.getStats().xpMult;
        this.addGold(Math.round(goldPerSec * elapsed));
        this.addXp(Math.round(xpPerSec * elapsed));
      }

      this.currentHp = this.getStats().maxHp;
      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  };

  proto._autoSave = function() {
    this._boundSave = () => this.save();
    setInterval(this._boundSave, 30_000);
    window.addEventListener('beforeunload', this._boundSave);
  };

  proto.hardReset = function() {
    window.removeEventListener('beforeunload', this._boundSave);
    localStorage.removeItem('idle_rpg_save');
    localStorage.removeItem('idle_rpg_seen_version');
    window.location.reload();
  };
}

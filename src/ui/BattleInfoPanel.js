/**
 * BattleInfoPanel — левая панель с инфо о текущей волне и врагах.
 * Элементы: #battle-info-panel (HTML в index.html)
 */
export class BattleInfoPanel {
  constructor(state, combat) {
    this._state = state;
    this._combat = combat;
    this._zoneEl     = document.getElementById('bip-zone-name');
    this._waveEl     = document.getElementById('bip-wave-text');
    this._progressEl = document.getElementById('bip-wave-progress');
    this._enemyListEl = document.getElementById('bip-enemy-list');
    this._killCountEl = document.getElementById('bip-kill-count');
    this._kills = 0;

    // Обновляем при изменении волны/зоны
    state.on('combat:waveStarted', () => this._updateWave());
    state.on('player:statsChanged', () => this._updateWave());

    this._updateWave();
  }

  _updateWave() {
    const state = this._state;
    const zone = state.getCurrentZone?.();
    if (this._zoneEl) {
      this._zoneEl.textContent = zone ? zone.name : '—';
    }
    const zoneWave  = state.zoneWave ?? state.currentWave ?? 1;
    const totalWaves = zone?.waves ?? 20;
    const isBoss = zoneWave > totalWaves;
    if (this._waveEl) {
      this._waveEl.textContent = isBoss ? 'БОСС' : `${zoneWave} / ${totalWaves}`;
    }
    const pct = isBoss ? 100 : Math.min(100, (zoneWave / totalWaves) * 100);
    if (this._progressEl) this._progressEl.style.width = pct + '%';
  }

  updateEnemies(mobs) {
    if (!this._enemyListEl) return;
    this._enemyListEl.innerHTML = '';
    const alive = (mobs || []).filter(m => m.hp > 0);
    if (alive.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bip-enemy-item';
      empty.style.color = '#4a4';
      empty.textContent = '✓ Победа!';
      this._enemyListEl.appendChild(empty);
      return;
    }
    alive.slice(0, 6).forEach(mob => {
      const maxHp = mob.data?.maxHp ?? mob.maxHp ?? 1;
      const hp    = mob.hp ?? 0;
      const pct   = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      const name  = mob.data?.name ?? mob.name ?? 'Враг';
      const item = document.createElement('div');
      item.className = 'bip-enemy-item';
      item.innerHTML = `
        <div class="bip-enemy-name">${name}</div>
        <div class="bip-enemy-hp-track"><div class="bip-enemy-hp-fill" style="width:${pct}%"></div></div>
      `;
      this._enemyListEl.appendChild(item);
    });
  }

  addKill() {
    this._kills++;
    if (this._killCountEl) this._killCountEl.textContent = this._kills;
  }

  resetKills() {
    this._kills = 0;
    if (this._killCountEl) this._killCountEl.textContent = '0';
    this._updateWave();
  }
}

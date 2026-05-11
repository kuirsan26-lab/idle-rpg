import { ACHIEVEMENTS } from '../data/achievements.js';

export class AchievementsPanel {
  constructor(state) {
    this.state = state;

    this._unsubs = [
      state.on('player:achievementUnlocked', ({ ach }) => {
        this._refresh();
        this._showToast(ach);
      }),
    ];

    window.game = window.game || {};
    window.game.openAchievements = () => this.open();
  }

  destroy() {
    this._unsubs.forEach(u => u());
  }

  open() {
    this._refresh();
    document.getElementById('achievements-overlay').classList.add('visible');
  }

  close() {
    document.getElementById('achievements-overlay').classList.remove('visible');
  }

  _refresh() {
    const s     = this.state;
    const done  = s.completedAchievements.size;
    const total = ACHIEVEMENTS.length;
    const totalPp = ACHIEVEMENTS.reduce((sum, a) => sum + a.pp, 0);

    document.getElementById('ach-count').textContent = `${done} / ${total}`;
    document.getElementById('ach-pp-total').textContent = `${s.prestigePoints} / ${totalPp} ПО`;

    const list = document.getElementById('ach-list');
    list.innerHTML = ACHIEVEMENTS.map(ach => {
      const completed = s.completedAchievements.has(ach.id);
      const isHidden  = ach.hidden && !completed;
      const name      = isHidden ? '???' : ach.name;
      const desc      = isHidden ? 'Выполните скрытое условие' : ach.desc;

      let progressHtml = '';
      if (!isHidden && ach.progress) {
        const { cur, max } = ach.progress(s);
        const pct = Math.min(100, Math.round(cur / max * 100));
        const curFmt = cur >= 1000 ? (cur / 1000).toFixed(1) + 'K' : cur;
        const maxFmt = max >= 1000 ? (max / 1000).toFixed(0) + 'K' : max;
        progressHtml = `
          <div class="ach-progress-bar">
            <div class="ach-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="ach-progress-label">${curFmt} / ${maxFmt}</div>`;
      }

      return `
        <div class="ach-item ${completed ? 'ach-done' : 'ach-pending'} ${isHidden ? 'ach-hidden' : ''}">
          <div class="ach-icon">${completed ? '🏆' : isHidden ? '🔒' : '○'}</div>
          <div class="ach-body">
            <div class="ach-name">${name}</div>
            <div class="ach-desc">${desc}</div>
            ${progressHtml}
          </div>
          <div class="ach-reward ${completed ? 'ach-reward-done' : ''}">+${ach.pp} ПО</div>
        </div>`;
    }).join('');
  }

  _showToast(ach) {
    const toast = document.getElementById('ach-toast');
    if (!toast) return;
    toast.innerHTML = `🏆 <b>${ach.name}</b> <span style="color:#ffd700">+${ach.pp} ПО</span>`;
    toast.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
  }
}

// ====== ポケモン種族値・データ（wiki相当） ======
const POKEMON_DB = {
  ヒトカゲ: {
    name: "ヒトカゲ",
    type: "ほのお",
    base: { hp: 39, atk: 52, def: 43, spd: 65 },
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/4.png",
  },
  フシギダネ: {
    name: "フシギダネ",
    type: "くさ",
    base: { hp: 45, atk: 49, def: 49, spd: 45 },
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
  },
};
// --- 技データ ---
const movesData = {
  ひのこ: {
    name: "ひのこ",
    type: "ほのお",
    power: 40,
    maxPP: 25,
    se: "hinoko",
  },
  ひっかく: {
    name: "ひっかく",
    type: "ノーマル",
    power: 40,
    maxPP: 35,
    se: "hik",
  },
  なきごえ: {
    name: "なきごえ",
    type: "ノーマル",
    power: 0,
    maxPP: 40,
    se: "naki",
  },
  つるのムチ: {
    name: "つるのムチ",
    type: "くさ",
    power: 45,
    maxPP: 25,
    se: "turu",
  },
  たいあたり: {
    name: "たいあたり",
    type: "ノーマル",
    power: 40,
    maxPP: 35,
    se: "tai",
  },
};
const typeChart = {
  ほのお: { くさ: 2, ほのお: 0.5, みず: 0.5 },
  くさ: { みず: 2, ほのお: 0.5, くさ: 0.5 },
  みず: { ほのお: 2, くさ: 0.5, みず: 0.5 },
  ノーマル: {},
};
// --- プレイヤー/敵データ ---
const player = {
  name: "ヒトカゲ",
  lv: 50,
  maxHp: 1,
  hp: 1,
  atk: 1,
  def: 1,
  spd: 1,
  type: "ほのお",
  moves: [
    { ...movesData["ひのこ"], pp: movesData["ひのこ"].maxPP },
    { ...movesData["ひっかく"], pp: movesData["ひっかく"].maxPP },
    { ...movesData["なきごえ"], pp: movesData["なきごえ"].maxPP },
  ],
  sprite: "", // 後で種族値データからセット
};
const opponent = {
  name: "フシギダネ",
  lv: 50,
  maxHp: 1,
  hp: 1,
  atk: 1,
  def: 1,
  spd: 1,
  type: "くさ",
  moves: [
    { ...movesData["つるのムチ"], pp: movesData["つるのムチ"].maxPP },
    { ...movesData["たいあたり"], pp: movesData["たいあたり"].maxPP },
    { ...movesData["なきごえ"], pp: movesData["なきごえ"].maxPP },
  ],
  sprite: "",
};
let turn = 0; // 0:player, 1:opponent
let inProgress = true;

// --- ステータス計算（本家仕様） ---
function calcStat(base, lv, iv = 31, ev = 0, isHp = false) {
  if (isHp)
    return Math.floor(
      ((base * 2 + iv + Math.floor(ev / 4)) * lv) / 100 + lv + 10
    );
  return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * lv) / 100 + 5);
}
function setStats(pokeObj, lv, pokeName) {
  const d = POKEMON_DB[pokeName];
  pokeObj.lv = lv;
  pokeObj.type = d.type;
  pokeObj.maxHp = calcStat(d.base.hp, lv, 31, 0, true);
  pokeObj.atk = calcStat(d.base.atk, lv);
  pokeObj.def = calcStat(d.base.def, lv);
  pokeObj.spd = calcStat(d.base.spd, lv);
  pokeObj.hp = pokeObj.maxHp;
  pokeObj.sprite = d.sprite;
  pokeObj.name = d.name;
  pokeObj.moves.forEach((m) => (m.pp = m.maxPP));
}

// ====== 音 =======
const bgm = document.getElementById("battle-bgm");
const winBgm = document.getElementById("win-bgm");
const se = {
  hinoko: document.getElementById("se-hinoko"),
  hik: document.getElementById("se-hik"),
  naki: document.getElementById("se-naki"),
  tai: document.getElementById("se-tai"),
  turu: document.getElementById("se-turu"),
};
let bgmVolume = 0.35;
bgm.volume = bgmVolume;
winBgm.volume = bgmVolume;
const volInput = document.getElementById("volume-range");
volInput.value = Math.round(bgmVolume * 100);
volInput.oninput = (e) => {
  bgmVolume = volInput.value / 100;
  bgm.volume = bgmVolume;
  winBgm.volume = bgmVolume;
};
// オーディオ自動再生許可
document.body.addEventListener("pointerdown", function autoPlayAudioOnce() {
  playBGM();
  document.body.removeEventListener("pointerdown", autoPlayAudioOnce);
});

// ====== UIレベル操作 =======
document.getElementById("lv-apply").onclick = () => {
  let plv = parseInt(document.getElementById("player-lv-input").value) || 50;
  let olv = parseInt(document.getElementById("opp-lv-input").value) || 50;
  plv = Math.max(1, Math.min(100, plv));
  olv = Math.max(1, Math.min(100, olv));
  setStats(player, plv, "ヒトカゲ");
  setStats(opponent, olv, "フシギダネ");
  document.getElementById("player-lv").textContent = "Lv" + player.lv;
  document.getElementById("opp-lv").textContent = "Lv" + opponent.lv;
  document.getElementById("player-sprite").src = player.sprite;
  document.getElementById("opp-sprite").src = opponent.sprite;
  updateHpBars();
  document.getElementById("message").textContent = "レベル変更適用！";
  inProgress = true; // リセット
  showMoveMenu();
};

// --- 初期値Lv50でセット
setStats(player, 50, "ヒトカゲ");
setStats(opponent, 50, "フシギダネ");

// ====== 初期化 =======
window.onload = () => {
  document.getElementById("player-name").textContent = player.name;
  document.getElementById("player-lv").textContent = "Lv" + player.lv;
  document.getElementById("opp-name").textContent = opponent.name;
  document.getElementById("opp-lv").textContent = "Lv" + opponent.lv;
  document.getElementById("player-sprite").src = player.sprite;
  document.getElementById("opp-sprite").src = opponent.sprite;
  updateHpBars();
  setTimeout(startBattle, 350);
};

// ====== 出会い演出 =======
function startBattle() {
  const black = document.getElementById("fade-black");
  black.textContent = "野生のフシギダネがあらわれた！";
  black.classList.add("show");
  setTimeout(() => {
    black.classList.remove("show");
    playBGM();
    setTimeout(() => {
      showMessage("戦闘がはじまった！", showMoveMenu, 1100);
    }, 450);
  }, 1350);
}
function playBGM() {
  bgm.currentTime = 0;
  bgm.volume = bgmVolume;
  bgm.play().catch(() => {});
  winBgm.pause();
  winBgm.currentTime = 0;
}
function playWin() {
  bgm.pause();
  winBgm.currentTime = 0;
  winBgm.volume = bgmVolume;
  winBgm.play().catch(() => {});
}

// ====== HPバー・色・アニメ =======
function setHpBar(pokemon, barElem) {
  let ratio = pokemon.hp / pokemon.maxHp;
  let w = Math.max(0, ratio * 100);
  barElem.style.width = w + "%";
  barElem.className = "hp-bar";
  if (ratio <= 0.25) barElem.classList.add("red");
  else if (ratio <= 0.5) barElem.classList.add("yellow");
  else barElem.classList.add("green");
}
function animateHpBar(pokemon, targetHp, barElem, numElem, cb) {
  const startHp = pokemon.hp;
  const diff = targetHp - startHp;
  if (diff === 0) {
    updateHpBars();
    if (cb) cb();
    return;
  }
  const steps = Math.abs(diff);
  if (steps === 0) {
    updateHpBars();
    if (cb) cb();
    return;
  }

  const duration = Math.max(320, Math.min(steps * 25, 2000)); // 25ms/step, 最小320ms, 最大2s
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    let progress = Math.min(1, elapsed / duration);
    let newHp = Math.round(startHp + diff * progress);
    if ((diff < 0 && newHp < targetHp) || (diff > 0 && newHp > targetHp))
      newHp = targetHp;
    pokemon.hp = newHp;
    setHpBar(pokemon, barElem);
    numElem.textContent = `${pokemon.hp} / ${pokemon.maxHp}`;
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      pokemon.hp = targetHp;
      setHpBar(pokemon, barElem);
      numElem.textContent = `${pokemon.hp} / ${pokemon.maxHp}`;
      updateHpBars();
      if (cb) cb();
    }
  }
  requestAnimationFrame(frame);
}
function updateHpBars() {
  setHpBar(player, document.getElementById("player-hp-bar"));
  setHpBar(opponent, document.getElementById("opp-hp-bar"));
  document.getElementById(
    "player-hp-num"
  ).textContent = `${player.hp} / ${player.maxHp}`;
  document.getElementById(
    "opp-hp-num"
  ).textContent = `${opponent.hp} / ${opponent.maxHp}`;
}
function showMessage(msg, cb, time = 1100) {
  document.getElementById("message").textContent = msg;
  if (cb) setTimeout(cb, time);
}
function showMoveMenu() {
  if (!inProgress) return;
  const menu = document.getElementById("move-menu");
  menu.innerHTML = "";
  player.moves.forEach((move, idx) => {
    const btn = document.createElement("button");
    btn.textContent = move.name;
    btn.className = "move-btn";
    btn.disabled = move.pp <= 0;
    btn.onclick = () => playerMove(idx);
    // PP表示
    const pp = document.createElement("div");
    pp.className = "move-pp";
    pp.textContent = `PP: ${move.pp}/${move.maxPP}`;
    btn.appendChild(pp);
    menu.appendChild(btn);
  });
}
function hideMoveMenu() {
  document.getElementById("move-menu").innerHTML = "";
}
function calcDamage(
  level,
  power,
  atk,
  def,
  moveType,
  atkType,
  defType,
  isCrit = false
) {
  let stab = moveType === atkType ? 1.5 : 1;
  let eff = (typeChart[moveType] && typeChart[moveType][defType]) || 1;
  let crit = isCrit ? 1.5 : 1;
  let random = Math.random() * 0.15 + 0.85;
  let dmg = Math.floor(
    ((((2 * level) / 5 + 2) * atk * power) / def / 50 + 2) *
      stab *
      eff *
      crit *
      random
  );
  return {
    value: Math.max(1, dmg),
    eff,
    crit,
  };
}
function playerMove(idx) {
  if (!inProgress) return;
  hideMoveMenu(); // 連打防止
  const move = player.moves[idx];
  if (move.pp <= 0) return;
  move.pp -= 1;

  // 技SE
  if (move.se && se[move.se]) {
    try {
      se[move.se].currentTime = 0;
      se[move.se].play();
    } catch (e) {}
  }

  if (move.power === 0) {
    showMessage(
      `${player.name}の${move.name}！ しかし なにもおこらなかった…`,
      () => nextTurn()
    );
    return;
  }
  const isCrit = Math.random() < 0.0625;
  const { value, eff, crit } = calcDamage(
    player.lv,
    move.power,
    player.atk,
    opponent.def,
    move.type,
    player.type,
    opponent.type,
    isCrit
  );

  showMessage(`${player.name}の${move.name}！`, () => {
    const barElem = document.getElementById("opp-hp-bar");
    const numElem = document.getElementById("opp-hp-num");
    let tgt = Math.max(0, opponent.hp - value);
    animateHpBar(opponent, tgt, barElem, numElem, () => {
      let msg = `あいてに ${value} ダメージ！`;
      if (crit > 1) msg += " 急所にあたった！";
      if (eff === 2) msg += " こうかは ばつぐんだ！";
      if (eff === 0.5) msg += " こうかは いまひとつのようだ…";
      showMessage(msg, () => checkWinOrNext());
    });
  });
}
function opponentMove() {
  if (!inProgress) return;
  const candidates = opponent.moves.filter((m) => m.pp > 0);
  const move = candidates[Math.floor(Math.random() * candidates.length)];
  move.pp -= 1;
  // 技SE
  if (move.se && se[move.se]) {
    try {
      se[move.se].currentTime = 0;
      se[move.se].play();
    } catch (e) {}
  }
  if (move.power === 0) {
    showMessage(
      `${opponent.name}の${move.name}！ しかし なにもおこらなかった…`,
      () => nextTurn()
    );
    return;
  }
  const isCrit = Math.random() < 0.0625;
  const { value, eff, crit } = calcDamage(
    opponent.lv,
    move.power,
    opponent.atk,
    player.def,
    move.type,
    opponent.type,
    player.type,
    isCrit
  );

  showMessage(`${opponent.name}の${move.name}！`, () => {
    const barElem = document.getElementById("player-hp-bar");
    const numElem = document.getElementById("player-hp-num");
    let tgt = Math.max(0, player.hp - value);
    animateHpBar(player, tgt, barElem, numElem, () => {
      let msg = `あなたは ${value} ダメージを うけた！`;
      if (crit > 1) msg += " 急所にあたった！";
      if (eff === 2) msg += " こうかは ばつぐんだ！";
      if (eff === 0.5) msg += " こうかは いまひとつのようだ…";
      showMessage(msg, () => checkWinOrNext());
    });
  });
}
function checkWinOrNext() {
  if (opponent.hp <= 0) {
    inProgress = false;
    document.getElementById("opp-sprite").classList.add("xy-sink");
    playWin();
    showMessage("フシギダネは たおれた！ しょうり！", null, 1700);
    hideMoveMenu();
    return;
  }
  if (player.hp <= 0) {
    inProgress = false;
    document.getElementById("player-sprite").classList.add("xy-sink");
    bgm.pause();
    showMessage("ヒトカゲは たおれた… まけてしまった…", null, 1700);
    hideMoveMenu();
    return;
  }
  nextTurn();
}
function nextTurn() {
  turn = (turn + 1) % 2;
  if (turn === 0) showMoveMenu();
  else setTimeout(opponentMove, 800);
}

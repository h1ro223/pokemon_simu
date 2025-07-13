// battle.js

// =========== 設定 ===========
const DEFAULT_PLAYER = "リザードン";
const DEFAULT_OPP = "カメックス";
const DEFAULT_LV = 50;

// =========== グローバル変数 ===========
let player = {};
let opponent = {};
let nowPlayerName = DEFAULT_PLAYER;
let nowOpponentName = DEFAULT_OPP;
let turn = 0;
let inProgress = true;
let bgmVolume = 0.35;

let playerFlinch = false;
let oppFlinch = false;

// =========== 初期化 ===========
function setStats(pokeObj, lv, pokeName) {
  const d = POKEMON_DB[pokeName];
  pokeObj.lv = lv;
  pokeObj.type = d.type;
  pokeObj.no = d.no;
  pokeObj.maxHp = Math.floor(((d.base.hp * 2 + 31) * lv) / 100 + lv + 10);
  pokeObj.atk = Math.floor(((d.base.atk * 2 + 31) * lv) / 100 + 5);
  pokeObj.def = Math.floor(((d.base.def * 2 + 31) * lv) / 100 + 5);
  pokeObj.spd = Math.floor(((d.base.spd * 2 + 31) * lv) / 100 + 5);
  pokeObj.hp = pokeObj.maxHp;
  pokeObj.sprite_front = d.sprite_front;
  pokeObj.sprite_back = d.sprite_back;
  pokeObj.name = d.name;
  pokeObj.moves = (d.moves || []).map((movename) => {
    const m = movesData[movename];
    return { ...m, pp: m.maxPP };
  });
  pokeObj.atkStage = 0;
}

function updateUI() {
  document.getElementById("player-name").textContent = player.name;
  document.getElementById("player-lv").textContent = "Lv" + player.lv;
  document.getElementById("opp-name").textContent = opponent.name;
  document.getElementById("opp-lv").textContent = "Lv" + opponent.lv;
  document.getElementById("player-sprite").src = player.sprite_back;
  document.getElementById("opp-sprite").src = opponent.sprite_front;
  updateHpBars();
}

// =========== タイプ相性表 ===========
const typeChart = {
  くさ: {
    みず: 2,
    ほのお: 0.5,
    くさ: 0.5,
    でんき: 1,
    ドラゴン: 0.5,
    じめん: 2,
  },
  ほのお: { くさ: 2, みず: 0.5, ほのお: 0.5, ドラゴン: 0.5, じめん: 1 },
  みず: {
    ほのお: 2,
    みず: 0.5,
    くさ: 0.5,
    でんき: 1,
    ドラゴン: 0.5,
    じめん: 2,
  },
  でんき: { みず: 2, くさ: 0.5, でんき: 0.5, ドラゴン: 0.5, じめん: 0 },
  こおり: { くさ: 2, ドラゴン: 2, ほのお: 0.5, みず: 0.5 },
  ひこう: { くさ: 2, でんき: 0.5, いわ: 0.5 },
  あく: {},
  はがね: {},
  ノーマル: {},
  ドラゴン: { ドラゴン: 2 },
  じめん: { ほのお: 2, でんき: 2, みず: 1, くさ: 0.5 },
};
function getTypeEff(moveType, defType) {
  if (typeChart[moveType] && typeChart[moveType][defType] !== undefined)
    return typeChart[moveType][defType];
  return 1;
}

// =========== UI更新 ===========
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
function setHpBar(pokemon, barElem) {
  let ratio = pokemon.hp / pokemon.maxHp;
  let w = Math.max(0, ratio * 100);
  barElem.style.width = w + "%";
  barElem.className = "hp-bar";
  if (ratio <= 0.25) barElem.classList.add("red");
  else if (ratio <= 0.5) barElem.classList.add("yellow");
  else barElem.classList.add("green");
}

// =========== 戦闘開始演出 ===========
window.onload = () => {
  setupMonSelects();
  startBattleInit();
  document.body.addEventListener("pointerdown", function autoPlayAudioOnce() {
    playBGM();
    document.body.removeEventListener("pointerdown", autoPlayAudioOnce);
  });
};

function startBattleInit() {
  setStats(player, DEFAULT_LV, nowPlayerName);
  setStats(opponent, DEFAULT_LV, nowOpponentName);
  updateUI();
  setTimeout(startBattle, 350);
  playerFlinch = false;
  oppFlinch = false;
}

function startBattle() {
  document.getElementById(
    "fade-black"
  ).textContent = `野生の${opponent.name}があらわれた！`;
  document.getElementById("fade-black").classList.add("show");
  setTimeout(() => {
    document.getElementById("fade-black").classList.remove("show");
    playBGM();
    setTimeout(() => {
      showMessage("戦闘がはじまった！", showMoveMenu, 1100);
    }, 450);
  }, 1350);
}

// =========== 技メニュー ===========
function showMoveMenu() {
  if (!inProgress) return;
  const menu = document.getElementById("move-menu");
  menu.innerHTML = "";
  player.moves.forEach((move, idx) => {
    const btn = document.createElement("button");
    btn.textContent = `${move.name} (${move.type} 威${move.power} PP${move.pp}/${move.maxPP})`;
    btn.className = "move-btn";
    btn.disabled = move.pp <= 0;
    btn.onclick = () => playerMove(idx);
    btn.title = move.desc || "";
    menu.appendChild(btn);
  });
}
function hideMoveMenu() {
  document.getElementById("move-menu").innerHTML = "";
}

// =========== ダメージ計算 ===========
function calcStatWithStage(stat, stage) {
  const tbl = [0.25, 0.28, 0.33, 0.4, 0.5, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  return Math.round(stat * (tbl[stage + 6] || 1));
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
  let eff = getTypeEff(moveType, defType);
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

// =========== 技効果音 ===========
function playMoveSE(move) {
  if (!move || !move.en) return;
  const se = new Audio("mp3/" + move.en + ".mp3");
  se.volume = bgmVolume;
  se.play().catch(() => {});
}
function playMissSE() {
  const missSE = new Audio("mp3/Miss.mp3");
  missSE.volume = bgmVolume;
  missSE.play().catch(() => {});
}

// =========== 技実行（命中・ひるみ） ===========
function playerMove(idx) {
  if (!inProgress) return;
  hideMoveMenu();

  // ひるみ状態ならターンをスキップ
  if (playerFlinch) {
    playerFlinch = false; // 解除
    showMessage(
      `${player.name}は ひるんで　うごけない！`,
      () => nextTurn(),
      1100
    );
    return;
  }

  const move = player.moves[idx];
  if (move.pp <= 0) return;

  // 命中判定
  const hit =
    move.accuracy === undefined ? true : Math.random() * 100 < move.accuracy;

  if (!hit) {
    playMissSE();
    showMessage(
      `${player.name}の${move.name}！\nしかし　あたらなかった！`,
      () => nextTurn(),
      1100
    );
    return;
  }

  move.pp -= 1;
  playMoveSE(move);

  if (move.name === "なきごえ") {
    if (opponent.atkStage > -6) {
      opponent.atkStage--;
      showMessage(`相手のこうげきがさがった！`, () => nextTurn(), 900);
    } else {
      showMessage(`これいじょう さがらない！`, () => nextTurn(), 900);
    }
    return;
  }
  const isCrit = Math.random() < 0.0625;
  const atkStat = calcStatWithStage(player.atk, player.atkStage);
  const defStat = opponent.def;
  const { value, eff, crit } = calcDamage(
    player.lv,
    move.power,
    atkStat,
    defStat,
    move.type,
    player.type,
    opponent.type,
    isCrit
  );

  let willFlinch = false;
  if (move.desc && move.desc.includes("ひるみ")) {
    const match = move.desc.match(/(\d+)%でひるみ/);
    const prob = match ? parseInt(match[1]) : 0;
    if (prob > 0 && Math.random() * 100 < prob) {
      willFlinch = true;
    }
  }

  showMessage(`${player.name}の${move.name}！`, () => {
    pokeEffect("enemy");
    animateHpBar(opponent, Math.max(0, opponent.hp - value), "opp", () => {
      let msg = `あいてに ${value} ダメージ！`;
      if (crit > 1) msg += " 急所にあたった！";
      if (eff === 2) msg += " こうかは ばつぐんだ！";
      if (eff === 0.5) msg += " こうかは いまひとつのようだ…";
      if (willFlinch) msg += " ひるんだ！";
      if (willFlinch) oppFlinch = true;
      showMessage(msg, () => checkWinOrNext());
    });
  });
}
function opponentMove() {
  if (!inProgress) return;

  // ひるみ状態ならターンをスキップ
  if (oppFlinch) {
    oppFlinch = false;
    showMessage(
      `${opponent.name}は ひるんで　うごけない！`,
      () => nextTurn(),
      1100
    );
    return;
  }

  const candidates = opponent.moves.filter((m) => m.pp > 0);
  const move = candidates[Math.floor(Math.random() * candidates.length)];

  // 命中判定
  const hit =
    move.accuracy === undefined ? true : Math.random() * 100 < move.accuracy;

  if (!hit) {
    playMissSE();
    showMessage(
      `${opponent.name}の${move.name}！\nしかし　あたらなかった！`,
      () => nextTurn(),
      1100
    );
    return;
  }

  move.pp -= 1;
  playMoveSE(move);

  if (move.name === "なきごえ") {
    if (player.atkStage > -6) {
      player.atkStage--;
      showMessage(`あなたのこうげきがさがった！`, () => nextTurn(), 900);
    } else {
      showMessage(`これいじょう さがらない！`, () => nextTurn(), 900);
    }
    return;
  }
  const isCrit = Math.random() < 0.0625;
  const atkStat = calcStatWithStage(opponent.atk, opponent.atkStage);
  const defStat = player.def;
  const { value, eff, crit } = calcDamage(
    opponent.lv,
    move.power,
    atkStat,
    defStat,
    move.type,
    opponent.type,
    player.type,
    isCrit
  );

  let willFlinch = false;
  if (move.desc && move.desc.includes("ひるみ")) {
    const match = move.desc.match(/(\d+)%でひるみ/);
    const prob = match ? parseInt(match[1]) : 0;
    if (prob > 0 && Math.random() * 100 < prob) {
      willFlinch = true;
    }
  }

  showMessage(`${opponent.name}の${move.name}！`, () => {
    pokeEffect("player");
    animateHpBar(player, Math.max(0, player.hp - value), "player", () => {
      let msg = `あなたは ${value} ダメージを うけた！`;
      if (crit > 1) msg += " 急所にあたった！";
      if (eff === 2) msg += " こうかは ばつぐんだ！";
      if (eff === 0.5) msg += " こうかは いまひとつのようだ…";
      if (willFlinch) msg += " ひるんだ！";
      if (willFlinch) playerFlinch = true;
      showMessage(msg, () => checkWinOrNext());
    });
  });
}

// =========== HPバー・メッセージ・エフェクト ===========
function animateHpBar(pokemon, targetHp, side, cb) {
  const barElem = document.getElementById(
    side === "player" ? "player-hp-bar" : "opp-hp-bar"
  );
  const numElem = document.getElementById(
    side === "player" ? "player-hp-num" : "opp-hp-num"
  );
  const startHp = pokemon.hp;
  const diff = targetHp - startHp;
  if (diff === 0) {
    updateHpBars();
    if (cb) cb();
    return;
  }
  const steps = Math.abs(diff);
  const duration = Math.max(320, Math.min(steps * 25, 2000));
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
function pokeEffect(side) {
  const el = document.getElementById(
    side === "enemy" ? "opp-sprite" : "player-sprite"
  );
  el.classList.add("hit");
  setTimeout(() => el.classList.remove("hit"), 350);
}
function showMessage(msg, cb, time = 1100) {
  document.getElementById("message").textContent = msg;
  if (cb) setTimeout(cb, time);
}

// =========== 勝利判定 ===========
const replayArea = document.getElementById("replay-area");
const replayBtn = document.getElementById("replay-btn");
function showReplayBtn() {
  replayArea.style.display = "flex";
}
function hideReplayBtn() {
  replayArea.style.display = "none";
}
replayBtn.onclick = () => {
  setStats(player, player.lv, nowPlayerName);
  setStats(opponent, opponent.lv, nowOpponentName);
  updateUI();
  inProgress = true;
  hideReplayBtn();
  playerFlinch = false;
  oppFlinch = false;
  setTimeout(startBattle, 200);
};
function checkWinOrNext() {
  if (opponent.hp <= 0) {
    inProgress = false;
    document.getElementById("opp-sprite").classList.add("xy-sink");
    playWin();
    showMessage(
      `${opponent.name}は たおれた！ しょうり！`,
      showReplayBtn,
      1700
    );
    hideMoveMenu();
    return;
  }
  if (player.hp <= 0) {
    inProgress = false;
    document.getElementById("player-sprite").classList.add("xy-sink");
    bgm.pause();
    showMessage(
      `${player.name}は たおれた… まけてしまった…`,
      showReplayBtn,
      1700
    );
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

// =========== BGM ===========
const bgm = document.getElementById("battle-bgm");
const winBgm = document.getElementById("win-bgm");
const volInput = document.getElementById("volume-range");
volInput.value = Math.round(bgmVolume * 100);
volInput.oninput = (e) => {
  bgmVolume = volInput.value / 100;
  bgm.volume = bgmVolume;
  winBgm.volume = bgmVolume;
};
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

// =========== オプションUI ===========
const oppSelect = document.getElementById("opp-mon-select");
const playerSelect = document.getElementById("player-mon-select");
function setupMonSelects() {
  oppSelect.innerHTML = "";
  playerSelect.innerHTML = "";
  Object.keys(POKEMON_DB).forEach((name) => {
    let opt1 = document.createElement("option");
    opt1.value = opt1.textContent = name;
    let opt2 = document.createElement("option");
    opt2.value = opt2.textContent = name;
    oppSelect.appendChild(opt1);
    playerSelect.appendChild(opt2);
  });
  oppSelect.value = nowOpponentName;
  playerSelect.value = nowPlayerName;
}
document.getElementById("lv-apply").onclick = () => {
  nowOpponentName = oppSelect.value;
  nowPlayerName = playerSelect.value;
  let plv = parseInt(document.getElementById("player-lv-input").value) || 50;
  let olv = parseInt(document.getElementById("opp-lv-input").value) || 50;
  setStats(player, plv, nowPlayerName);
  setStats(opponent, olv, nowOpponentName);
  updateUI();
  document.getElementById("message").textContent = "ポケモン・レベル変更適用！";
  inProgress = true;
  showMoveMenu();
  setBGM();
};
function setBGM() {
  if (nowOpponentName === "レックウザ") {
    bgm.src = "mp3/battle_densetsu.mp3";
  } else {
    bgm.src = "mp3/battle.mp3";
  }
  bgm.load();
  playBGM();
}

// =========== オプションパネル開閉 ===========
const optBtn = document.getElementById("options-btn");
const optPanel = document.getElementById("options-panel");
const optClose = document.getElementById("options-close");
optBtn.onclick = () => optPanel.classList.add("show");
optClose.onclick = () => optPanel.classList.remove("show");
optPanel.addEventListener("click", (e) => {
  if (e.target === optPanel) optPanel.classList.remove("show");
});

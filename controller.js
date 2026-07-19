(function () {
  "use strict";

  const DEAD_ZONE = 0.55;
  const MOVE_FIRST_DELAY = 260;
  const MOVE_REPEAT = 150;
  const ACTION_PULSE = 80;

  const KEY = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    MAP: 32,
    MENU: 65,
    DIRECTION: 67,
    SHOOT: 83,
    CANCEL: 88,
    ACTION: 90
  };

  let activePadIndex = null;
  let rafId = 0;
  let searchTimer = 0;

  const moveState = {
    37: { down: false, next: 0 },
    38: { down: false, next: 0 },
    39: { down: false, next: 0 },
    40: { down: false, next: 0 }
  };

  const buttonState = Object.create(null);

  function writeKey(code, pressed) {
    const value = pressed ? 1 : 0;

    if (typeof pushing_key_list !== "undefined") {
      pushing_key_list[code] = value;
    }

    /* ゲーム側の通常キーボード入力にも同時に渡す */
    try {
      const event = new KeyboardEvent(pressed ? "keydown" : "keyup", {
        keyCode: code,
        which: code,
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(event, "keyCode", { get: () => code });
      Object.defineProperty(event, "which", { get: () => code });
      document.dispatchEvent(event);
    } catch (_) {}
  }

  function pulse(code) {
    writeKey(code, true);
    setTimeout(function () {
      writeKey(code, false);
    }, ACTION_PULSE);
  }

  function pressed(pad, index) {
    const button = pad.buttons[index];
    return !!button && (button.pressed || button.value > 0.5);
  }

  function edgeButton(pad, index, code) {
    const down = pressed(pad, index);
    const before = !!buttonState[index];

    if (down && !before) {
      pulse(code);
    }

    buttonState[index] = down;
  }

  function repeatMove(code, down, now) {
    const state = moveState[code];

    if (!down) {
      state.down = false;
      state.next = 0;
      writeKey(code, false);
      return;
    }

    if (!state.down) {
      state.down = true;
      state.next = now + MOVE_FIRST_DELAY;
      pulse(code);
      return;
    }

    if (now >= state.next) {
      state.next = now + MOVE_REPEAT;
      pulse(code);
    }
  }

  function releaseAll() {
    Object.keys(moveState).forEach(function (code) {
      writeKey(Number(code), false);
      moveState[code].down = false;
      moveState[code].next = 0;
    });

    [KEY.MAP, KEY.MENU, KEY.DIRECTION, KEY.SHOOT, KEY.CANCEL, KEY.ACTION]
      .forEach(function (code) {
        writeKey(code, false);
      });

    Object.keys(buttonState).forEach(function (index) {
      buttonState[index] = false;
    });
  }

  function getConnectedPad() {
    if (!navigator.getGamepads) return null;

    const pads = navigator.getGamepads();

    if (activePadIndex !== null) {
      const active = pads[activePadIndex];
      if (active && active.connected) return active;
    }

    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        activePadIndex = i;
        return pads[i];
      }
    }

    return null;
  }

  function poll(now) {
    const pad = getConnectedPad();

    if (!pad) {
      releaseAll();
      activePadIndex = null;
      rafId = 0;
      startSearching();
      return;
    }

    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;

    repeatMove(KEY.LEFT,  pressed(pad, 14) || x < -DEAD_ZONE, now);
    repeatMove(KEY.RIGHT, pressed(pad, 15) || x >  DEAD_ZONE, now);
    repeatMove(KEY.UP,    pressed(pad, 12) || y < -DEAD_ZONE, now);
    repeatMove(KEY.DOWN,  pressed(pad, 13) || y >  DEAD_ZONE, now);

    edgeButton(pad, 0, KEY.ACTION);                    // A / ×
    edgeButton(pad, 1, KEY.CANCEL);                    // B / ○
    edgeButton(pad, 2, KEY.MENU);                      // X / □
    edgeButton(pad, 3, KEY.SHOOT);                     // Y / △
    edgeButton(pad, 4, KEY.DIRECTION);                 // L1
    edgeButton(pad, 5, KEY.MAP);                       // R1
    edgeButton(pad, 8, KEY.MAP);                       // Select
    edgeButton(pad, 9, KEY.MENU);                      // Start

    rafId = requestAnimationFrame(poll);
  }

  function startPolling() {
    if (rafId) return;
    stopSearching();
    rafId = requestAnimationFrame(poll);
  }

  function searchForPad() {
    const pad = getConnectedPad();
    if (pad) startPolling();
  }

  function startSearching() {
    if (searchTimer) return;
    searchTimer = window.setInterval(searchForPad, 300);
  }

  function stopSearching() {
    if (!searchTimer) return;
    clearInterval(searchTimer);
    searchTimer = 0;
  }

  window.addEventListener("gamepadconnected", function (event) {
    activePadIndex = event.gamepad.index;
    startPolling();
  });

  window.addEventListener("gamepaddisconnected", function () {
    releaseAll();
    activePadIndex = null;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    startSearching();
  });

  window.addEventListener("load", function () {
    /*
      iPhoneでは接続イベントが来ない場合があるため、
      最初から300ms間隔で接続済みパッドを探す。
    */
    startSearching();

    /*
      Safariは最初のボタン操作後にGamepad APIを公開する場合がある。
      画面タップでも再検索する。
    */
    document.addEventListener("pointerup", searchForPad);
    document.addEventListener("touchend", searchForPad);
  });
})();
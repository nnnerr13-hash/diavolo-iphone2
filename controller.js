(function () {
  "use strict";

  const DEAD_ZONE = 0.55;
  const POLL_INTERVAL = 32;
  const MOVE_FIRST_DELAY = 260;
  const MOVE_REPEAT = 170;
  const MOVE_PRESS_TIME = 90;
  const ACTION_PRESS_TIME = 70;

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
  let timer = 0;

  const moveState = {
    37: { held: false, next: 0, releaseTimer: 0 },
    38: { held: false, next: 0, releaseTimer: 0 },
    39: { held: false, next: 0, releaseTimer: 0 },
    40: { held: false, next: 0, releaseTimer: 0 }
  };

  const buttonState = Object.create(null);

  function keyDown(code) {
    if (typeof document.onkeydown === "function") {
      document.onkeydown({ keyCode: code });
    } else if (typeof pushing_key_list !== "undefined") {
      pushing_key_list[code] = 1;
    }
  }

  function keyUp(code) {
    if (typeof document.onkeyup === "function") {
      document.onkeyup({ keyCode: code });
    } else if (typeof pushing_key_list !== "undefined") {
      pushing_key_list[code] = 0;
    }
  }

  function pulse(code, duration) {
    keyDown(code);
    return window.setTimeout(function () {
      keyUp(code);
    }, duration);
  }

  function isPressed(pad, index) {
    const button = pad.buttons[index];
    return !!button && (button.pressed || button.value > 0.5);
  }

  function repeatMove(code, down, now) {
    const state = moveState[code];

    if (!down) {
      if (state.releaseTimer) {
        clearTimeout(state.releaseTimer);
        state.releaseTimer = 0;
      }
      if (state.held) keyUp(code);
      state.held = false;
      state.next = 0;
      return;
    }

    if (!state.held) {
      state.held = true;
      state.next = now + MOVE_FIRST_DELAY;
      state.releaseTimer = pulse(code, MOVE_PRESS_TIME);
      return;
    }

    if (now >= state.next) {
      state.next = now + MOVE_REPEAT;
      if (state.releaseTimer) clearTimeout(state.releaseTimer);
      state.releaseTimer = pulse(code, MOVE_PRESS_TIME);
    }
  }

  function edgeButton(pad, index, code) {
    const down = isPressed(pad, index);
    const before = !!buttonState[index];
    if (down && !before) pulse(code, ACTION_PRESS_TIME);
    buttonState[index] = down;
  }

  function releaseAll() {
    Object.keys(moveState).forEach(function (codeText) {
      const code = Number(codeText);
      const state = moveState[code];
      if (state.releaseTimer) clearTimeout(state.releaseTimer);
      state.releaseTimer = 0;
      state.held = false;
      state.next = 0;
      keyUp(code);
    });

    [KEY.MAP, KEY.MENU, KEY.DIRECTION, KEY.SHOOT, KEY.CANCEL, KEY.ACTION]
      .forEach(keyUp);

    Object.keys(buttonState).forEach(function (index) {
      buttonState[index] = false;
    });
  }

  function findPad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();

    if (activePadIndex !== null) {
      const current = pads[activePadIndex];
      if (current && current.connected) return current;
    }

    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        activePadIndex = i;
        return pads[i];
      }
    }

    activePadIndex = null;
    return null;
  }

  function poll() {
    const pad = findPad();
    if (!pad) {
      releaseAll();
      return;
    }

    const now = performance.now();
    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;

    repeatMove(KEY.LEFT,  isPressed(pad, 14) || x < -DEAD_ZONE, now);
    repeatMove(KEY.RIGHT, isPressed(pad, 15) || x >  DEAD_ZONE, now);
    repeatMove(KEY.UP,    isPressed(pad, 12) || y < -DEAD_ZONE, now);
    repeatMove(KEY.DOWN,  isPressed(pad, 13) || y >  DEAD_ZONE, now);

    edgeButton(pad, 0, KEY.ACTION);
    edgeButton(pad, 1, KEY.CANCEL);
    edgeButton(pad, 2, KEY.MENU);
    edgeButton(pad, 3, KEY.SHOOT);
    edgeButton(pad, 4, KEY.DIRECTION);
    edgeButton(pad, 5, KEY.MAP);
    edgeButton(pad, 8, KEY.MAP);
    edgeButton(pad, 9, KEY.MENU);
  }

  function start() {
    if (!timer) timer = window.setInterval(poll, POLL_INTERVAL);
  }

  window.addEventListener("gamepadconnected", function (event) {
    activePadIndex = event.gamepad.index;
    start();
  });

  window.addEventListener("gamepaddisconnected", function () {
    releaseAll();
    activePadIndex = null;
  });

  window.addEventListener("blur", releaseAll);
  window.addEventListener("load", start);
})();

(function () {
  "use strict";

  const DEAD_ZONE = 0.55;
  const MOVE_FIRST_DELAY = 240;
  const MOVE_REPEAT = 135;
  const ACTION_PULSE = 65;
  const POLL_INTERVAL = 32; // 約30fps。60fps監視より軽い

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
    37: { down: false, next: 0 },
    38: { down: false, next: 0 },
    39: { down: false, next: 0 },
    40: { down: false, next: 0 }
  };

  const buttonState = Object.create(null);

  function setKey(code, pressed) {
    if (typeof pushing_key_list === "undefined") return;

    const value = pressed ? 1 : 0;
    if (pushing_key_list[code] !== value) {
      pushing_key_list[code] = value;
    }
  }

  function pulse(code) {
    setKey(code, true);
    setTimeout(function () {
      setKey(code, false);
    }, ACTION_PULSE);
  }

  function isPressed(pad, index) {
    const button = pad.buttons[index];
    return !!button && (button.pressed || button.value > 0.5);
  }

  function edgeButton(pad, index, code) {
    const down = isPressed(pad, index);
    const before = !!buttonState[index];

    if (down && !before) {
      pulse(code);
    }

    buttonState[index] = down;
  }

  function repeatMove(code, down, now) {
    const state = moveState[code];

    if (!down) {
      if (state.down) setKey(code, false);
      state.down = false;
      state.next = 0;
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
      const n = Number(code);
      setKey(n, false);
      moveState[n].down = false;
      moveState[n].next = 0;
    });

    [KEY.MAP, KEY.MENU, KEY.DIRECTION, KEY.SHOOT, KEY.CANCEL, KEY.ACTION]
      .forEach(function (code) {
        setKey(code, false);
      });

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
    if (timer) return;
    timer = window.setInterval(poll, POLL_INTERVAL);
  }

  window.addEventListener("gamepadconnected", function (event) {
    activePadIndex = event.gamepad.index;
    start();
  });

  window.addEventListener("gamepaddisconnected", function () {
    releaseAll();
    activePadIndex = null;
  });

  window.addEventListener("load", start);
})();
(function () {
  "use strict";

  const DEAD_ZONE = 0.55;
  const MOVE_FIRST_DELAY = 260;
  const MOVE_REPEAT = 150;
  const ACTION_PULSE = 70;

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
  const moveState = {
    37: { down: false, next: 0 },
    38: { down: false, next: 0 },
    39: { down: false, next: 0 },
    40: { down: false, next: 0 }
  };
  const buttonState = Object.create(null);

  function setKey(code, value) {
    if (typeof pushing_key_list !== "undefined") {
      pushing_key_list[code] = value ? 1 : 0;
    }
  }

  function pulse(code) {
    setKey(code, true);
    setTimeout(function () { setKey(code, false); }, ACTION_PULSE);
  }

  function isPressed(pad, index) {
    const button = pad.buttons[index];
    return !!button && (button.pressed || button.value > 0.5);
  }

  function edgeButton(pad, index, code) {
    const now = isPressed(pad, index);
    const before = !!buttonState[index];
    if (now && !before) pulse(code);
    buttonState[index] = now;
  }

  function repeatMove(code, down, now) {
    const state = moveState[code];

    if (!down) {
      state.down = false;
      state.next = 0;
      setKey(code, false);
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
      setKey(Number(code), false);
      moveState[code].down = false;
      moveState[code].next = 0;
    });
    [KEY.MAP, KEY.MENU, KEY.DIRECTION, KEY.SHOOT, KEY.CANCEL, KEY.ACTION]
      .forEach(function (code) { setKey(code, false); });
  }

  function poll(now) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = activePadIndex !== null ? pads[activePadIndex] : null;

    if (!pad || !pad.connected) {
      releaseAll();
      activePadIndex = null;
      rafId = 0;
      return;
    }

    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;

    repeatMove(KEY.LEFT,  isPressed(pad, 14) || x < -DEAD_ZONE, now);
    repeatMove(KEY.RIGHT, isPressed(pad, 15) || x >  DEAD_ZONE, now);
    repeatMove(KEY.UP,    isPressed(pad, 12) || y < -DEAD_ZONE, now);
    repeatMove(KEY.DOWN,  isPressed(pad, 13) || y >  DEAD_ZONE, now);

    edgeButton(pad, 0, KEY.ACTION);                 // A
    edgeButton(pad, 1, KEY.CANCEL);                 // B
    edgeButton(pad, 2, KEY.MENU);                   // X
    edgeButton(pad, 3, KEY.SHOOT);                  // Y
    edgeButton(pad, 4, KEY.DIRECTION);              // L1
    edgeButton(pad, 5, KEY.MAP);                    // R1
    edgeButton(pad, 8, KEY.MAP);                    // Select
    edgeButton(pad, 9, KEY.MENU);                   // Start

    rafId = requestAnimationFrame(poll);
  }

  window.addEventListener("gamepadconnected", function (event) {
    activePadIndex = event.gamepad.index;
    if (!rafId) rafId = requestAnimationFrame(poll);
  });

  window.addEventListener("gamepaddisconnected", function () {
    releaseAll();
    activePadIndex = null;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  });

  window.addEventListener("load", function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        activePadIndex = i;
        rafId = requestAnimationFrame(poll);
        break;
      }
    }
  });
})();
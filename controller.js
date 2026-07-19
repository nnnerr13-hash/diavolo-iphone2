(function () {
  "use strict";

  const DEAD_ZONE = 0.55;
  const POLL_INTERVAL = 32;
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
  let timer = 0;
  const buttonState = Object.create(null);
  const directionState = Object.create(null);

  function setKey(code, pressed) {
    if (typeof pushing_key_list === "undefined") return;
    const value = pressed ? 1 : 0;
    if (pushing_key_list[code] !== value) {
      pushing_key_list[code] = value;
    }
  }

  function setDirection(code, down) {
    const before = !!directionState[code];
    if (before === down) return;
    directionState[code] = down;
    setKey(code, down);
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
    if (down && !before) pulse(code);
    buttonState[index] = down;
  }

  function releaseAll() {
    [KEY.LEFT, KEY.UP, KEY.RIGHT, KEY.DOWN].forEach(function (code) {
      directionState[code] = false;
      setKey(code, false);
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

    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;

    /*
      方向入力は押している間ずっと1を維持。
      ゲーム本体側の長押し・連続移動処理に任せる。
    */
    setDirection(KEY.LEFT,  isPressed(pad, 14) || x < -DEAD_ZONE);
    setDirection(KEY.RIGHT, isPressed(pad, 15) || x >  DEAD_ZONE);
    setDirection(KEY.UP,    isPressed(pad, 12) || y < -DEAD_ZONE);
    setDirection(KEY.DOWN,  isPressed(pad, 13) || y >  DEAD_ZONE);

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
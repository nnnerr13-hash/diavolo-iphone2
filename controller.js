(function () {
  "use strict";

  /* Stability-check version: one input per physical press, no hold repeat. */
  var DEAD_ZONE = 0.68;
  var POLL_INTERVAL = 32;

  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    MAP: 32, MENU: 65, DIRECTION: 67, SHOOT: 83,
    CANCEL: 88, ACTION: 90
  };

  var activePadIndex = null;
  var previous = Object.create(null);
  var timer = 0;

  function setKey(code, value) {
    if (typeof pushing_key_list !== "undefined") {
      pushing_key_list[code] = value;
    }
  }

  function pressOnce(id, down, code) {
    var wasDown = !!previous[id];
    if (down && !wasDown) {
      setKey(code, 1);
    }
    previous[id] = down;
  }

  function isPressed(pad, index) {
    var button = pad && pad.buttons ? pad.buttons[index] : null;
    return !!button && (button.pressed || button.value > 0.5);
  }

  function findPad() {
    if (!navigator.getGamepads) return null;
    var pads = navigator.getGamepads();
    if (activePadIndex !== null) {
      var current = pads[activePadIndex];
      if (current && current.connected) return current;
    }
    for (var i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i].connected) {
        activePadIndex = i;
        return pads[i];
      }
    }
    activePadIndex = null;
    return null;
  }

  function clearState() {
    previous = Object.create(null);
    [37,38,39,40,32,65,67,83,88,90].forEach(function (code) {
      setKey(code, 0);
    });
  }

  function poll() {
    var pad = findPad();
    if (!pad) {
      clearState();
      return;
    }

    var x = (pad.axes && pad.axes.length > 0) ? (pad.axes[0] || 0) : 0;
    var y = (pad.axes && pad.axes.length > 1) ? (pad.axes[1] || 0) : 0;

    pressOnce("left",  isPressed(pad, 14) || x < -DEAD_ZONE, KEY.LEFT);
    pressOnce("right", isPressed(pad, 15) || x >  DEAD_ZONE, KEY.RIGHT);
    pressOnce("up",    isPressed(pad, 12) || y < -DEAD_ZONE, KEY.UP);
    pressOnce("down",  isPressed(pad, 13) || y >  DEAD_ZONE, KEY.DOWN);

    pressOnce("b0", isPressed(pad, 0), KEY.ACTION);
    pressOnce("b1", isPressed(pad, 1), KEY.CANCEL);
    pressOnce("b2", isPressed(pad, 2), KEY.MENU);
    pressOnce("b3", isPressed(pad, 3), KEY.SHOOT);
    pressOnce("b4", isPressed(pad, 4), KEY.DIRECTION);
    pressOnce("b5", isPressed(pad, 5), KEY.MAP);
    pressOnce("b8", isPressed(pad, 8), KEY.MAP);
    pressOnce("b9", isPressed(pad, 9), KEY.MENU);
  }

  function start() {
    if (!timer) timer = window.setInterval(poll, POLL_INTERVAL);
  }

  window.addEventListener("gamepadconnected", function (event) {
    activePadIndex = event.gamepad.index;
    clearState();
    start();
  });
  window.addEventListener("gamepaddisconnected", function () {
    activePadIndex = null;
    clearState();
  });
  window.addEventListener("blur", clearState);
  window.addEventListener("load", start);
})();

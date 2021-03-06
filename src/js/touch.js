/** @typedef {[number, number]} Point */
/** @typedef {'x'|'y'} Direction */

export class TouchGestureListener {
  constructor(targetElement, { minDistanceX = 20, minDistanceY = 20, clickParts = 3, yRadian = Math.PI / 2 } = {}) {
    this.listeners = new Map();
    this.minDistanceX = minDistanceX;
    this.minDistanceY = minDistanceY;
    this.minDistance = Math.min(minDistanceX, minDistanceY);
    this.clickParts = clickParts;

    /** @type {Point} */
    let startPos = null, lastPos = null;
    /** @type {Direction} */
    let direction = null;
    let isTouch = null;
    const calculateDirection = ([dx, dy]) => {
      const distance = Math.hypot(dx, dy);
      if (distance > this.minDistance) {
        const angle = Math.atan2(dy, dx);
        return Math.abs(angle - (angle > 0 ? 1 : -1) * Math.PI / 2) < yRadian / 2 ? 'y' : 'x';
      }
      return null;
    };
    /** @type {Object<string, (position: Point) => any>} */
    const touchStartHandler = (x, y) => {
      startPos = [x, y];
      lastPos = [x, y];
      direction = null;
    };
    const touchCancelHandler = () => {
      if (direction) {
        const action = direction === 'x' ? 'cancelx' : 'cancely';
        this.trigger(action);
      }
      startPos = null;
      lastPos = null;
      direction = null;
    };
    const touchMoveHandler = (x, y) => {
      if (!startPos) return;
      const [dx, dy] = [x - startPos[0], y - startPos[1]];
      lastPos = [x, y];
      if (direction === null) {
        direction = calculateDirection([dx, dy]);
      }
      if (direction) {
        const offset = direction === 'x' ? dx : dy;
        const action = direction === 'x' ? 'movex' : 'movey';
        this.trigger(action, offset);
      }
    };
    const touchEndHandler = () => {
      if (!lastPos || !startPos) {
        touchCancelHandler();
        return;
      }
      const [dx, dy] = [lastPos[0] - startPos[0], lastPos[1] - startPos[1]];
      const offset = direction === 'x' ? dx : direction === 'y' ? dy : 0;
      if (!direction) {
        const parts = this.clickParts;
        const x = startPos[0], w = window.innerWidth;
        let action = 'touch';
        if (parts === 2) {
          action = ['touchleft', 'touchright'][Math.floor(x * 2 / w)];
        } else if (parts === 3) {
          action = ['touchleft', 'touchmiddle', 'touchright'][Math.floor(x * 3 / w)];
        }
        this.trigger(action);
      } else {
        const minDistanceArrow = direction === 'x' ? this.minDistanceX : this.minDistanceY;
        if (Math.abs(offset) < minDistanceArrow) {
          const action = direction === 'x' ? 'cancelx' : 'cancely';
          this.trigger(action);
        } else {
          const action = direction === 'x' ? dx > 0 ? 'slideright' : 'slideleft' :
            dy > 0 ? 'slidedown' : 'slideup';
          this.trigger(action);
        }
      }
      startPos = null;
      lastPos = null;
      direction = null;
    };
    const moveListener = new TouchMoveListener(targetElement);
    moveListener.onTouchStart(touchStartHandler);
    moveListener.onTouchMove(touchMoveHandler);
    moveListener.onTouchEnd(touchEndHandler);
    moveListener.onTouchCancel(touchCancelHandler);

    this.dispatch = () => {
      moveListener.dispatch();
    };
  }
  trigger(action, offset = null) {
    if (!this.listeners.has(action)) return;
    this.listeners.get(action).forEach(listener => {
      listener(offset);
    });
  }
  addListener(action, listener) {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    this.listeners.get(action).push(listener);
  }
  onTouch(listener) { return this.addListener('touch', listener); }
  onTouchLeft(listener) { return this.addListener('touchleft', listener); }
  onTouchRight(listener) { return this.addListener('touchright', listener); }
  onTouchMiddle(listener) { return this.addListener('touchmiddle', listener); }
  onMoveX(listener) { return this.addListener('movex', listener); }
  onMoveY(listener) { return this.addListener('movey', listener); }
  onCancelX(listener) { return this.addListener('cancelx', listener); }
  onCancelY(listener) { return this.addListener('cancely', listener); }
  onSlideUp(listener) { return this.addListener('slideup', listener); }
  onSlideDown(listener) { return this.addListener('slidedown', listener); }
  onSlideLeft(listener) { return this.addListener('slideleft', listener); }
  onSlideRight(listener) { return this.addListener('slideright', listener); }
}

export class TouchMoveListener {
  /**
   * @param {HTMLElement} element
   */
  constructor(element) {
    this.element = element;
    /** @type {((x: number, y: number) => any)[]} */
    this.touchMoveCallbackList = [];
    /** @type {((x: number, y: number) => any)[]} */
    this.touchStartCallbackList = [];
    /** @type {(() => any)[]} */
    this.touchEndCallbackList = [];
    /** @type {(() => any)[]} */
    this.touchCancelCallbackList = [];

    let mouseDown = false, touchStart = false;
    const addGlobalMouseHandlers = () => {
      document.addEventListener('mouseup', mouseUpHandler);
      document.addEventListener('mouseleave', mouseCancelHandler);
      document.addEventListener('mousemove', mouseMoveHandler);
    };
    const removeGlobalMouseHandlers = () => {
      document.removeEventListener('mouseup', mouseUpHandler);
      document.removeEventListener('mouseleave', mouseCancelHandler);
      document.removeEventListener('mousemove', mouseMoveHandler);
    };
    const mouseDownHandler = event => {
      if (touchStart) {
        touchStart = false;
        return;
      }
      mouseDown = true;
      this.triggerCallback('start', event.pageX, event.pageY);
      addGlobalMouseHandlers();
    };
    const mouseUpHandler = event => {
      if (mouseDown) this.triggerCallback('end');
      mouseDown = false;
      removeGlobalMouseHandlers();
    };
    const mouseCancelHandler = event => {
      if (mouseDown) this.triggerCallback('end');
      mouseDown = false;
      removeGlobalMouseHandlers();
    };
    const mouseMoveHandler = event => {
      if (mouseDown) this.triggerCallback('move', event.pageX, event.pageY);
    };
    const addGlobalTouchHandlers = () => {
      document.addEventListener('touchend', touchEndHandler);
      document.addEventListener('touchcancel', touchCancelHandler);
      document.addEventListener('touchmove', touchMoveHandler);
    };
    const removeGlobalTouchHandlers = () => {
      document.removeEventListener('touchend', touchEndHandler);
      document.removeEventListener('touchcancel', touchCancelHandler);
      document.removeEventListener('touchmove', touchMoveHandler);
    };
    const touchStartHandler = event => {
      touchStart = true;
      const touch = event.touches.item(0);
      this.triggerCallback('start', touch.pageX, touch.pageY);
      addGlobalTouchHandlers();
    };
    const touchEndHandler = event => {
      if (touchStart) this.triggerCallback('end');
      removeGlobalTouchHandlers();
    };
    const touchCancelHandler = event => {
      if (touchStart) this.triggerCallback('cancel');
      removeGlobalTouchHandlers();
    };
    const touchMoveHandler = event => {
      const touch = event.touches.item(0);
      if (touchStart) this.triggerCallback('move', touch.pageX, touch.pageY);
    };

    this.element.addEventListener('mousedown', mouseDownHandler);
    this.element.addEventListener('touchstart', touchStartHandler);
    const dispatch = () => {
      this.element.removeEventListener('mousedown', mouseDownHandler);
      removeGlobalMouseHandlers();
      this.element.removeEventListener('touchstart', touchStartHandler);
      removeGlobalTouchHandlers();
    };

    this.dispatch = dispatch;
  }
  /**
   * @param {'move'|'start'|'end'|'cancel'} type
   * @param {number} x
   * @param {number} y
   */
  triggerCallback(type, x, y) {
    const callbackList = {
      move: this.touchMoveCallbackList,
      start: this.touchStartCallbackList,
      end: this.touchEndCallbackList,
      cancel: this.touchCancelCallbackList,
    }[type];
    callbackList.forEach(callback => {
      callback(x, y);
    });
  }
  /** @param {(x: number, y: number) => any} callback */
  onTouchMove(callback) {
    this.touchMoveCallbackList.push(callback);
  }
  /** @param {(x: number, y: number) => any} callback */
  onTouchStart(callback) {
    this.touchStartCallbackList.push(callback);
  }
  /** @param {() => any} callback */
  onTouchEnd(callback) {
    this.touchEndCallbackList.push(callback);
  }
  /** @param {() => any} callback */
  onTouchCancel(callback) {
    this.touchCancelCallbackList.push(callback);
  }
}


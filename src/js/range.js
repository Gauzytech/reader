import { TouchMoveListener } from './touch.js';

/**
 * @typedef {Object} RangeConfig
 * @property {number} min
 * @property {number} max
 * @property {number} step
 */


export default class RangeInput {
  /**
   * @param {HTMLElement} outer
   * @param {RangeConfig} config
   */
  constructor(outer, config) {
    this.container = outer.appendChild(document.createElement('div'));
    this.setConfig(config);

    /** @type {((value: number) => any)[]} */
    this.onValueChange = [];

    this.container.classList.add('range-container');
    this.container.setAttribute('role', 'slide');
    this.container.setAttribute('tabindex', '0');
    this.wrap = this.container.appendChild(document.createElement('div'));
    this.wrap.classList.add('range-wrap');
    this.wrap.setAttribute('tabindex', '-1');
    this.thumb = this.wrap.appendChild(document.createElement('div'));
    this.thumb.classList.add('range-thumb');
    this.track = this.wrap.appendChild(document.createElement('div'));
    this.track.classList.add('range-track');

    const setRatio = ratio => {
      let pos = null;
      const config = this.config;
      if (ratio === 1) pos = config.max;
      if (ratio === 0) pos = config.min;
      else {
        pos = Math.min(config.max, Math.max(config.min,
          Math.round((config.max - config.min) * ratio / config.step) * config.step + config.min
        ));
      }
      this.updateValue(pos);
    };
    const mouseMove = pageX => {
      const clientX = pageX - this.track.getClientRects().item(0).x;
      const width = this.track.clientWidth;
      const ratio = clientX / width;
      setRatio(Math.min(Math.max(0, ratio), 1));
    };
    this.listener = new TouchMoveListener(this.container);
    this.listener.onTouchMove(mouseMove);
    this.listener.onTouchStart(mouseMove);

    this.keyboardHandler = this.keyboardHandler.bind(this);
    this.container.addEventListener('keydown', this.keyboardHandler);
  }
  /**
   * @param {RangeConfig} config
   */
  setConfig(config) {
    this.config = this.normalizeConfig(config);
    this.value = this.normalizeValue(config);

    this.container.setAttribute('aria-valuemin', this.config.min);
    this.container.setAttribute('aria-valuemax', this.config.max);
    this.container.setAttribute('aria-valuenow', this.value);
  }
  getConfig() {
    return this.config;
  }
  /** @param {number} value */
  setValue(value) {
    const newValue = this.normalizeValue(Object.assign({}, this.config, { value: Number(value) }));
    if (newValue !== this.value) {
      this.value = newValue;
      this.renderValue(newValue);
    }
  }
  async updateValue(newValue) {
    if (this.value === newValue) return;
    if (this.updatePendingValue != null) {
      this.updatePendingValue = newValue;
      return;
    } else {
      this.updatePendingValue = newValue;
      await new Promise(window.requestAnimationFrame);
    }
    const value = this.updatePendingValue;
    this.updatePendingValue = null;
    this.value = value;
    this.onValueChange.forEach(callback => {
      callback(value);
    });
    this.renderValue(value);
  }
  /** @param {(value: number) => any} callback */
  onChange(callback) {
    this.onValueChange.push(callback);
  }
  renderValue(value) {
    const config = this.config;
    const ratio = (value - config.min) / (config.max - config.min);
    this.container.style.setProperty('--range-ratio', ratio);
    this.container.setAttribute('aria-valuenow', value);
  }
  normalizeConfig(config) {
    let min = Number.isFinite(config.min) ? config.min : 0;
    let max = Number.isFinite(config.max) ? config.max : 1;
    if (min >= max) [min, max] = [0, 1];
    let step = Number.isFinite(config.step) ? config.step : 1;
    if (step <= 0) step = 1;
    return { min, max, step };
  }
  normalizeValue(config) {
    if (!Number.isFinite(config.value)) {
      return this.config.min;
    }
    if (config.value <= this.config.min) {
      return this.config.min;
    }
    if (config.value >= this.config.max) {
      return this.config.max;
    }
    return Math.round((config.value - this.config.min) / this.config.step) * this.config.step + this.config.min;
  }
  /** @param {KeyboardEvent} event */
  keyboardHandler(event) {
    if (!event.repeat) this.repeatCount = 0;
    else this.repeatCount++;
    const base = 1.2 ** this.repeatCount;
    const ratio = {
      ArrowUp: 1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowLeft: -1,
      PageUp: 10,
      PageDown: -10,
    }[event.code] || 0;
    if (!ratio) return;
    const total = (this.config.max - this.config.min) / this.config.step;
    const move = Math.min(base, total / 50) * ratio * this.config.step;
    const value = this.value + move;
    const newValue = this.normalizeValue(Object.assign({}, this.config, { value: value }));
    this.updateValue(newValue);
    event.preventDefault();
  }
  dispatch() {
    this.listener.dispatch();
    this.container.removeEventListener('keydown', this.keyboardHandler);
    this.container.remove();
  }
}

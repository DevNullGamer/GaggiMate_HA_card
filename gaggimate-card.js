import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

const MODES = {
  standby: { icon: 'mdi:power-sleep', color: '#9e9e9e', label: 'Standby' },
  brew: { icon: 'mdi:coffee', color: '#8B4513', label: 'Brew' },
  steam: { icon: 'mdi:kettle-steam', color: '#FF6B6B', label: 'Steam' },
  'hot water': { icon: 'mdi:water', color: '#4FC3F7', label: 'Hot Water' },
  grind: { icon: 'mdi:grain', color: '#795548', label: 'Grind' },
};

function fireEvent(node, type, detail, options = {}) {
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
}

class GaggiMateCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _device: { type: Object },
      _entities: { type: Object },
    };
  }

  static getConfigElement() {
    return document.createElement('gaggimate-card-editor');
  }

  static getStubConfig() {
    return {
      device_id: '',
      name: 'GaggiMate',
      show_profile: true,
      show_weight: true,
      show_controls: true,
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this.config = {
      name: 'GaggiMate',
      show_profile: true,
      show_weight: true,
      show_controls: true,
      ...config,
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateDeviceEntities();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('config') || changedProperties.has('hass')) {
      this._updateDeviceEntities();
    }
  }

  async _updateDeviceEntities() {
    if (!this.hass || !this.config.device_id) {
      this._entities = {};
      return;
    }

    try {
      const devices = await this.hass.callWS({
        type: 'config/device_registry/list',
      });

      const device = devices.find((d) => d.id === this.config.device_id);
      if (!device) {
        this._entities = {};
        return;
      }

      this._device = device;

      const entities = await this.hass.callWS({
        type: 'config/entity_registry/list',
      });

      const deviceEntities = entities.filter(
        (e) => e.device_id === this.config.device_id
      );

      this._entities = {
        currentTemp: this._findEntity(deviceEntities, 'current_temperature'),
        targetTemp: this._findEntity(deviceEntities, 'target_temperature'),
        mode: this._findEntity(deviceEntities, 'mode'),
        profile: this._findEntity(deviceEntities, 'profile', 'selected_profile'),
        weight: this._findEntity(deviceEntities, 'weight', 'current_weight'),
        machineActive: this._findEntity(deviceEntities, 'machine_active'),
        modeSelect: this._findEntity(deviceEntities, 'mode', null, 'select'),
        profileSelect: this._findEntity(deviceEntities, 'profile', 'selected_profile', 'select'),
        targetTempNumber: this._findEntity(deviceEntities, 'target_temperature', null, 'number'),
        startBrew: this._findEntity(deviceEntities, 'start_brew', null, 'button'),
        stopBrew: this._findEntity(deviceEntities, 'stop_brew', null, 'button'),
        startSteam: this._findEntity(deviceEntities, 'start_steam', null, 'button'),
        flush: this._findEntity(deviceEntities, 'flush', null, 'button'),
      };
    } catch (error) {
      console.error('Error fetching device entities:', error);
      this._entities = {};
    }
  }

  _findEntity(entities, ...keywords) {
    const domain = keywords[keywords.length - 1];
    const isValidDomain = ['sensor', 'switch', 'select', 'number', 'button'].includes(domain);
    const searchKeywords = isValidDomain ? keywords.slice(0, -1) : keywords;
    const targetDomain = isValidDomain ? domain : null;

    for (const entity of entities) {
      const entityId = entity.entity_id;
      const entityDomain = entityId.split('.')[0];

      if (targetDomain && entityDomain !== targetDomain) {
        continue;
      }

      const lowerId = entityId.toLowerCase();
      if (searchKeywords.some((keyword) => lowerId.includes(keyword.toLowerCase()))) {
        return entityId;
      }
    }
    return null;
  }

  _getEntityState(entityId) {
    return entityId && this.hass?.states[entityId];
  }

  _callService(domain, service, entityId, data = {}) {
    this.hass.callService(domain, service, {
      entity_id: entityId,
      ...data,
    });
  }

  _togglePower() {
    if (this._entities.machineActive) {
      this.hass.callService('switch', 'toggle', {
        entity_id: this._entities.machineActive,
      });
    }
  }

  _handleModeChange(e) {
    const mode = e.target.value;
    if (this._entities.modeSelect) {
      this._callService('select', 'select_option', this._entities.modeSelect, {
        option: mode,
      });
    }
  }

  _handleProfileChange(e) {
    const profile = e.target.value;
    if (this._entities.profileSelect) {
      this._callService('select', 'select_option', this._entities.profileSelect, {
        option: profile,
      });
    }
  }

  _handleTargetTempChange(e) {
    const temp = parseFloat(e.target.value);
    if (this._entities.targetTempNumber && !isNaN(temp)) {
      this._callService('number', 'set_value', this._entities.targetTempNumber, {
        value: temp,
      });
    }
  }

  _startBrew() {
    if (this._entities.startBrew) {
      this._callService('button', 'press', this._entities.startBrew);
    }
  }

  _stopBrew() {
    if (this._entities.stopBrew) {
      this._callService('button', 'press', this._entities.stopBrew);
    }
  }

  _startSteam() {
    if (this._entities.startSteam) {
      this._callService('button', 'press', this._entities.startSteam);
    }
  }

  _flush() {
    if (this._entities.flush) {
      this._callService('button', 'press', this._entities.flush);
    }
  }

  render() {
    if (!this.hass || !this.config.device_id) {
      return html`
        <ha-card>
          <div class="warning">Please configure the device in the card settings.</div>
        </ha-card>
      `;
    }

    const currentTempState = this._getEntityState(this._entities.currentTemp);
    const targetTempState = this._getEntityState(this._entities.targetTemp);
    const modeState = this._getEntityState(this._entities.mode);
    const profileState = this._getEntityState(this._entities.profile);
    const weightState = this._getEntityState(this._entities.weight);
    const machineActiveState = this._getEntityState(this._entities.machineActive);
    const modeSelectState = this._getEntityState(this._entities.modeSelect);
    const profileSelectState = this._getEntityState(this._entities.profileSelect);
    const targetTempNumberState = this._getEntityState(this._entities.targetTempNumber);

    const currentTemp = currentTempState?.state || '--';
    const targetTemp = targetTempState?.state || '--';
    const mode = modeState?.state?.toLowerCase() || 'standby';
    const profile = profileState?.state || 'Default';
    const weight = weightState?.state || '--';
    const isActive = machineActiveState?.state === 'on';

    const modeInfo = MODES[mode] || MODES.standby;

    return html`
      <ha-card>
        <div class="card-header">
          <div class="name">${this.config.name}</div>
          <ha-icon-button
            .path=${'M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z'}
            @click=${this._togglePower}
            class=${isActive ? 'active' : ''}
          ></ha-icon-button>
        </div>

        <div class="content">
          <div class="status-row">
            <div class="mode-indicator" style="background-color: ${modeInfo.color}">
              <ha-icon icon="${modeInfo.icon}"></ha-icon>
              <span>${modeInfo.label}</span>
            </div>
          </div>

          <div class="temperature-display">
            <div class="temp-circle">
              <div class="current-temp">${currentTemp}°</div>
              <div class="target-temp">→ ${targetTemp}°</div>
            </div>
          </div>

          ${this.config.show_profile && profileState
            ? html`
                <div class="info-row">
                  <ha-icon icon="mdi:coffee-outline"></ha-icon>
                  <span>Profile: ${profile}</span>
                </div>
              `
            : ''}
          ${this.config.show_weight && weightState
            ? html`
                <div class="info-row">
                  <ha-icon icon="mdi:scale"></ha-icon>
                  <span>Weight: ${weight}g</span>
                </div>
              `
            : ''}
          ${this.config.show_controls
            ? html`
                <div class="controls">
                  ${modeSelectState
                    ? html`
                        <div class="control-group">
                          <label>Mode</label>
                          <select @change=${this._handleModeChange}>
                            ${modeSelectState.attributes.options?.map(
                              (option) => html`
                                <option value="${option}" ?selected=${option === modeState?.state}>
                                  ${option}
                                </option>
                              `
                            )}
                          </select>
                        </div>
                      `
                    : ''}
                  ${profileSelectState
                    ? html`
                        <div class="control-group">
                          <label>Profile</label>
                          <select @change=${this._handleProfileChange}>
                            ${profileSelectState.attributes.options?.map(
                              (option) => html`
                                <option value="${option}" ?selected=${option === profileState?.state}>
                                  ${option}
                                </option>
                              `
                            )}
                          </select>
                        </div>
                      `
                    : ''}
                  ${targetTempNumberState
                    ? html`
                        <div class="control-group">
                          <label>Target Temp (°C)</label>
                          <input
                            type="number"
                            .value=${targetTemp}
                            @change=${this._handleTargetTempChange}
                            min="${targetTempNumberState.attributes.min || 80}"
                            max="${targetTempNumberState.attributes.max || 100}"
                            step="${targetTempNumberState.attributes.step || 0.1}"
                          />
                        </div>
                      `
                    : ''}

                  <div class="button-row">
                    ${this._entities.startBrew
                      ? html`
                          <button class="brew-button" @click=${this._startBrew}>
                            <ha-icon icon="mdi:coffee"></ha-icon>
                            Start Brew
                          </button>
                        `
                      : ''}
                    ${this._entities.stopBrew
                      ? html`
                          <button class="stop-button" @click=${this._stopBrew}>
                            <ha-icon icon="mdi:stop"></ha-icon>
                            Stop
                          </button>
                        `
                      : ''}
                    ${this._entities.startSteam
                      ? html`
                          <button class="steam-button" @click=${this._startSteam}>
                            <ha-icon icon="mdi:kettle-steam"></ha-icon>
                            Steam
                          </button>
                        `
                      : ''}
                    ${this._entities.flush
                      ? html`
                          <button class="flush-button" @click=${this._flush}>
                            <ha-icon icon="mdi:water"></ha-icon>
                            Flush
                          </button>
                        `
                      : ''}
                  </div>
                </div>
              `
            : ''}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      ha-card {
        padding: 16px;
        background: var(--ha-card-background, var(--card-background-color, white));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
      }

      .warning {
        padding: 16px;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 8px;
        color: #856404;
        text-align: center;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .name {
        font-size: 1.5em;
        font-weight: 500;
        color: var(--primary-text-color);
      }

      ha-icon-button {
        color: var(--secondary-text-color);
        transition: all 0.3s ease;
      }

      ha-icon-button.active {
        color: var(--success-color, #4caf50);
      }

      .content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .status-row {
        display: flex;
        justify-content: center;
      }

      .mode-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        color: white;
        font-weight: 500;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .mode-indicator ha-icon {
        --mdc-icon-size: 20px;
      }

      .temperature-display {
        display: flex;
        justify-content: center;
        padding: 20px 0;
      }

      .temp-circle {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 160px;
        height: 160px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        color: white;
      }

      .current-temp {
        font-size: 3em;
        font-weight: 700;
        line-height: 1;
      }

      .target-temp {
        font-size: 1.2em;
        opacity: 0.9;
        margin-top: 8px;
      }

      .info-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 8px;
      }

      .info-row ha-icon {
        color: var(--primary-color);
        --mdc-icon-size: 24px;
      }

      .controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 8px;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .control-group label {
        font-size: 0.9em;
        color: var(--secondary-text-color);
        font-weight: 500;
      }

      .control-group select,
      .control-group input {
        padding: 10px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 6px;
        font-size: 1em;
        background: var(--card-background-color, white);
        color: var(--primary-text-color);
      }

      .button-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 8px;
        margin-top: 8px;
      }

      .button-row button {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 8px;
        border: none;
        border-radius: 8px;
        font-size: 0.9em;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
      }

      .button-row button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      }

      .button-row button ha-icon {
        --mdc-icon-size: 24px;
      }

      .brew-button {
        background: linear-gradient(135deg, #8b4513, #654321);
      }

      .stop-button {
        background: linear-gradient(135deg, #f44336, #d32f2f);
      }

      .steam-button {
        background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
      }

      .flush-button {
        background: linear-gradient(135deg, #4fc3f7, #29b6f6);
      }
    `;
  }

  getCardSize() {
    return 5;
  }
}

customElements.define('gaggimate-card', GaggiMateCard);

// Card editor
class GaggiMateCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _devices: { type: Array },
    };
  }

  setConfig(config) {
    this.config = config;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadDevices();
  }

  async _loadDevices() {
    if (!this.hass) return;

    try {
      const devices = await this.hass.callWS({
        type: 'config/device_registry/list',
      });

      // Filter for GaggiMate devices
      this._devices = devices.filter(
        (device) =>
          device.manufacturer?.toLowerCase().includes('gaggimate') ||
          device.model?.toLowerCase().includes('gaggimate') ||
          device.name?.toLowerCase().includes('gaggimate')
      );
    } catch (error) {
      console.error('Error loading devices:', error);
      this._devices = [];
    }
  }

  _valueChanged(ev) {
    if (!this.config || !this.hass) {
      return;
    }

    const target = ev.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    if (this[`_${target.configValue}`] === value) {
      return;
    }

    const newConfig = {
      ...this.config,
      [target.configValue]: value,
    };

    fireEvent(this, 'config-changed', { config: newConfig });
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    return html`
      <div class="card-config">
        <div class="config-row">
          <label for="device">Device</label>
          <select
            id="device"
            .configValue=${'device_id'}
            .value=${this.config.device_id || ''}
            @change=${this._valueChanged}
          >
            <option value="">Select a GaggiMate device</option>
            ${this._devices?.map(
              (device) => html`
                <option value="${device.id}" ?selected=${device.id === this.config.device_id}>
                  ${device.name || device.id}
                </option>
              `
            )}
          </select>
        </div>

        <div class="config-row">
          <label for="name">Card Name</label>
          <input
            type="text"
            id="name"
            .configValue=${'name'}
            .value=${this.config.name || 'GaggiMate'}
            @change=${this._valueChanged}
          />
        </div>

        <div class="config-row checkbox">
          <label for="show_profile">Show Profile</label>
          <input
            type="checkbox"
            id="show_profile"
            .configValue=${'show_profile'}
            .checked=${this.config.show_profile !== false}
            @change=${this._valueChanged}
          />
        </div>

        <div class="config-row checkbox">
          <label for="show_weight">Show Weight</label>
          <input
            type="checkbox"
            id="show_weight"
            .configValue=${'show_weight'}
            .checked=${this.config.show_weight !== false}
            @change=${this._valueChanged}
          />
        </div>

        <div class="config-row checkbox">
          <label for="show_controls">Show Controls</label>
          <input
            type="checkbox"
            id="show_controls"
            .configValue=${'show_controls'}
            .checked=${this.config.show_controls !== false}
            @change=${this._valueChanged}
          />
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .config-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .config-row.checkbox {
        flex-direction: row-reverse;
        justify-content: flex-end;
        gap: 12px;
      }

      label {
        font-weight: 500;
        color: var(--primary-text-color);
      }

      input[type='text'],
      select {
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        min-width: 200px;
      }

      input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
    `;
  }
}

customElements.define('gaggimate-card-editor', GaggiMateCardEditor);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'gaggimate-card',
  name: 'GaggiMate Card',
  description: 'A custom card for controlling GaggiMate espresso machines',
  preview: true,
  documentationURL: 'https://github.com/DevNullGamer/GaggiMate_HA_card',
});

console.info(
  '%c GAGGIMATE-CARD %c Version 1.0.0 ',
  'color: white; background: #8B4513; font-weight: 700;',
  'color: #8B4513; background: white; font-weight: 700;'
);

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
      _entities: { type: Object },
    };
  }

  static getConfigElement() {
    return document.createElement('gaggimate-card-editor');
  }

  static getStubConfig() {
    return {
      entity: '',
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
    
    // If device_id is set, fetch entities
    if (config.device_id) {
      this._updateDeviceEntities();
    } else if (config.entity) {
      // If entity is set, derive entities from the base entity
      this._deriveEntitiesFromBase(config.entity);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.config?.device_id) {
      this._updateDeviceEntities();
    } else if (this.config?.entity) {
      this._deriveEntitiesFromBase(this.config.entity);
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has('hass') && this.hass) {
      if (this.config?.device_id && !this._entities) {
        this._updateDeviceEntities();
      } else if (this.config?.entity && !this._entities) {
        this._deriveEntitiesFromBase(this.config.entity);
      }
    }
  }

  _deriveEntitiesFromBase(baseEntity) {
    if (!this.hass || !baseEntity) {
      this._entities = {};
      return;
    }

    // Extract the base name from the entity (e.g., "sensor.gaggimate_current_temperature" -> "gaggimate")
    const parts = baseEntity.split('.');
    if (parts.length < 2) {
      this._entities = {};
      return;
    }

    const entityId = parts[1];
    const baseName = entityId.split('_')[0]; // e.g., "gaggimate"

    // Get all entities from hass
    const allEntities = Object.keys(this.hass.states);

    // Find entities that match the base name
    const matchingEntities = allEntities.filter(id => id.includes(baseName));

    this._entities = {
      currentTemp: this._findEntityInList(matchingEntities, 'current_temperature', 'sensor'),
      targetTemp: this._findEntityInList(matchingEntities, 'target_temperature', 'sensor'),
      mode: this._findEntityInList(matchingEntities, 'mode', 'sensor'),
      profile: this._findEntityInList(matchingEntities, ['profile', 'selected_profile'], 'sensor'),
      weight: this._findEntityInList(matchingEntities, ['weight', 'current_weight'], 'sensor'),
      machineActive: this._findEntityInList(matchingEntities, 'machine_active', 'switch'),
      modeSelect: this._findEntityInList(matchingEntities, 'mode', 'select'),
      profileSelect: this._findEntityInList(matchingEntities, ['profile', 'selected_profile'], 'select'),
      targetTempNumber: this._findEntityInList(matchingEntities, 'target_temperature', 'number'),
      startBrew: this._findEntityInList(matchingEntities, 'start_brew', 'button'),
      stopBrew: this._findEntityInList(matchingEntities, 'stop_brew', 'button'),
      startSteam: this._findEntityInList(matchingEntities, 'start_steam', 'button'),
      flush: this._findEntityInList(matchingEntities, 'flush', 'button'),
    };

    console.log('Derived entities:', this._entities);
  }

  _findEntityInList(entities, keywords, domain) {
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
    
    for (const entityId of entities) {
      const entityDomain = entityId.split('.')[0];
      if (entityDomain !== domain) continue;

      const lowerId = entityId.toLowerCase();
      if (keywordArray.some(keyword => lowerId.includes(keyword.toLowerCase()))) {
        return entityId;
      }
    }
    return null;
  }

  async _updateDeviceEntities() {
    if (!this.hass || !this.config.device_id) {
      this._entities = {};
      return;
    }

    try {
      const entities = await this.hass.callWS({
        type: 'config/entity_registry/list',
      });

      const deviceEntities = entities.filter(
        (e) => e.device_id === this.config.device_id
      );

      console.log('Found device entities:', deviceEntities);

      this._entities = {
        currentTemp: this._findEntity(deviceEntities, 'current_temperature', 'sensor'),
        targetTemp: this._findEntity(deviceEntities, 'target_temperature', 'sensor'),
        mode: this._findEntity(deviceEntities, 'mode', 'sensor'),
        profile: this._findEntity(deviceEntities, ['profile', 'selected_profile'], 'sensor'),
        weight: this._findEntity(deviceEntities, ['weight', 'current_weight'], 'sensor'),
        machineActive: this._findEntity(deviceEntities, 'machine_active', 'switch'),
        modeSelect: this._findEntity(deviceEntities, 'mode', 'select'),
        profileSelect: this._findEntity(deviceEntities, ['profile', 'selected_profile'], 'select'),
        targetTempNumber: this._findEntity(deviceEntities, 'target_temperature', 'number'),
        startBrew: this._findEntity(deviceEntities, 'start_brew', 'button'),
        stopBrew: this._findEntity(deviceEntities, 'stop_brew', 'button'),
        startSteam: this._findEntity(deviceEntities, 'start_steam', 'button'),
        flush: this._findEntity(deviceEntities, 'flush', 'button'),
      };

      console.log('Mapped entities:', this._entities);
    } catch (error) {
      console.error('Error fetching device entities:', error);
      this._entities = {};
    }
  }

  _findEntity(entities, keywords, domain) {
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];

    for (const entity of entities) {
      const entityId = entity.entity_id;
      const entityDomain = entityId.split('.')[0];

      if (entityDomain !== domain) continue;

      const lowerId = entityId.toLowerCase();
      if (keywordArray.some((keyword) => lowerId.includes(keyword.toLowerCase()))) {
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
    if (this._entities?.machineActive) {
      this.hass.callService('switch', 'toggle', {
        entity_id: this._entities.machineActive,
      });
    }
  }

  _handleModeChange(e) {
    const mode = e.target.value;
    if (this._entities?.modeSelect) {
      this._callService('select', 'select_option', this._entities.modeSelect, {
        option: mode,
      });
    }
  }

  _handleProfileChange(e) {
    const profile = e.target.value;
    if (this._entities?.profileSelect) {
      this._callService('select', 'select_option', this._entities.profileSelect, {
        option: profile,
      });
    }
  }

  _handleTargetTempChange(e) {
    const temp = parseFloat(e.target.value);
    if (this._entities?.targetTempNumber && !isNaN(temp)) {
      this._callService('number', 'set_value', this._entities.targetTempNumber, {
        value: temp,
      });
    }
  }

  _startBrew() {
    if (this._entities?.startBrew) {
      this._callService('button', 'press', this._entities.startBrew);
    }
  }

  _stopBrew() {
    if (this._entities?.stopBrew) {
      this._callService('button', 'press', this._entities.stopBrew);
    }
  }

  _startSteam() {
    if (this._entities?.startSteam) {
      this._callService('button', 'press', this._entities.startSteam);
    }
  }

  _flush() {
    if (this._entities?.flush) {
      this._callService('button', 'press', this._entities.flush);
    }
  }

  render() {
    if (!this.hass) {
      return html`<ha-card><div class="warning">Loading...</div></ha-card>`;
    }

    if (!this.config.device_id && !this.config.entity) {
      return html`
        <ha-card>
          <div class="warning">
            Please configure the card.<br/>
            Select any GaggiMate entity in the card editor.
          </div>
        </ha-card>
      `;
    }

    if (!this._entities || Object.keys(this._entities).length === 0) {
      return html`
        <ha-card>
          <div class="warning">
            No entities found. Make sure your GaggiMate integration is working.
          </div>
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
          ${this._entities.machineActive ? html`
            <ha-icon-button
              .path=${'M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z'}
              @click=${this._togglePower}
              class=${isActive ? 'active' : ''}
            ></ha-icon-button>
          ` : ''}
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
      _gaggiEntities: { type: Array },
    };
  }

  setConfig(config) {
    this.config = config;
  }

  async connectedCallback() {
    super.connectedCallback();
    await this._loadDevices();
    this._loadGaggiEntities();
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
      
      console.log('Found GaggiMate devices:', this._devices);
    } catch (error) {
      console.error('Error loading devices:', error);
      this._devices = [];
    }
  }

  _loadGaggiEntities() {
    if (!this.hass) return;

    // Get all entities
    const allEntities = Object.keys(this.hass.states);
    
    // Filter for entities that look like they're from GaggiMate
    this._gaggiEntities = allEntities.filter(entityId => {
      const state = this.hass.states[entityId];
      const integration = state.attributes?.integration;
      const name = entityId.toLowerCase();
      
      return integration === 'gaggimate' || 
             name.includes('gaggimate') || 
             name.includes('gaggia');
    });
    
    console.log('Found GaggiMate entities:', this._gaggiEntities);
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

    const hasDevices = this._devices && this._devices.length > 0;
    const hasEntities = this._gaggiEntities && this._gaggiEntities.length > 0;

    return html`
      <div class="card-config">
        ${hasDevices ? html`
          <div class="config-row">
            <label for="device">Device (Preferred)</label>
            <select
              id="device"
              .configValue=${'device_id'}
              .value=${this.config.device_id || ''}
              @change=${this._valueChanged}
            >
              <option value="">Select a GaggiMate device</option>
              ${this._devices.map(
                (device) => html`
                  <option value="${device.id}" ?selected=${device.id === this.config.device_id}>
                    ${device.name || device.id}
                  </option>
                `
              )}
            </select>
          </div>
        ` : ''}

        ${hasEntities ? html`
          <div class="config-row">
            <label for="entity">
              ${hasDevices ? 'Or select any GaggiMate entity' : 'Select any GaggiMate entity'}
            </label>
            <select
              id="entity"
              .configValue=${'entity'}
              .value=${this.config.entity || ''}
              @change=${this._valueChanged}
            >
              <option value="">Select an entity</option>
              ${this._gaggiEntities.map(
                (entityId) => html`
                  <option value="${entityId}" ?selected=${entityId === this.config.entity}>
                    ${entityId}
                  </option>
                `
              )}
            </select>
          </div>
        ` : ''}

        ${!hasDevices && !hasEntities ? html`
          <div class="warning">
            No GaggiMate devices or entities found. 
            Make sure the GaggiMate integration is installed and configured.
          </div>
        ` : ''}

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

        <div class="info">
          💡 <strong>Tip:</strong> If device selection doesn't work, just select any GaggiMate entity. 
          The card will automatically find all related entities.
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

      .warning {
        padding: 12px;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 4px;
        color: #856404;
        font-size: 0.9em;
      }

      .info {
        padding: 12px;
        background: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 4px;
        color: #0d47a1;
        font-size: 0.9em;
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
  '%c GAGGIMATE-CARD %c Version 1.1.0 ',
  'color: white; background: #8B4513; font-weight: 700;',
  'color: #8B4513; background: white; font-weight: 700;'
);

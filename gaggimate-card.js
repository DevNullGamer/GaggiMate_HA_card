import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

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
    
    if (config.device_id) {
      this._updateDeviceEntities();
    } else if (config.entity) {
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

    const parts = baseEntity.split('.');
    if (parts.length < 2) {
      this._entities = {};
      return;
    }

    const entityId = parts[1];
    const baseName = entityId.split('_')[0];
    const allEntities = Object.keys(this.hass.states);
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
      const entities = await this.hass.callWS({ type: 'config/entity_registry/list' });
      const deviceEntities = entities.filter(e => e.device_id === this.config.device_id);

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
      if (keywordArray.some(keyword => lowerId.includes(keyword.toLowerCase()))) {
        return entityId;
      }
    }
    return null;
  }

  _getEntityState(entityId) {
    return entityId && this.hass?.states[entityId];
  }

  _callService(domain, service, entityId, data = {}) {
    this.hass.callService(domain, service, { entity_id: entityId, ...data });
  }

  _togglePower() {
    if (this._entities?.machineActive) {
      this.hass.callService('switch', 'toggle', { entity_id: this._entities.machineActive });
    }
  }

  _handleModeChange(e) {
    if (this._entities?.modeSelect) {
      this._callService('select', 'select_option', this._entities.modeSelect, { option: e.target.value });
    }
  }

  _handleProfileChange(e) {
    if (this._entities?.profileSelect) {
      this._callService('select', 'select_option', this._entities.profileSelect, { option: e.target.value });
    }
  }

  _handleTargetTempChange(e) {
    const temp = parseFloat(e.target.value);
    if (this._entities?.targetTempNumber && !isNaN(temp)) {
      this._callService('number', 'set_value', this._entities.targetTempNumber, { value: temp });
    }
  }

  _drawGauge(ctx, value, max, color) {
    const centerX = 75;
    const centerY = 75;
    const radius = 60;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const totalAngle = endAngle - startAngle;
    const percentage = Math.min(value / max, 1);
    
    // Background arc
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();
    
    // Value arc
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + (totalAngle * percentage));
    ctx.stroke();
  }

  render() {
    if (!this.hass) {
      return html`<ha-card><div class="warning">Loading...</div></ha-card>`;
    }

    if (!this.config.device_id && !this.config.entity) {
      return html`
        <ha-card>
          <div class="warning">Please configure the card in the editor.</div>
        </ha-card>
      `;
    }

    if (!this._entities || Object.keys(this._entities).length === 0) {
      return html`
        <ha-card>
          <div class="warning">No entities found. Check GaggiMate integration.</div>
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

    const currentTemp = parseFloat(currentTempState?.state) || 0;
    const targetTemp = parseFloat(targetTempState?.state) || 0;
    const mode = modeState?.state || 'Standby';
    const profile = profileState?.state || 'Default';
    const weight = weightState?.state || '--';
    const isActive = machineActiveState?.state === 'on';

    return html`
      <ha-card>
        <!-- Header -->
        <div class="header">
          <div class="logo">GAGGIMATE</div>
          <div class="status-icons">
            ${isActive ? html`<ha-icon icon="mdi:power" class="icon-active"></ha-icon>` : ''}
          </div>
        </div>

        <!-- Gauges Section -->
        <div class="gauges-section">
          <div class="gauge-container">
            <canvas id="tempGauge" width="150" height="150"></canvas>
            <div class="gauge-label">
              <div class="gauge-value">${currentTemp.toFixed(1)}°C</div>
              <div class="gauge-text">Temperature</div>
            </div>
          </div>
        </div>

        <!-- Mode Display -->
        <div class="mode-section">
          <div class="mode-badge">${mode}</div>
          ${this.config.show_profile ? html`
            <div class="profile-info">
              <ha-icon icon="mdi:coffee-outline"></ha-icon>
              <span>${profile}</span>
            </div>
          ` : ''}
        </div>

        <!-- Temperature Target -->
        <div class="target-section">
          <div class="target-item">
            <span class="target-label">Target</span>
            <span class="target-value">${targetTemp.toFixed(1)}°C</span>
          </div>
          ${this.config.show_weight && weightState ? html`
            <div class="target-item">
              <span class="target-label">Weight</span>
              <span class="target-value">${weight}g</span>
            </div>
          ` : ''}
        </div>

        <!-- Controls -->
        ${this.config.show_controls ? html`
          <div class="controls-section">
            ${modeSelectState ? html`
              <div class="control-group">
                <label>Mode</label>
                <select class="select-control" @change=${this._handleModeChange}>
                  ${modeSelectState.attributes.options?.map(option => html`
                    <option value="${option}" ?selected=${option === modeState?.state}>
                      ${option}
                    </option>
                  `)}
                </select>
              </div>
            ` : ''}

            ${profileSelectState ? html`
              <div class="control-group">
                <label>Profile</label>
                <select class="select-control" @change=${this._handleProfileChange}>
                  ${profileSelectState.attributes.options?.map(option => html`
                    <option value="${option}" ?selected=${option === profileState?.state}>
                      ${option}
                    </option>
                  `)}
                </select>
              </div>
            ` : ''}

            ${targetTempNumberState ? html`
              <div class="control-group">
                <label>Target Temperature</label>
                <input
                  type="number"
                  class="number-input"
                  .value=${targetTemp.toFixed(1)}
                  @change=${this._handleTargetTempChange}
                  min="${targetTempNumberState.attributes.min || 80}"
                  max="${targetTempNumberState.attributes.max || 100}"
                  step="${targetTempNumberState.attributes.step || 0.1}"
                />
              </div>
            ` : ''}

            <!-- Action Buttons -->
            <div class="button-group">
              ${this._entities.machineActive ? html`
                <button class="btn ${isActive ? 'btn-error' : 'btn-success'}" @click=${this._togglePower}>
                  <ha-icon icon="${isActive ? 'mdi:power-off' : 'mdi:power'}"></ha-icon>
                  ${isActive ? 'Power Off' : 'Power On'}
                </button>
              ` : ''}
              
              ${this._entities.startBrew ? html`
                <button class="btn btn-primary" @click=${() => this._callService('button', 'press', this._entities.startBrew)}>
                  <ha-icon icon="mdi:coffee"></ha-icon>
                  Start Brew
                </button>
              ` : ''}
              
              ${this._entities.stopBrew ? html`
                <button class="btn btn-warning" @click=${() => this._callService('button', 'press', this._entities.stopBrew)}>
                  <ha-icon icon="mdi:stop"></ha-icon>
                  Stop
                </button>
              ` : ''}
              
              ${this._entities.startSteam ? html`
                <button class="btn btn-secondary" @click=${() => this._callService('button', 'press', this._entities.startSteam)}>
                  <ha-icon icon="mdi:kettle-steam"></ha-icon>
                  Steam
                </button>
              ` : ''}
              
              ${this._entities.flush ? html`
                <button class="btn btn-accent" @click=${() => this._callService('button', 'press', this._entities.flush)}>
                  <ha-icon icon="mdi:water"></ha-icon>
                  Flush
                </button>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  updated() {
    super.updated();
    const canvas = this.shadowRoot?.querySelector('#tempGauge');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const currentTempState = this._getEntityState(this._entities.currentTemp);
      const currentTemp = parseFloat(currentTempState?.state) || 0;
      this._drawGauge(ctx, currentTemp, 100, '#10b981');
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      ha-card {
        padding: 0;
        background: var(--ha-card-background, #ffffff);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .warning {
        padding: 24px;
        text-align: center;
        color: #d97706;
        background: #fef3c7;
        border-radius: 8px;
        margin: 16px;
      }

      /* Header */
      .header {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .logo {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #ffffff;
      }

      .status-icons {
        display: flex;
        gap: 8px;
      }

      .icon-active {
        --mdc-icon-size: 24px;
        color: #10b981;
      }

      /* Gauges */
      .gauges-section {
        padding: 24px 20px;
        display: flex;
        justify-content: center;
        background: #f8fafc;
      }

      .gauge-container {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .gauge-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      }

      .gauge-value {
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1;
      }

      .gauge-text {
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Mode Section */
      .mode-section {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
      }

      .mode-badge {
        padding: 8px 20px;
        background: #10b981;
        color: white;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .profile-info {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #64748b;
        font-size: 14px;
      }

      .profile-info ha-icon {
        --mdc-icon-size: 18px;
      }

      /* Target Section */
      .target-section {
        padding: 16px 20px;
        display: flex;
        justify-content: space-around;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
      }

      .target-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .target-label {
        font-size: 12px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .target-value {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
      }

      /* Controls */
      .controls-section {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #ffffff;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control-group label {
        font-size: 13px;
        font-weight: 600;
        color: #1e293b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .select-control,
      .number-input {
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 15px;
        background: #ffffff;
        color: #1e293b;
        transition: all 0.2s;
      }

      .select-control:focus,
      .number-input:focus {
        outline: none;
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }

      /* Buttons */
      .button-group {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-top: 8px;
      }

      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .btn:active {
        transform: translateY(0);
      }

      .btn ha-icon {
        --mdc-icon-size: 20px;
      }

      .btn-primary {
        background: #10b981;
        color: white;
      }

      .btn-primary:hover {
        background: #059669;
      }

      .btn-secondary {
        background: #6366f1;
        color: white;
      }

      .btn-secondary:hover {
        background: #4f46e5;
      }

      .btn-warning {
        background: #f59e0b;
        color: white;
      }

      .btn-warning:hover {
        background: #d97706;
      }

      .btn-error {
        background: #ef4444;
        color: white;
      }

      .btn-error:hover {
        background: #dc2626;
      }

      .btn-success {
        background: #10b981;
        color: white;
      }

      .btn-success:hover {
        background: #059669;
      }

      .btn-accent {
        background: #06b6d4;
        color: white;
      }

      .btn-accent:hover {
        background: #0891b2;
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
      const devices = await this.hass.callWS({ type: 'config/device_registry/list' });
      this._devices = devices.filter(d =>
        d.manufacturer?.toLowerCase().includes('gaggimate') ||
        d.model?.toLowerCase().includes('gaggimate') ||
        d.name?.toLowerCase().includes('gaggimate')
      );
    } catch (error) {
      console.error('Error loading devices:', error);
      this._devices = [];
    }
  }

  _loadGaggiEntities() {
    if (!this.hass) return;
    const allEntities = Object.keys(this.hass.states);
    this._gaggiEntities = allEntities.filter(entityId => {
      const state = this.hass.states[entityId];
      const integration = state.attributes?.integration;
      const name = entityId.toLowerCase();
      return integration === 'gaggimate' || name.includes('gaggimate') || name.includes('gaggia');
    });
  }

  _valueChanged(ev) {
    if (!this.config || !this.hass) return;
    const target = ev.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const newConfig = { ...this.config, [target.configValue]: value };
    fireEvent(this, 'config-changed', { config: newConfig });
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const hasDevices = this._devices && this._devices.length > 0;
    const hasEntities = this._gaggiEntities && this._gaggiEntities.length > 0;

    return html`
      <div class="card-config">
        ${hasDevices ? html`
          <div class="config-row">
            <label for="device">Device</label>
            <select id="device" .configValue=${'device_id'} .value=${this.config.device_id || ''} @change=${this._valueChanged}>
              <option value="">Select device</option>
              ${this._devices.map(device => html`
                <option value="${device.id}" ?selected=${device.id === this.config.device_id}>
                  ${device.name || device.id}
                </option>
              `)}
            </select>
          </div>
        ` : ''}

        ${hasEntities ? html`
          <div class="config-row">
            <label for="entity">Or select any entity</label>
            <select id="entity" .configValue=${'entity'} .value=${this.config.entity || ''} @change=${this._valueChanged}>
              <option value="">Select entity</option>
              ${this._gaggiEntities.map(entityId => html`
                <option value="${entityId}" ?selected=${entityId === this.config.entity}>
                  ${entityId}
                </option>
              `)}
            </select>
          </div>
        ` : ''}

        <div class="config-row">
          <label for="name">Card Name</label>
          <input type="text" id="name" .configValue=${'name'} .value=${this.config.name || 'GaggiMate'} @change=${this._valueChanged} />
        </div>

        <div class="config-row checkbox">
          <label for="show_profile">Show Profile</label>
          <input type="checkbox" id="show_profile" .configValue=${'show_profile'} .checked=${this.config.show_profile !== false} @change=${this._valueChanged} />
        </div>

        <div class="config-row checkbox">
          <label for="show_weight">Show Weight</label>
          <input type="checkbox" id="show_weight" .configValue=${'show_weight'} .checked=${this.config.show_weight !== false} @change=${this._valueChanged} />
        </div>

        <div class="config-row checkbox">
          <label for="show_controls">Show Controls</label>
          <input type="checkbox" id="show_controls" .configValue=${'show_controls'} .checked=${this.config.show_controls !== false} @change=${this._valueChanged} />
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
      input[type='text'], select {
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

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'gaggimate-card',
  name: 'GaggiMate Card',
  description: 'Official GaggiMate espresso machine card',
  preview: true,
  documentationURL: 'https://github.com/DevNullGamer/GaggiMate_HA_card',
});

console.info(
  '%c GAGGIMATE-CARD %c Version 2.0.0 ',
  'color: white; background: #10b981; font-weight: 700;',
  'color: #10b981; background: white; font-weight: 700;'
);

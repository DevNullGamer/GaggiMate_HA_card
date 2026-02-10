# GaggiMate Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

A custom Lovelace card for Home Assistant to control and monitor your GaggiMate espresso machine with automatic device discovery.

## Features

✨ **Visual Editor Support** - Configure using Home Assistant's visual editor  
🎯 **Automatic Discovery** - Just select your device, all sensors auto-populate  
🌡️ **Real-time Monitoring** - Current and target temperature display  
☕ **Mode Control** - Switch between Brew, Steam, Hot Water, Grind  
📊 **Profile Selection** - Display and select brewing profiles  
⚖️ **Scale Integration** - Show weight from BLE scales  
🎮 **Quick Controls** - One-tap brewing, steaming, flushing  
🎨 **Beautiful UI** - Modern gradient design with color-coded modes  

## Installation

### HACS (Recommended)

1. Go to HACS → Frontend
2. Click the 3-dot menu → Custom repositories
3. Add: `https://github.com/DevNullGamer/GaggiMate_HA_card`
4. Category: Lovelace
5. Click "Add"
6. Find "GaggiMate Card" and install
7. Restart Home Assistant

### Manual

1. Download `gaggimate-card.js` from [releases](https://github.com/DevNullGamer/GaggiMate_HA_card/releases)
2. Copy to `/config/www/gaggimate-card.js`
3. Add resource in Lovelace:
   ```yaml
   url: /local/gaggimate-card.js
   type: module
   ```
4. Restart Home Assistant

## Usage

### Visual Editor (Easiest)

1. Edit dashboard → Add Card
2. Search "GaggiMate Card"
3. Select your device
4. Customize options
5. Save

### YAML

```yaml
type: custom:gaggimate-card
device_id: YOUR_DEVICE_ID
name: My GaggiMate
show_profile: true
show_weight: true
show_controls: true
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `device_id` | string | **Required** | Your GaggiMate device ID |
| `name` | string | `GaggiMate` | Card title |
| `show_profile` | boolean | `true` | Show profile info |
| `show_weight` | boolean | `true` | Show scale weight |
| `show_controls` | boolean | `true` | Show control buttons |

## How It Works

The card automatically discovers ALL entities from your GaggiMate device:
- Queries Home Assistant device registry
- Finds all linked entities
- Intelligently matches sensors, switches, selects, buttons
- **No manual entity configuration needed!**

## Prerequisites

- Home Assistant 2023.1.0+
- [GaggiMate Integration](https://github.com/gaggimate/ha-integration) installed

## Support

- **Issues**: [GitHub Issues](https://github.com/DevNullGamer/GaggiMate_HA_card/issues)
- **Docs**: [GaggiMate Documentation](https://docs.gaggimate.eu/)

## License

MIT License - See [LICENSE](LICENSE)

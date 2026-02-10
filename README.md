# GaggiMate Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

A custom Home Assistant card styled to match the official GaggiMate web interface. Features clean DaisyUI-inspired design with gauge displays, modern controls, and automatic entity discovery.

## Features

✨ **Official GaggiMate Styling** - Matches the original web interface design  
🎯 **Gauge Temperature Display** - Circular gauge with live temperature readings  
🎨 **Modern UI** - Clean, professional design with DaisyUI-inspired components  
🔄 **Auto-Discovery** - Select any entity, card finds all related sensors  
⚙️ **Full Controls** - Modes, profiles, brewing buttons in one place  
📱 **Responsive** - Works beautifully on desktop and mobile  

## Installation

### HACS

1. Go to HACS → Frontend
2. Click 3-dot menu → Custom repositories
3. Add: `https://github.com/DevNullGamer/GaggiMate_HA_card`
4. Category: Lovelace
5. Install "GaggiMate Card"
6. Restart Home Assistant

### Manual

1. Download `gaggimate-card.js`
2. Copy to `/config/www/`
3. Add resource:
   ```yaml
   url: /local/gaggimate-card.js
   type: module
   ```
4. Restart Home Assistant

## Usage

### Visual Editor
1. Add Card → Search "GaggiMate Card"
2. Select your device OR any GaggiMate entity
3. Customize options
4. Save

### YAML
```yaml
type: custom:gaggimate-card
entity: sensor.gaggimate_current_temperature
name: My GaggiMate
show_profile: true
show_weight: true
show_controls: true
```

## Design Features

### Header
- Dark gradient header with GAGGIMATE branding
- Power status indicator
- Clean, professional look

### Gauge Display
- Circular temperature gauge with live value
- Smooth animations
- Clear numeric display

### Mode & Profile
- Color-coded mode badge
- Profile display with icon
- Easy-to-read typography

### Controls
- DaisyUI-style buttons with hover effects
- Clean dropdown selectors
- Responsive grid layout
- Color-coded actions (green=start, red=stop, etc.)

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **Required** | Any GaggiMate entity |
| `device_id` | string | Optional | Device ID (alternative to entity) |
| `name` | string | `GaggiMate` | Card title |
| `show_profile` | boolean | `true` | Show profile info |
| `show_weight` | boolean | `true` | Show scale weight |
| `show_controls` | boolean | `true` | Show control buttons |

## Color Scheme

The card uses a professional color palette inspired by the GaggiMate web interface:

- **Primary**: Emerald green (#10b981) - Success, active states
- **Secondary**: Indigo (#6366f1) - Steam controls
- **Warning**: Amber (#f59e0b) - Stop/caution actions
- **Error**: Red (#ef4444) - Power off
- **Accent**: Cyan (#06b6d4) - Flush operations
- **Background**: Slate gray gradients - Professional, clean look

## Prerequisites

- Home Assistant 2023.1.0+
- [GaggiMate Integration](https://github.com/gaggimate/ha-integration)

## Support

- **Issues**: [GitHub Issues](https://github.com/DevNullGamer/GaggiMate_HA_card/issues)
- **Docs**: [GaggiMate Documentation](https://docs.gaggimate.eu/)

## License

MIT License

# HyperX Wireless Headsets

Enhanced Node.js module for interfacing with HyperX wireless gaming headsets with robust reconnection handling.

## Supported Devices

This library supports the following HyperX wireless headsets:

- **HyperX Cloud Flight Wireless** (Original support)
- **HP HyperX Cloud II Wireless**
- **HP HyperX Cloud II Wireless (Variant B)**
- **HP HyperX Cloud II Core Wireless**
- **HP HyperX Cloud Alpha Wireless**
- **HP HyperX Cloud Stinger 2 Wireless**
- **Kingston HyperX Cloud II Wireless**

## Features

- Battery level monitoring
- Power state detection (on/off)
- Microphone mute status
- Volume change detection (up/down)
- Charging status
- Automatic device reconnection with exponential backoff
- Support for multiple HyperX headset models
- Event-driven architecture

## Installation

```bash
npm install hyperx-cloud-flight-wireless
```

## Usage

### Basic Example

```javascript
const hyperxHeadset = require('hyperx-cloud-flight-wireless')({ debug: false })

// Get device information
const deviceInfo = hyperxHeadset.getDeviceInfo()
if (deviceInfo) {
  console.log(`Detected: ${deviceInfo.name}`)
  console.log(`Type: ${deviceInfo.type}`)
  console.log(`Vendor ID: 0x${deviceInfo.vendorId.toString(16)}`)
  console.log(`Product ID: 0x${deviceInfo.productId.toString(16)}`)
}

// Listen for battery updates
hyperxHeadset.on('battery', (percentage) => {
  console.log(`Battery: ${percentage}%`)
})

// Listen for charging status
hyperxHeadset.on('charging', (isCharging) => {
  console.log(`Charging: ${isCharging}`)
})

// Listen for power state changes
hyperxHeadset.on('power', (state) => {
  console.log(`Power: ${state}`) // 'on' or 'off'
})

// Listen for mute status
hyperxHeadset.on('muted', (isMuted) => {
  console.log(`Muted: ${isMuted}`)
})

// Listen for volume changes
hyperxHeadset.on('volume', (direction) => {
  console.log(`Volume: ${direction}`) // 'up' or 'down'
})

// Listen for errors
hyperxHeadset.on('error', (error) => {
  console.error('Error:', error)
})

// Listen for connection events
hyperxHeadset.on('connected', () => {
  console.log('Headset connected')
})

hyperxHeadset.on('disconnected', (error) => {
  console.log('Headset disconnected:', error)
})

// Clean up when done
process.on('SIGINT', () => {
  hyperxHeadset.close()
  process.exit(0)
})
```

## Configuration Options

```javascript
const hyperxHeadset = require('hyperx-cloud-flight-wireless')({
  debug: false, // Enable debug logging (default: false)
  updateDelay: 300000, // Battery update interval in ms (default: 5 minutes)
})
```

## API

### Events

- `battery` - Emitted when battery level changes
  - Parameter: `percentage` (number, 0-100)

- `charging` - Emitted when charging status changes
  - Parameter: `isCharging` (boolean)

- `power` - Emitted when power state changes
  - Parameter: `state` (string, 'on' or 'off')

- `muted` - Emitted when microphone mute status changes
  - Parameter: `isMuted` (boolean)

- `volume` - Emitted when volume is changed
  - Parameter: `direction` (string, 'up' or 'down')

- `error` - Emitted when an error occurs
  - Parameter: `error` (Error object)

- `connected` - Emitted when headset is connected/reconnected

- `disconnected` - Emitted when headset is disconnected
  - Parameter: `error` (Error object)

- `unknown` - Emitted for unknown data packets
  - Parameter: `data` (Buffer)

### Methods

#### `getDeviceInfo()`

Returns information about the detected headset.

**Returns:**

```javascript
{
  type: 'HP_CLOUD_II',           // Device type constant
  name: 'HP HyperX Cloud II Wireless',  // Human-readable name
  vendorId: 1008,                // USB Vendor ID
  productId: 395                 // USB Product ID
}
```

Returns `null` if no device is detected.

#### `close()`

Closes all device connections and clears event listeners.

```javascript
hyperxHeadset.close()
```

#### `clearListeners()`

Removes all event listeners without closing the device connection.

```javascript
hyperxHeadset.clearListeners()
```

## Device-Specific Notes

### Cloud Flight Wireless

- Full support for battery level with granular percentage steps
- Supports power state, mute, volume, and charging detection
- Uses complex battery calculation algorithm

### Cloud II Series (HP/Kingston)

- Direct battery level reporting (0-100%)
- Simplified communication protocol
- Automatic device variant detection

### Cloud Alpha Wireless

- Battery level monitoring
- Uses specific HID command structure

### Cloud Stinger 2 Wireless

- Compatible with Cloud II protocol
- Full battery monitoring support

## Reconnection Handling

The library includes robust automatic reconnection:

- Starts with 1-second retry interval
- Exponential backoff (multiplied by 1.5 each attempt)
- Maximum backoff of 5 minutes
- Continuous retry attempts (no hard limit after initial 10 attempts)
- Emits `disconnected` event when max attempts reached
- Automatically reconnects when device becomes available

## Platform Support

- **Windows**: Automatically uses libusb driver
- **macOS**: Native HID support
- **Linux**: Native HID support (may require udev rules)

### Linux Setup

You may need to add udev rules for device access:

```bash
sudo tee /etc/udev/rules.d/99-hyperx.rules > /dev/null <<EOF
# HP HyperX devices
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="03f0", ATTRS{idProduct}=="018b", MODE="0666"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="03f0", ATTRS{idProduct}=="0696", MODE="0666"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="03f0", ATTRS{idProduct}=="0d93", MODE="0666"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="03f0", ATTRS{idProduct}=="098d", MODE="0666"

# Kingston HyperX devices
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0951", ATTRS{idProduct}=="16c4", MODE="0666"
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0951", ATTRS{idProduct}=="1718", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Troubleshooting

### Device not found

1. Make sure your headset is powered on and connected wirelessly
2. Check that the USB dongle is plugged in
3. On Linux, ensure you have proper udev rules (see above)
4. Try running with `debug: true` to see detailed logs

### No battery updates

1. Battery updates are sent every 5 minutes by default
2. Adjust `updateDelay` option for more frequent updates
3. Some events (like volume changes) may trigger immediate battery updates

## Credits

Original implementation by Søren Brokær for HyperX Cloud Flight Wireless.

Extended support for Cloud II series based on research from:

- [HyperHeadset](https://github.com/LennardKittner/HyperHeadset) by Lennard Kittner (Rust implementation)
- [HyperX Cloud 2 Battery Monitor](https://github.com/auto94/HyperX-Cloud-2-Battery-Monitor) by auto94 (C++ implementation)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### v2.0.0

- Added support for HP HyperX Cloud II Wireless
- Added support for HP HyperX Cloud II Core Wireless
- Added support for HP HyperX Cloud Alpha Wireless
- Added support for HP HyperX Cloud Stinger 2 Wireless
- Added support for Kingston HyperX Cloud II Wireless
- Added `getDeviceInfo()` method to detect device type
- Improved device detection and initialization
- Updated documentation with all supported devices

### v1.1.0

- Added reconnection logic
- Published to npm
- Updated to eventemitter3

### v1.0.0

- Initial release with HyperX Cloud Flight Wireless support

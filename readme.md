# 🎧 HyperX Cloud Flight Wireless

> Enhanced Node.js module for interfacing with [HyperX Cloud Flight Wireless](https://www.hyperxgaming.com/unitedstates/us/headsets/cloud-flight-wireless-gaming-headset) headsets

This is a fork of [srn/hyperx-cloud-flight-wireless](https://github.com/srn/hyperx-cloud-flight-wireless) with significant improvements to connection reliability and event handling.

## ✨ Improvements

This fork includes several critical improvements:

- 🔄 **Robust reconnection handling** - Properly reconnects after power cycles
- 🔌 **Better device detection** - More reliable device discovery after disconnection
- 🛡️ **Error resilience** - Improved error handling with automatic recovery
- 🧹 **Proper resource cleanup** - Prevents memory leaks and stale connections
- ⚡ **Faster event handling** - More responsive status updates
- 🔋 **More reliable battery reporting** - Consistent battery level updates

## 📦 Install

```sh
$ npm install AlexAdiaconitei/hyperx-cloud-flight-wireless
```

## 🚀 Usage

```js
const hyperxCloudFlight = require('hyperx-cloud-flight-wireless')()

// Event listeners
hyperxCloudFlight.on('power', state) // 'on' | 'off'
hyperxCloudFlight.on('muted', muted) // Boolean
hyperxCloudFlight.on('volume', direction) // 'up' | 'down'
hyperxCloudFlight.on('charging', charging) // Boolean
hyperxCloudFlight.on('battery', percentage) // 0-100 | null
hyperxCloudFlight.on('error', error) // instanceof Error

// Enhanced API methods
hyperxCloudFlight.clearListeners() // Remove all event listeners
hyperxCloudFlight.close() // Cleanly close connection and release resources
```

## 📝 Feature Support

| Feature          | Status | Description                                             |
| ---------------- | ------ | ------------------------------------------------------- |
| Power State      | ✅     | Detect when headset is powered on/off                   |
| Microphone State | ✅     | Track when microphone is muted/unmuted                  |
| Volume Control   | ✅     | Detect volume up/down button presses                    |
| Battery Level    | ✅     | Estimate battery percentage (0-100%)                    |
| Charging Status  | ✅     | Detect when headset is charging                         |
| Auto Reconnect   | ✅     | Automatically reconnect after disconnection/power cycle |

## 🔧 Configuration Options

The module accepts a configuration object with the following options:

```js
const hyperx = require('hyperx-cloud-flight-wireless')({
  debug: false, // Enable/disable debug logging
  updateDelay: 30000, // Update interval in milliseconds (default: 5min)
})
```

## 🐧 Linux Support

To work with Linux it is necessary to run as root, or define rules for udev:

```sh
echo 'KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0664", GROUP="plugdev"' | sudo tee -a /etc/udev/rules.d/99-hidraw-permissions.rules && sudo udevadm control --reload-rules
```

Disconnect and reconnect the device after applying these rules.

## 📊 Technical Notes

The battery percentage is an estimate based on the device's status report. The implementation uses HID communications to interface with the headset's USB dongle.

## 📄 License

MIT © [Søren Brokær](https://srn.io)

_Enhanced fork maintained by [Alex Adiaconitei](https://github.com/AlexAdiaconitei)_

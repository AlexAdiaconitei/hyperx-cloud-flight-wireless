const HID = require('node-hid')
const EventEmitter = require('eventemitter3')

const VENDOR_ID = 2385
const PRODUCT_ID = 5828

// usage pages
// 65472 - power state/muting/unmuting - byte length: 2
// 12 - volume up/down - byte length: 5
// 65363 - "status" - byte length: 20

module.exports = ({ debug = false, updateDelay = 5 * 1000 * 60 } = {}) => {
  const platform = process.platform
  if (platform == 'win32' || platform == 'win64') {
    HID.setDriverType('libusb')
  }

  const emitter = new EventEmitter()

  // Reconnect variables
  let reconnectAttempts = 0
  let maxReconnectAttempts = 10
  let reconnectBackoff = 1000 // Start with 1 second, will increase
  let maxBackoffTime = 5 * 60 * 1000 // 5 minutes in milliseconds
  let reconnectTimer = null

  // Keep track of all created device handles
  let deviceHandles = []
  let bootstrapDevice = null
  let interval = null
  let isConnected = false
  let powerState = 'unknown'

  // Function to get fresh device list
  function getDevices() {
    return HID.devices().filter(
      (d) => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID,
    )
  }

  // Find devices initially
  let devices = getDevices()

  if (devices.length === 0) {
    throw new Error('HyperX Cloud Flight Wireless was not found')
  }

  // Function to close all devices
  function closeAllDevices() {
    if (debug) console.log('Closing all device handles')

    deviceHandles.forEach((device) => {
      try {
        device.close()
      } catch (err) {
        if (debug) console.error('Error closing device:', err)
      }
    })

    deviceHandles = []
    bootstrapDevice = null
  }

  // Function to completely reinitialize all devices
  function reinitializeDevices() {
    if (debug)
      console.log(
        `Reinitializing all devices (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
      )

    // Close existing devices first
    closeAllDevices()

    // Get fresh device list
    devices = getDevices()

    if (devices.length === 0) {
      reconnectAttempts++

      // Calculate backoff time with exponential increase, but cap at maximum
      let delay = Math.min(
        reconnectBackoff * Math.pow(1.5, reconnectAttempts),
        maxBackoffTime,
      )

      // If we've reached max attempts, just use the maximum backoff time for all future attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        if (debug)
          console.log(
            'Max reconnect attempts reached. Continuing with 5-minute interval checks.',
          )
        emitter.emit(
          'disconnected',
          new Error(
            'Device disconnected. Checking every 5 minutes for reconnection.',
          ),
        )
        delay = maxBackoffTime
      }

      if (debug)
        console.log(
          `Device not found. Trying again in ${Math.round(delay / 1000)} seconds.`,
        )
      emitter.emit(
        'error',
        new Error(
          'HyperX Cloud Flight Wireless was not found during reinitialize',
        ),
      )

      // Clear any existing timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }

      // Schedule next attempt with backoff
      reconnectTimer = setTimeout(reinitializeDevices, delay)
      return false
    }

    // Device found! Reset reconnect attempts
    reconnectAttempts = 0

    // Create fresh connections to all devices
    initializeDevices()

    // Also restart bootstrap interval
    if (interval) {
      clearInterval(interval)
    }
    interval = setInterval(bootstrap, updateDelay)

    // Clear reconnect timer if it exists
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    emitter.emit('connected')
    return true
  }

  function bootstrap() {
    if (!interval && powerState !== 'off') {
      interval = setInterval(bootstrap, updateDelay)
    }

    // Fresh discovery of bootstrap device each time
    try {
      if (!bootstrapDevice) {
        const bootstrapDeviceInfo = devices.find(
          (d) => d.usagePage === 65363 && d.usage === 771,
        )

        if (!bootstrapDeviceInfo) {
          if (debug)
            console.log('Bootstrap device not found, trying to reinitialize')
          return reinitializeDevices()
        }

        try {
          bootstrapDevice = new HID.HID(bootstrapDeviceInfo.path)
          deviceHandles.push(bootstrapDevice)
        } catch (e) {
          if (debug) console.error('Error creating bootstrap device:', e)
          emitter.emit('error', e)
          return false
        }
      }

      const buffer = Buffer.from([
        0x21, 0xff, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ])

      try {
        bootstrapDevice.write(buffer)
        isConnected = true
      } catch (e) {
        if (debug) console.error('Error writing to bootstrap device:', e)
        bootstrapDevice = null
        emitter.emit('error', e)
        return false
      }

      return true
    } catch (e) {
      if (debug) console.error('Error in bootstrap:', e)
      emitter.emit('error', e)
      return false
    }
  }

  function initializeDevices() {
    devices.forEach((deviceInfo) => {
      try {
        const device = new HID.HID(deviceInfo.path)
        deviceHandles.push(device)

        device.on('error', (err) => {
          if (debug) console.error('Device error:', err)

          const errorStr = String(err).toLowerCase()
          const isDisconnectError =
            errorStr.includes('could not read') ||
            errorStr.includes('disconnect') ||
            errorStr.includes('not found') ||
            errorStr.includes('access denied')

          if (isDisconnectError && !reconnectTimer) {
            // Only schedule reconnection if one isn't already in progress
            reconnectTimer = setTimeout(reinitializeDevices, reconnectBackoff)
          }

          emitter.emit('error', err)
        })

        device.on('data', (data) => {
          if (debug) {
            console.log(new Date(), data, `length: ${data.length}`)
            for (let byte of data) {
              console.log(byte)
            }
          }

          switch (data.length) {
            case 0x2:
              if (data[0] === 0x64 && data[1] == 0x3) {
                powerState = 'off'

                // Clear interval but maintain the device handles
                if (interval) {
                  clearInterval(interval)
                  interval = null
                }

                return emitter.emit('power', 'off')
              }

              if (data[0] === 0x64 && data[1] == 0x1) {
                powerState = 'on'

                // When power comes back on, reinitialize everything
                setTimeout(() => {
                  reinitializeDevices()
                  emitter.emit('power', 'on')
                }, 500)

                return
              }

              const isMuted = data[0] === 0x65 && data[1] === 0x04
              emitter.emit('muted', isMuted)
              break

            case 0x5:
              const volumeDirectionValue = data[1]
              const volumeDirection =
                volumeDirectionValue === 0x01
                  ? 'up'
                  : volumeDirectionValue === 0x02
                    ? 'down'
                    : null

              if (!volumeDirection) {
                return
              }

              emitter.emit('volume', volumeDirection)
              break

            case 0xf:
            case 0x14:
              const chargeState = data[3]
              const magicValue = data[4] || chargeState

              function calculatePercentage() {
                if (chargeState === 0x10) {
                  emitter.emit('charging', magicValue >= 20)

                  if (magicValue <= 11) {
                    return 100
                  }
                }

                if (chargeState === 0xf) {
                  if (magicValue >= 130) {
                    return 100
                  }

                  if (magicValue < 130 && magicValue >= 120) {
                    return 95
                  }

                  if (magicValue < 120 && magicValue >= 100) {
                    return 90
                  }

                  if (magicValue < 100 && magicValue >= 70) {
                    return 85
                  }

                  if (magicValue < 70 && magicValue >= 50) {
                    return 80
                  }

                  if (magicValue < 50 && magicValue >= 20) {
                    return 75
                  }

                  if (magicValue < 20 && magicValue > 0) {
                    return 70
                  }
                }

                if (chargeState === 0xe) {
                  if (magicValue < 250 && magicValue > 240) {
                    return 65
                  }

                  if (magicValue < 240 && magicValue >= 220) {
                    return 60
                  }

                  if (magicValue < 220 && magicValue >= 208) {
                    return 55
                  }

                  if (magicValue < 208 && magicValue >= 200) {
                    return 50
                  }

                  if (magicValue < 200 && magicValue >= 190) {
                    return 45
                  }

                  if (magicValue < 190 && magicValue >= 180) {
                    return 40
                  }

                  if (magicValue < 179 && magicValue >= 169) {
                    return 35
                  }

                  if (magicValue < 169 && magicValue >= 159) {
                    return 30
                  }

                  if (magicValue < 159 && magicValue >= 148) {
                    return 25
                  }

                  if (magicValue < 148 && magicValue >= 119) {
                    return 20
                  }

                  if (magicValue < 119 && magicValue >= 90) {
                    return 15
                  }

                  if (magicValue < 90) {
                    return 10
                  }
                }

                return null
              }

              const percentage = calculatePercentage()
              if (percentage) {
                emitter.emit('battery', percentage)
              }
              break

            default:
              emitter.emit('unknown', data)
          }
        })
      } catch (err) {
        if (debug) console.error('Error initializing device:', err)
        emitter.emit('error', err)
      }
    })
  }

  // Start the initial connection
  initializeDevices()
  bootstrap()

  // Add method to clear listeners - FIXED to avoid recursion
  emitter.clearListeners = function () {
    this.removeAllListeners('battery')
    this.removeAllListeners('power')
    this.removeAllListeners('muted')
    this.removeAllListeners('volume')
    this.removeAllListeners('charging')
    this.removeAllListeners('error')
    this.removeAllListeners('unknown')
    this.removeAllListeners('close')
    this.removeAllListeners('connected')
    this.removeAllListeners('disconnected')
  }

  // Add a close method to the emitter
  emitter.close = function () {
    if (interval) {
      clearInterval(interval)
      interval = null
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    closeAllDevices()

    this.clearListeners()
  }

  // Handle close event
  emitter.on('close', () => {
    emitter.close()
  })

  return emitter
}

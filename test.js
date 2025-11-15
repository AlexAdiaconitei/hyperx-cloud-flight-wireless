const hyperxHeadset = require('./')({ debug: true })

// Display detected device information
const deviceInfo = hyperxHeadset.getDeviceInfo()
if (deviceInfo) {
  console.log('='.repeat(50))
  console.log('Detected HyperX Headset:')
  console.log(`  Name: ${deviceInfo.name}`)
  console.log(`  Type: ${deviceInfo.type}`)
  console.log(
    `  Vendor ID: 0x${deviceInfo.vendorId.toString(16).toUpperCase().padStart(4, '0')}`,
  )
  console.log(
    `  Product ID: 0x${deviceInfo.productId.toString(16).toUpperCase().padStart(4, '0')}`,
  )
  console.log('='.repeat(50))
}

hyperxHeadset.on('power', (power) => console.log(`power: ${power}`))
hyperxHeadset.on('muted', (status) => console.log(`muted: ${status}`))
hyperxHeadset.on('volume', (direction) => console.log(`volume: ${direction}`))
hyperxHeadset.on('charging', (charging) => console.log(`charging: ${charging}`))
hyperxHeadset.on('battery', (percentage) =>
  console.log(`current battery: ${percentage}%`),
)
hyperxHeadset.on('connected', () => console.log('✓ Headset connected'))
hyperxHeadset.on('disconnected', (error) =>
  console.log('✗ Headset disconnected:', error?.message),
)
hyperxHeadset.on('unknown', (data) => console.log('unknown', data))
hyperxHeadset.on('error', (error) => console.error('error', error))

// Clean up on exit
process.on('SIGINT', () => {
  console.log('\nClosing connection...')
  hyperxHeadset.close()
  process.exit(0)
})

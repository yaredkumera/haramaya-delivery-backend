// import QRCode from "qrcode"

// async function generateTestQr() {
//   // Ultra-short text = huge, clean blocks = instant scan!
//   const tinyData = "HU-1042"

//   console.log("🔄 Generating ultra-simple QR Code...")

//   // 1. Terminal print
//   QRCode.toString(tinyData, { type: 'terminal' }, (err, qrTerminal) => {
//     if (err) return console.error(err)
//     console.log("\n📱 Scan this clean, low-density code:\n")
//     console.log(qrTerminal)
//   })

//   // 2. Save as a small 150px image file
//   await QRCode.toFile('./qr-test.png', tinyData, {
//     width: 150,
//     margin: 1
//   })
  
//   console.log("💾 Saved compact 'qr-test.png'!")
// }

// generateTestQr()
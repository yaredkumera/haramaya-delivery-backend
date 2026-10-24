// import axios from "axios"
// import * as cheerio from "cheerio"

// async function testTelebirrExtraction(receiptUrl) {
//   console.log("🔍 Fetching Telebirr receipt:", receiptUrl)

//   try {
//     const response = await axios.get(receiptUrl, {
//       headers: {
//         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
//       },
//     })

//     const $ = cheerio.load(response.data)

//     let payerName = ""
//     let payerPhone = ""
//     let invoiceNo = ""
//     let paymentDate = ""
//     let settledAmount = 0
//     let creditedParty = ""
//     let bankAccountNumber = ""
//     let status = ""

//     // Loop through every table row (tr)
//     $("tr").each((_, row) => {
//       const cols = $(row).find("td")
//       if (cols.length >= 2) {
//         const label = $(cols[0]).text().trim()
//         const value = $(cols[1]).text().trim()

//         if (label.includes("Payer Name")) payerName = value
//         if (label.includes("Payer telebirr no.")) payerPhone = value
//         if (label.includes("Invoice No.")) invoiceNo = value
//         if (label.includes("Payment date")) paymentDate = value
//         if (label.includes("Credited party name")) creditedParty = value
//         if (label.includes("Bank account number")) bankAccountNumber = value
//         if (label.includes("transaction status")) status = value
//         if (label.includes("Settled Amount") || label.includes("m/Settled Amount")) {
//           settledAmount = parseFloat(value.replace(/[^0-9.]/g, "")) || 0
//         }
//       }
//     })

//     // Fallbacks if selectors need extra help from full page text
//     const pageText = $("body").text()

//     if (!invoiceNo) {
//       const matchUrl = receiptUrl.match(/\/receipt\/([A-Za-z0-9]+)/)
//       if (matchUrl) invoiceNo = matchUrl[1]
//     }

//     if (!settledAmount) {
//       // Regex fallback to find amount numbers near "Birr"
//       const matchAmt = pageText.match(/([0-9]+\.[0-9]{2}|[0-9]+)\s*Birr/i)
//       if (matchAmt) settledAmount = parseFloat(matchAmt[1])
//     }

//     console.log("\n================ FIXED TELEBIRR DATA ================")
//     console.log("📋 Status:             ", status || "Completed")
//     console.log("🧾 Invoice / Ref No:   ", invoiceNo)
//     console.log("👤 Payer Name:         ", payerName)
//     console.log("📱 Payer Phone:        ", payerPhone)
//     console.log("🏦 Credited Party:     ", creditedParty || "Telebirr Wallet / Bank")
//     console.log("💳 Target Account:     ", bankAccountNumber || "Direct Wallet")
//     console.log("💵 Settled Amount:     ", settledAmount, "Birr")
//     console.log("📅 Payment Date:       ", paymentDate)
//     console.log("=====================================================\n")

//   } catch (error) {
//     console.error("❌ Error fetching Telebirr receipt:", error.message)
//   }
// }

// // Test with your link
// const testUrl = "https://transactioninfo.ethiotelecom.et/receipt/DJD0QR3P36"
// testTelebirrExtraction(testUrl)
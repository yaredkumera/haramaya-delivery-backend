// import axios from "axios";
// import dotenv from "dotenv";

// dotenv.config();

// // Put your long token here directly if you want to quick-test without .env, 
// // or set AFROMESSAGE_TOKEN in your .env file.
// const TOKEN = process.env.AFROMESSAGE_TOKEN || "YOUR_COPIED_TOKEN_HERE";

// // PUT YOUR REAL ETHIOPIAN PHONE NUMBER HERE (e.g. "0912345678" or "+251912345678")
// const PHONE_NUMBER = "0945944367"; 

// async function testAfro() {
//   console.log("📱 Sending test SMS via AfroMessage...");

//   try {
//     const response = await axios.get("https://api.afromessage.com/api/send", {
//       headers: {
//         Authorization: `Bearer ${TOKEN}`,
//       },
//       params: {
//         to: PHONE_NUMBER,
//         message: "Haramaya Delivery: Your SMS integration is working perfectly! 🚀",
//       },
//     });

//     console.log("✅ SUCCESS!");
//     console.log("Response Data:", response.data);
//   } catch (error) {
//     console.error("❌ FAILED!");
//     if (error.response) {
//       console.error("Error Details:", error.response.data);
//     } else {
//       console.error("Error Message:", error.message);
//     }
//   }
// }

// testAfro();
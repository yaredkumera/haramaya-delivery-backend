import dns from "node:dns"

dns.setDefaultResultOrder("ipv4first")
import app from "./app.js"
import connectDB from "./config/db.js"
import { env } from "./config/env.js"
import {probeHosts} from "./utils/probeHosts.js"
async function start() {
  await connectDB()
  app.listen(env.PORT, () => console.log(`Server running on port ${env.PORT}`))
  void probeHosts()
}

start()
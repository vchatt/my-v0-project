const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { Server } = require("socket.io")

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const waitingUsers = new Set()
const connectedPairs = new Map()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error occurred handling", req.url, err)
      res.statusCode = 500
      res.end("internal server error")
    }
  })

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Broadcast user count
    io.emit("user-count", io.engine.clientsCount)

    socket.on("find-peer", () => {
      // Remove from any existing connections
      const existingPeer = connectedPairs.get(socket.id)
      if (existingPeer) {
        connectedPairs.delete(socket.id)
        connectedPairs.delete(existingPeer)
        io.to(existingPeer).emit("peer-disconnected")
      }

      // Find a waiting user
      const waitingUser = Array.from(waitingUsers)[0]

      if (waitingUser && waitingUser !== socket.id) {
        // Match found
        waitingUsers.delete(waitingUser)

        // Create connection pair
        connectedPairs.set(socket.id, waitingUser)
        connectedPairs.set(waitingUser, socket.id)

        // Notify both users
        socket.emit("matched")
        io.to(waitingUser).emit("matched")
      } else {
        // Add to waiting list
        waitingUsers.add(socket.id)
      }
    })

    socket.on("disconnect-peer", () => {
      const peer = connectedPairs.get(socket.id)
      if (peer) {
        connectedPairs.delete(socket.id)
        connectedPairs.delete(peer)
        io.to(peer).emit("peer-disconnected")
      }
      waitingUsers.delete(socket.id)
    })

    socket.on("offer", (offer) => {
      const peer = connectedPairs.get(socket.id)
      if (peer) {
        io.to(peer).emit("offer", offer)
      }
    })

    socket.on("answer", (answer) => {
      const peer = connectedPairs.get(socket.id)
      if (peer) {
        io.to(peer).emit("answer", answer)
      }
    })

    socket.on("ice-candidate", (candidate) => {
      const peer = connectedPairs.get(socket.id)
      if (peer) {
        io.to(peer).emit("ice-candidate", candidate)
      }
    })

    socket.on("message", (message) => {
      const peer = connectedPairs.get(socket.id)
      if (peer) {
        io.to(peer).emit("message", message)
      }
    })

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)

      // Clean up connections
      const peer = connectedPairs.get(socket.id)
      if (peer) {
        connectedPairs.delete(socket.id)
        connectedPairs.delete(peer)
        io.to(peer).emit("peer-disconnected")
      }

      waitingUsers.delete(socket.id)

      // Broadcast updated user count
      io.emit("user-count", io.engine.clientsCount)
    })
  })

  server
    .once("error", (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})

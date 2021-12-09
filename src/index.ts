import * as http from "http"
import express from "express"
import axios, {AxiosResponse} from "axios"
import {Server as SocketIO, Socket} from "socket.io"
import {instrument} from "@socket.io/admin-ui"
import path from "path"

const app = express()

app.use("/", express.static(path.join(__dirname, "../public")))
app.get("/*", (req, res) => res.redirect("/"))

const handleListen = () => console.log("Listening on port 3000")

const httpServer = http.createServer(app)

const socketServer = new SocketIO(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
})

instrument(socketServer, {
  auth: false
})

interface UserProperty {
  nickname?: string
}

const publicRooms = () => {
  const {sockets: {adapter: {sids, rooms}}} = socketServer
  const publicRooms: string[] = []
  rooms.forEach((_, key) => {
    !sids.has(key) && publicRooms.push(key)
  })
  return publicRooms
}

const updateRooms = () => {
  socketServer.sockets.emit("room_change", publicRooms())
}

const countUsers = (roomName: string) => {
  return socketServer.sockets.adapter.rooms.get(roomName)?.size || 0
}

async function getRandomNickname():Promise<string> {
  return await axios.get("https://nickname.hwanmoo.kr/?format=json")
    .then(res => res.data.words[0])
}

socketServer.on("connection", (user: Socket & UserProperty) => {
  getRandomNickname()
    .then(nickname => user.nickname = nickname)
    .catch(() => user.nickname = user.id)
    .then(() => {
      updateRooms()
      user.onAny(event => {
        console.log(`Socket Event: ${event} from ${user.nickname}`)
      })
      user.emit("set_username", user.nickname)
      user.on("enter_room", (roomName, done) => {
        user.join(roomName)
        done(roomName, countUsers(roomName))
        user.to(roomName).emit("welcome", user.nickname, countUsers(roomName))
        updateRooms()
      })
      user.on("new_message", (msg, cb) => {
        const payload = {
          username: user.nickname,
          message: msg.message
        }
        user.to(msg.destination_room).emit("new_message", payload)
        cb()
      })
      user.on("set_nickname", (nickname, cb) => {
        const prevNickname = user.nickname
        user.nickname = nickname
        user.to(Array.from(user.rooms)).emit("change_nickname", prevNickname, nickname)
        cb()
      })
      user.on("disconnecting", reason => {
        user.rooms.forEach(room => {
          user.to(room).emit("bye", user.nickname)
          user.to(room).emit("usercount_change", countUsers(room) - 1)
        })
      })
      user.on("disconnect", () => {
        updateRooms()
      })
    })
})

httpServer.listen(3000, handleListen)
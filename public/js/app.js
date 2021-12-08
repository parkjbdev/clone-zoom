const socket = io();

const welcome = document.getElementById("welcome")
const room = document.getElementById("room")

let userName = ""
let roomName = ""
room.hidden = true

welcome.querySelector("input").focus()

const showRoom = (roomName, userCount) => {
  welcome.hidden = true;
  room.hidden = false;
  room.querySelector("input").focus()
  addNewUserJoinMessage(userName)
  setRoomHeader(roomName, userCount)
}

const addMessage = (arg) => {
  const ul = room.querySelector("ul")
  const li = document.createElement("li")
  if (typeof arg === "string") li.innerText = arg
  else if (typeof arg === "object") li.innerText = `${arg.username}: ${arg.message}`
  ul.appendChild(li)
}
const addNewUserJoinMessage = (nickname) => {
  addMessage(`${nickname} Joined!`)
}
const addNickNameChangedMessage = (prev, current) => {
  addMessage(`${prev} changed nickname to ${current}`)
}

// Socket Related
const changeNickName = (prev, current) => {
  socket.emit("set_nickname", current, () => {
    addNickNameChangedMessage(prev, current)
    userName = current
  })
}
const sendMessage = (msg) => {
  socket.emit("new_message", msg, () => {
    addMessage(`You: ${msg.message}`)
  })
}
const enterRoom = (roomName) => {
  socket.emit("enter_room", roomName, showRoom);
}

const setRoomHeader = (_roomName, userCount) => {
  room.querySelector("h3").innerHTML = `방제: ${_roomName}<br/>접속한 인원: ${userCount}`
  roomName = _roomName
}

welcome.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = welcome.querySelector("form > input");
  enterRoom(input.value)
});
room.querySelector("#msg").addEventListener("submit", (event) => {
  event.preventDefault()
  const input = room.querySelector("#msg > input")
  const msg = {
    destination_room: roomName,
    message: input.value
  }
  sendMessage(msg)
  input.value = ""
})
room.querySelector("#name").addEventListener("submit", (event) => {
  event.preventDefault()
  const input = room.querySelector("#name > input")
  changeNickName(userName, input.value)
})

socket.on("set_username", nickname => {
  room.querySelector("#name > input").value = nickname.toString()
  userName = nickname.toString()
})
socket.on("welcome", (nickname, count) => {
  addNewUserJoinMessage(nickname)
  setRoomHeader(roomName, count)
})
socket.on("change_nickname", addNickNameChangedMessage)
socket.on("usercount_change", (count) => setRoomHeader(roomName, count))
socket.on("room_change", rooms => {
  const roomList = welcome.querySelector("ul")
  roomList.innerHTML = ""
  rooms.forEach(room => {
    const li = document.createElement("li")
    li.innerText = room
    roomList.append(li)
  })
})
socket.on("new_message", addMessage)
socket.on("bye", username => addMessage(`${username} Left!`))
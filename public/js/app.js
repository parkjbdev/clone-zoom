const socket = io();

const welcome = document.getElementById("welcome")
const room = document.getElementById("room")
const nickname = room.querySelector("#nickname")

let roomName = ""
room.hidden = true

welcome.querySelector("input").focus()

// Nickname Settings
const setNickname = (name) => {
  nickname.innerText !== "" && addNickNameChangedMessage(nickname.innerText, name)
  nickname.innerText = name
}

 const requestSetNickname = (name) => {
  socket.emit("set_username", name, setNickname)
}

const nickname_change_button = document.getElementById("change_nickname")
nickname_change_button.onclick = () => {
  const newNickname = prompt("닉네임 변경")
  requestSetNickname(newNickname)
}

// Enter Room
const showRoom = (roomName, userCount) => {
  welcome.hidden = true;
  room.hidden = false;
  setRoomHeader(roomName, userCount)
}
const enterRoom = (roomName) => {
  socket.emit("enter_room", roomName, showRoom);
}
welcome.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = welcome.querySelector("form > input");
  enterRoom(input.value)
});

// Send Messages
const setRoomHeader = (_roomName, userCount) => {
  room.querySelector("h3").innerHTML = `방제: ${_roomName}<br/>접속한 인원: ${userCount}`
  roomName = _roomName
}
const sendMessage = (msg) => {
  socket.emit("new_message", msg, () => {
    addMessage(`${nickname.innerText} (You): ${msg.message}`)
  })
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

// on Socket Events
socket.on("welcome", (nickname, count) => {
  addNewUserJoinMessage(nickname)
  setRoomHeader(roomName, count)
})
socket.on("init_username", setNickname)
socket.on("username_changed", addNickNameChangedMessage)
socket.on("usercount_changed", (count) => setRoomHeader(roomName, count))
socket.on("room_change", rooms => {
  const roomList = welcome.querySelector("ul")
  roomList.innerHTML = ""
  rooms.forEach(room => {
    const li = document.createElement("li")
    const a = document.createElement("a")
    a.innerText = room
    a.onclick = () => enterRoom(room)
    li.appendChild(a)
    roomList.append(li)
  })
})
socket.on("new_message", addMessage)
socket.on("bye", username => addMessage(`${username} Left!`))
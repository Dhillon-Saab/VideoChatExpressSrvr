import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);
const allUsers = {};

const __dirname = dirname(fileURLToPath(import.meta.url));

// client exposing public
app.use(express.static("public"));

//handling the initial requests
app.get("/", (req, res) => {
  console.log("GET REQUeSt");
  // res.send("Hello from me")
  res.sendFile(join(__dirname + "/app/index.html"));
});

//handle socket conn
io.on("connection", (socket) => {
  console.log(`socket id ${socket.id}`);
  socket.on("join-user", (username) => {
    console.log(`${username} joined socket`);
    allUsers[username] = { username, id: socket.id };

    //sending the info to all users on the socket
    io.emit("joined", allUsers);
  });

  socket.on("offer", ({from, to, offer}) => {
    console.log({ from, to, offer });
    io.to(allUsers[to].id).emit("offer", {from, to, offer});
  });

  socket.on("answer", ({from, to, answer}) => {
    io.to(allUsers[from].id).emit("answer", { from, to, answer });
  });

  socket.on("ICECandidate", candidate=>{
    console.log({candidate});
    socket.broadcast.emit("ICECandidate", candidate)
  })
});

server.listen(5000, () => {
  console.log(`Server Listening`);
});

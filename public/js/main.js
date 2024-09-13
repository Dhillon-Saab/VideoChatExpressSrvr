const createUserBtn = document.getElementById("create-user");
const username = document.getElementById("username");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const socket = io();

let localStream;

const PeerConnection = (function () {
  let peerConnection;

  const createPeerConnection = () => {
    const config = {
      iceServers: [
        {
          urls: "stun:stun1.l.google.com:19302",
        },
      ],
    };
    peerConnection = new RTCPeerConnection(config);

    //add local Streams to peer Connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
    //listen to any remote stream on the socket
    peerConnection.ontrack = function (event) {
      remoteVideo.srcObject = event.streams[0];
    };
    //listen for ICE candidates
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit("ICECandidate", event.candidate);
      }
    };
    return peerConnection;
  };

  return {
    getInstance: () => {
      if (!peerConnection) {
        peerConnection = createPeerConnection();
      }
      return peerConnection;
    },
  };
})();

//handle client events
createUserBtn.addEventListener("click", (e) => {
  if (username.value != "") {
    const usernameContainer = document.querySelector(".username-input");
    socket.emit("join-user", username.value);
    usernameContainer.style.display = "none";
  }
});

//handle socket events
socket.on("joined", (allUsers) => {
  console.log({ allUsers });

  const createUserHtml = () => {
    document.getElementById("allusers").innerHTML = "";

    for (const user in allUsers) {
      const li = document.createElement("li");
      li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;
      if (user !== username.value) {
        const button = document.createElement("button");
        button.classList.add("call-btn");
        button.addEventListener("click", (e) => {
          startCall(user);
        });
        const img = document.createElement("img");
        img.setAttribute("src", "/images/phone.png");
        img.setAttribute("width", 20);
        button.appendChild(img);

        li.appendChild(button);
      }

      document.getElementById("allusers").appendChild(li);
    }
  };

  createUserHtml();
});

socket.on("offer", async ({ from, to, offer }) => {
  const pc = PeerConnection.getInstance();
  // set remote desc
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { from, to, answer: pc.localDescription });
});

socket.on("answer", async ({ from, to, answer }) => {
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(answer);
});

socket.on("ICECandidate", async candidate => {
    console.log({candidate})
  const pc = PeerConnection.getInstance();
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

//starting a call
const startCall = async (user) => {
  const pc = PeerConnection.getInstance();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", {
    from: username.value,
    to: user,
    offer: pc.localDescription,
  });
};

//init app
const startVideo = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    console.log({ stream });
    localStream = stream;
    localVideo.srcObject = stream;
  } catch (error) {}
};

startVideo();

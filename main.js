let APP_ID = "89a2c12d803649a6adb90776ceaf69fb"

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let queryString=window.location.search
let urlParms=new URLSearchParams(queryString)
let roomID=urlParms.get("room")

if(!roomID){
    Window.location="lobby.html"
}

let client;
let channel;
let localstream;
let remotestream;
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
        },
    ],
};

let constraints={
    video:{
        width :{min:640 , ideal :1920 , max:1920},
        height :{min:480 , ideal :1080 , max:1080},


    },
    audio:true
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

    //index.html?room=234234

    channel = client.createChannel(roomID);
    await channel.join();

    channel.on("MemberJoined", handleUserjoined);
    channel.on("MemberLeft",handleUserLeft)
    client.on("MessageFromPeer",handleMessageFromPeer)

    localstream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById("user-1").srcObject = localstream;

    
};

let handleUserLeft=(Memberid)=>{
    document.getElementById("user-2").style.display="none"
    document.getElementById("user-1").classList.remove("smallFrame")
}

let handleUserjoined = async (Memberid) => {
    console.log("a new user has joined the channel :", Memberid);
    createOffer(Memberid)

};

let handleMessageFromPeer= async (Message,Memberid)=>{
    Message=JSON.parse(Message.text)
    if(Message.type === "offer"){
        createAnswer(Memberid,Message.offer)
     }
    if(Message.type ==="answer"){
        addanswer(Message.answer)
    }
    if(Message.type==="candidate"){
        if(peerConnection){
            peerConnection.addIceCandidate(Message.candidate)
        }
    }
}
let createPeerConnection=async(Memberid)=>{
    peerConnection = new RTCPeerConnection(servers);

    remotestream = new MediaStream();
    document.getElementById("user-2").srcObject = remotestream;
    document.getElementById("user-2").style.display="block"
    document.getElementById("user-1").classList.add("smallFrame")
    if(!localstream){

        localstream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
        });
        document.getElementById("user-1").srcObject = localstream;
    }

    localstream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localstream);
    });

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remotestream.addTrack(track);
        });
    };

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({text:JSON.stringify({"type":"candidate","candidate":event.candidate})},Memberid)
        }
    }

}
let createOffer = async (Memberid) => {

    await createPeerConnection(Memberid)
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({text:JSON.stringify({"type":"offer","offer":offer})},Memberid)
};

let createAnswer= async(Memberid,offer)=>{
    await createPeerConnection(Memberid)
    await peerConnection.setRemoteDescription(offer)
    let  answer=await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    client.sendMessageToPeer({text:JSON.stringify({"type":"answer","answer":answer})},Memberid)
}

let addanswer=async(answer)=>{
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer) 
    }

}

let leaveChannel=async()=>{
    await channel.leave()
    await client.logout()
}

let toggleCamera=async()=>{
    let videoTrack=localstream.getTracks().find(track=> track.kind==="video")
    if(videoTrack.enabled){
        videoTrack.enabled=false
        document.getElementById("camera-btn").style.backgroundColor=`rgb(255,80,80)`
    }else{
        videoTrack.enabled=true
        document.getElementById("camera-btn").style.backgroundColor=`rgb(179,102,242,.9)`
    }
    }


let toggleMic=async()=>{
    let audioTrack=localstream.getTracks().find(track=> track.kind==="audio")
    if(audioTrack.enabled){
        audioTrack.enabled=false
        document.getElementById("mic-btn").style.backgroundColor=`rgb(255,80,80)`
    }else{
        audioTrack.enabled=true
        document.getElementById("mic-btn").style.backgroundColor=`rgb(179,102,242,.9)`
    }
    }


window.addEventListener("beforeunload",leaveChannel)

document.getElementById("camera-btn").addEventListener("click",toggleCamera)
document.getElementById("mic-btn").addEventListener("click",toggleMic)

init();

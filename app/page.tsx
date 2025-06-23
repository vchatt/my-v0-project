"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Send, Users } from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface Message {
  id: string
  text: string
  sender: "me" | "peer"
  timestamp: Date
}

export default function RandomVideoCall() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(0)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  }

  useEffect(() => {
    const newSocket = io()
    setSocket(newSocket)

    newSocket.on("connect", () => {
      setIsConnected(true)
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
      setIsInCall(false)
      setIsSearching(false)
    })

    newSocket.on("user-count", (count: number) => {
      setOnlineUsers(count)
    })

    newSocket.on("matched", async () => {
      setIsSearching(false)
      setIsInCall(true)
      await initializeCall(true)
    })

    newSocket.on("peer-disconnected", () => {
      endCall()
    })

    newSocket.on("offer", async (offer: RTCSessionDescriptionInit) => {
      await handleOffer(offer)
    })

    newSocket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      await handleAnswer(answer)
    })

    newSocket.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
      await handleIceCandidate(candidate)
    })

    newSocket.on("message", (message: { text: string; timestamp: string }) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message.text,
        sender: "peer",
        timestamp: new Date(message.timestamp),
      }
      setMessages((prev) => [...prev, newMessage])
    })

    return () => {
      newSocket.disconnect()
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const initializeCall = async (isInitiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const peerConnection = new RTCPeerConnection(iceServers)
      peerConnectionRef.current = peerConnection

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream)
      })

      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("ice-candidate", event.candidate)
        }
      }

      if (isInitiator) {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        socket?.emit("offer", offer)
      }
    } catch (error) {
      console.error("Error accessing media devices:", error)
      alert("Could not access camera/microphone. Please check permissions.")
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) {
      await initializeCall(false)
    }

    const peerConnection = peerConnectionRef.current!
    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    socket?.emit("answer", answer)
  }

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnectionRef.current
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer)
    }
  }

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    const peerConnection = peerConnectionRef.current
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate)
    }
  }

  const startSearch = () => {
    if (socket && isConnected) {
      setIsSearching(true)
      setMessages([])
      socket.emit("find-peer")
    }
  }

  const endCall = () => {
    setIsInCall(false)
    setIsSearching(false)
    setMessages([])

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    socket?.emit("disconnect-peer")
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const sendMessage = () => {
    if (messageInput.trim() && socket && isInCall) {
      const message: Message = {
        id: Date.now().toString(),
        text: messageInput.trim(),
        sender: "me",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, message])
      socket.emit("message", {
        text: message.text,
        timestamp: message.timestamp.toISOString(),
      })
      setMessageInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Random Video Chat</h1>
          <p className="text-gray-600">Connect with strangers around the world</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Users className="w-4 h-4 text-green-500" />
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {onlineUsers} users online
            </Badge>
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm text-gray-600">{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Video Call</span>
                  {isInCall && <Badge className="bg-green-100 text-green-700">Connected</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Remote Video */}
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {!isInCall && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-75">Waiting for connection...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Local Video */}
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                      You
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isInCall && !isSearching && (
                    <Button
                      onClick={startSearch}
                      disabled={!isConnected}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Start Random Call
                    </Button>
                  )}

                  {isSearching && (
                    <Button disabled className="bg-yellow-600 text-white">
                      <Users className="w-4 h-4 mr-2 animate-spin" />
                      Searching for someone...
                    </Button>
                  )}

                  {isInCall && (
                    <>
                      <Button onClick={toggleVideo} variant={isVideoEnabled ? "default" : "destructive"} size="sm">
                        {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                      </Button>

                      <Button onClick={toggleAudio} variant={isAudioEnabled ? "default" : "destructive"} size="sm">
                        {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </Button>

                      <Button onClick={endCall} variant="destructive" size="sm">
                        <PhoneOff className="w-4 h-4 mr-2" />
                        End Call
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      <p>No messages yet</p>
                      <p className="text-sm">Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            message.sender === "me" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          <p>{message.text}</p>
                          <p className={`text-xs mt-1 ${message.sender === "me" ? "text-blue-100" : "text-gray-500"}`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isInCall ? "Type a message..." : "Connect to start chatting"}
                    disabled={!isInCall}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!isInCall || !messageInput.trim()} size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Phone, PhoneOff } from 'lucide-react';

const VideoCallApp = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  // Initialize WebRTC peer connection
  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real app, send this to the signaling server
        console.log('New ICE candidate:', event.candidate);
      }
    };

    // Handle receiving remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    peerConnectionRef.current = pc;
  };

  // Start local video stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  };

  // Start a call (create offer)
  const startCall = async () => {
    if (!peerConnectionRef.current) {
      initializePeerConnection();
    }

    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      // In a real app, send this offer through your signaling server
      setConnectionCode(btoa(JSON.stringify(offer)));
      setIsCallStarted(true);
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  // Join a call (handle offer and create answer)
  const joinCall = async () => {
    if (!peerConnectionRef.current) {
      initializePeerConnection();
    }

    try {
      const offer = JSON.parse(atob(joinCode));
      await peerConnectionRef.current.setRemoteDescription(offer);
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      // In a real app, send this answer through your signaling server
      console.log('Created answer:', answer);
      setIsCallStarted(true);
    } catch (err) {
      console.error('Error joining call:', err);
    }
  };

  // End call
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallStarted(false);
    setConnectionCode('');
    setJoinCode('');
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-6 h-6" />
            P2P Video Call
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-white text-sm">You</div>
              </div>
              {!isCallStarted && (
                <div className="space-y-4">
                  <Button 
                    className="w-full" 
                    onClick={startLocalStream}
                    disabled={localStream}
                  >
                    Start Camera
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={startCall}
                    disabled={!localStream || isCallStarted}
                  >
                    Create Call
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 text-white text-sm">Remote</div>
              </div>
              {!isCallStarted && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter connection code"
                    className="w-full p-2 border rounded"
                  />
                  <Button 
                    className="w-full"
                    onClick={joinCall}
                    disabled={!localStream || !joinCode}
                  >
                    Join Call
                  </Button>
                </div>
              )}
            </div>
          </div>

          {connectionCode && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="font-medium">Connection Code:</p>
              <p className="break-all">{connectionCode}</p>
            </div>
          )}

          {isCallStarted && (
            <Button 
              className="mt-4 w-full bg-red-600 hover:bg-red-700" 
              onClick={endCall}
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoCallApp;
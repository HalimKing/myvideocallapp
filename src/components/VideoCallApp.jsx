import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, Loader2 } from 'lucide-react';

const VideoCallApp = () => {
  // State variables to manage local and remote streams, call states, and other configurations
  const [localStream, setLocalStream] = useState(null); // Stores the local video/audio stream
  const [remoteStream, setRemoteStream] = useState(null); // Stores the remote video/audio stream
  const [isCallStarted, setIsCallStarted] = useState(false); // Indicates if the call has started
  const [connectionCode, setConnectionCode] = useState(''); // Connection code for initiating or joining a call
  const [joinCode, setJoinCode] = useState(''); // Connection code entered to join a call
  const [answerCode, setAnswerCode] = useState(''); // Code used to complete the connection
  const [isCaller, setIsCaller] = useState(false); // Indicates if the user initiated the call
  const [iceCandidates, setIceCandidates] = useState([]); // List of ICE candidates
  const [error, setError] = useState(''); // Stores error messages
  const [isLoading, setIsLoading] = useState(false); // Indicates if an operation is in progress
  const [isMuted, setIsMuted] = useState(false); // Mute state of the local audio
  const [isCameraOff, setIsCameraOff] = useState(false); // Camera on/off state
  const [connectionStatus, setConnectionStatus] = useState(''); // Current connection status

    // References to video elements and the peer connection
    const localVideoRef = useRef(null); // Reference to the local video element
    const remoteVideoRef = useRef(null); // Reference to the remote video element
    const peerConnectionRef = useRef(null); // Reference to the RTCPeerConnection instance
  
    // Function to initialize the peer connection with ICE server configuration
    const initializePeerConnection = () => {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      };

     // Handle the generation of ICE candidates
    const pc = new RTCPeerConnection(configuration);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidates = [...iceCandidates, event.candidate];
        setIceCandidates(candidates);
        
        const fullCode = {
          type: isCaller ? 'offer' : 'answer',
          sdp: pc.localDescription,
          candidates: candidates
        };
        setConnectionCode(btoa(JSON.stringify(fullCode))); // Encode and save the connection code
      }
    };

    // Update connection status when it changes
    pc.oniceconnectionstatechange = () => {
      setConnectionStatus(pc.iceConnectionState);
    };

    // Set the remote stream when a track is received
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Add local tracks to the peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    peerConnectionRef.current = pc; // Save the peer connection instance
    return pc;
  };

  // Function to start the local video/audio stream
  const startLocalStream = async () => {
    setIsLoading(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream); // Save the local stream
    } catch (err) {
      setError('Could not access camera or microphone. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to initiate a call and create an offer
  const startCall = async () => {
    setIsLoading(true);
    setError('');
    setIsCaller(true);
    setIceCandidates([]);
    
    try {
      const pc = initializePeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const fullCode = {
        type: 'offer',
        sdp: offer,
        candidates: []
      };
      setConnectionCode(btoa(JSON.stringify(fullCode))); // Encode and save the offer code
      setIsCallStarted(true);
    } catch (err) {
      setError('Failed to create call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to join an existing call using a connection code
  const joinCall = async () => {
    setIsLoading(true);
    setError('');
    setIsCaller(false);
    setIceCandidates([]);
    
    try {
      const pc = initializePeerConnection();
      const { sdp: offer, candidates } = JSON.parse(atob(joinCode)); // Decode the join code
      await pc.setRemoteDescription(offer);
      
      for (const candidate of candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)); // Add ICE candidates
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const fullCode = {
        type: 'answer',
        sdp: answer,
        candidates: []
      };
      setConnectionCode(btoa(JSON.stringify(fullCode))); // Encode and save the answer code
      setIsCallStarted(true);
    } catch (err) {
      setError('Invalid connection code or connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the answer from a peer
  const handleAnswer = async () => {
    if (!peerConnectionRef.current) return;
    setIsLoading(true);
    setError('');
    
    try {
      const { sdp: answer, candidates } = JSON.parse(atob(answerCode));  // Decode the answer code
      await peerConnectionRef.current.setRemoteDescription(answer);
      
      for (const candidate of candidates) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); // Add ICE candidates
      }
    } catch (err) {
      setError('Invalid answer code or connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to toggle the mute state of the local audio
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled; // Toggle the audio track state
      });
      setIsMuted(!isMuted);
    }
  };

  // Function to toggle the camera on/off state
  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled; // Toggle the video track state
      });
      setIsCameraOff(!isCameraOff);
    }
  };

   // Function to end the call and clean up resources
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop()); // Stop all local tracks
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallStarted(false);
    setConnectionCode('');
    setJoinCode('');
    setAnswerCode('');
    setIsCaller(false);
    setIceCandidates([]);
    setConnectionStatus('');
    setIsMuted(false);
    setIsCameraOff(false);
  };

  // Cleanup function to stop streams and close connections on unmount
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

  // Effect to update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Helper function to determine the connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-6 h-6" />
              P2P Video Call
            </div>
            {connectionStatus && (
              <span className={`text-sm ${getConnectionStatusColor()}`}>
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
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
                {localStream && (
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={toggleMute}
                      className="w-4 h-4 bg-orange-700 p-4 text-white"

                    >
                    <span>

                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={toggleCamera}
                      className="w-4 h-4 bg-orange-700 p-4 text-white"
                    >
                    <span>

                      {isCameraOff ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    </span>
                    </Button>
                  </div>
                )}
              </div>
              {!isCallStarted && (
                <div className="space-y-4">
                  <Button 
                    className="w-full"
                    onClick={startLocalStream}
                    disabled={localStream || isLoading}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Start Camera
                  </Button>
                  <Button 
                    className="w-full" 
                    onClick={startCall}
                    disabled={!localStream || isCallStarted || isLoading}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
                    disabled={isLoading}
                  />
                  <Button 
                    className="w-full"
                    onClick={joinCall}
                    disabled={!localStream || !joinCode || isLoading}
                  >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Join Call
                  </Button>
                </div>
              )}
            </div>
          </div>

          {connectionCode && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="font-medium">Share this code:</p>
              <p className="break-all">{connectionCode}</p>
            </div>
          )}

          {isCaller && isCallStarted && !remoteStream && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-2">
              <p className="font-medium">Enter answer code from peer:</p>
              <input
                type="text"
                value={answerCode}
                onChange={(e) => setAnswerCode(e.target.value)}
                placeholder="Paste answer code here"
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
              <Button 
                className="w-full"
                onClick={handleAnswer}
                disabled={!answerCode || isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Complete Connection
              </Button>
            </div>
          )}

          {isCallStarted && (
            <Button 
              className="mt-4 w-full bg-red-600 hover:bg-red-700" 
              onClick={endCall}
              disabled={isLoading}
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
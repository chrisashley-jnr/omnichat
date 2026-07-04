'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';

export type ChatStatus =
  | 'idle'
  | 'finding'
  | 'connecting'
  | 'connected'
  | 'peer-left'
  | 'banned'
  | 'captcha-failed'
  | 'rate-limited'
  | 'error';

export interface ChatMessage {
  from: 'me' | 'stranger';
  text: string;
  at: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';

export function useVideoChat() {
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
  ]);

  const socket = getSocket();

  // Fetch TURN/STUN config once on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/turn-credentials`)
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg?.iceServers?.length) iceServersRef.current = cfg.iceServers;
      })
      .catch(() => {
        /* fall back to default STUN already set */
      });
  }, []);

  const teardownPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const createPeerConnection = useCallback(
    (roomId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            roomId,
            data: { type: 'ice-candidate', candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setStatus('connected');
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setStatus((s) => (s === 'connected' ? 'peer-left' : s));
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => pc.addTrack(track, localStreamRef.current!));
      }

      pcRef.current = pc;
      return pc;
    },
    [socket]
  );

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const findPartner = useCallback(
    async (interests: string[] = [], turnstileToken?: string) => {
      setMessages([]);
      setStatus('finding');
      await ensureLocalMedia();
      socket.emit('find-partner', { interests, turnstileToken });
    },
    [ensureLocalMedia, socket]
  );

  const leaveRoom = useCallback(() => {
    if (roomIdRef.current) {
      socket.emit('leave-room', { roomId: roomIdRef.current });
    }
    teardownPeerConnection();
    roomIdRef.current = null;
    setStatus('idle');
  }, [socket, teardownPeerConnection]);

  const nextPartner = useCallback(
    (interests: string[] = [], turnstileToken?: string) => {
      teardownPeerConnection();
      roomIdRef.current = null;
      setMessages([]);
      setStatus('finding');
      socket.emit('find-partner', { interests, turnstileToken });
    },
    [socket, teardownPeerConnection]
  );

  const reportPartner = useCallback(
    (reason: string) => {
      if (roomIdRef.current) {
        socket.emit('report', { roomId: roomIdRef.current, reason });
      }
      teardownPeerConnection();
      roomIdRef.current = null;
      setStatus('idle');
    },
    [socket, teardownPeerConnection]
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!roomIdRef.current || !text.trim()) return;
      socket.emit('chat-message', { roomId: roomIdRef.current, text });
      setMessages((prev) => [...prev, { from: 'me', text, at: Date.now() }]);
    },
    [socket]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!roomIdRef.current) return;
      socket.emit('typing', { roomId: roomIdRef.current, isTyping });
    },
    [socket]
  );

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }, [camOn]);

  useEffect(() => {
    function onMatched({
      roomId,
      initiator,
    }: {
      roomId: string;
      initiator: boolean;
    }) {
      roomIdRef.current = roomId;
      setStatus('connecting');
      const pc = createPeerConnection(roomId);

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer).then(() => offer))
          .then((offer) => {
            socket.emit('signal', { roomId, data: { type: 'offer', offer } });
          })
          .catch(() => setStatus('error'));
      }
    }

    async function onSignal({ data }: { data: any }) {
      const pc = pcRef.current;
      if (!pc || !roomIdRef.current) return;

      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', {
          roomId: roomIdRef.current,
          data: { type: 'answer', answer },
        });
      } else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === 'ice-candidate' && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          /* ignore late/invalid candidates */
        }
      }
    }

    function onPeerLeft() {
      teardownPeerConnection();
      roomIdRef.current = null;
      setStatus('peer-left');
    }

    function onChatMessage({ text, at }: { text: string; at: number }) {
      setMessages((prev) => [...prev, { from: 'stranger', text, at }]);
    }

    function onTyping({ isTyping }: { isTyping: boolean }) {
      setStrangerTyping(isTyping);
    }

    function onBanned() {
      setStatus('banned');
      teardownPeerConnection();
    }

    function onCaptchaFailed() {
      setStatus('captcha-failed');
    }

    function onRateLimited() {
      setStatus('rate-limited');
    }

    socket.on('matched', onMatched);
    socket.on('signal', onSignal);
    socket.on('peer-left', onPeerLeft);
    socket.on('chat-message', onChatMessage);
    socket.on('typing', onTyping);
    socket.on('banned', onBanned);
    socket.on('captcha-failed', onCaptchaFailed);
    socket.on('rate-limited', onRateLimited);

    return () => {
      socket.off('matched', onMatched);
      socket.off('signal', onSignal);
      socket.off('peer-left', onPeerLeft);
      socket.off('chat-message', onChatMessage);
      socket.off('typing', onTyping);
      socket.off('banned', onBanned);
      socket.off('captcha-failed', onCaptchaFailed);
      socket.off('rate-limited', onRateLimited);
    };
  }, [createPeerConnection, socket, teardownPeerConnection]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      teardownPeerConnection();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [teardownPeerConnection]);

  return {
    status,
    messages,
    strangerTyping,
    micOn,
    camOn,
    localVideoRef,
    remoteVideoRef,
    findPartner,
    nextPartner,
    leaveRoom,
    reportPartner,
    sendMessage,
    setTyping,
    toggleMic,
    toggleCam,
  };
}

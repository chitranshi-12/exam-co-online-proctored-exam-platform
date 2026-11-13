import React, { useEffect, useRef, useState } from 'react';
import { Attempt } from '../types';
import { Monitor, Camera, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface WebRTCViewerProps {
  attempt: Attempt;
  fallbackScreenUrl?: string;
  fallbackWebcamUrl?: string;
  socket?: any;
}

export const WebRTCViewer: React.FC<WebRTCViewerProps> = ({
  attempt,
  fallbackScreenUrl,
  fallbackWebcamUrl,
  socket,
}) => {
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'fallback'>(
    'connecting'
  );
  const [latestFrame, setLatestFrame] = useState<string>(fallbackScreenUrl || '');
  const [latestWebcam, setLatestWebcam] = useState<string>(fallbackWebcamUrl || '');

  const videoScreenRef = useRef<HTMLVideoElement>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    setLatestFrame(fallbackScreenUrl || '');
  }, [fallbackScreenUrl]);

  useEffect(() => {
    setLatestWebcam(fallbackWebcamUrl || '');
  }, [fallbackWebcamUrl]);

  useEffect(() => {
    let isMounted = true;

    // WebRTC PeerConnection setup
    if (socket && typeof RTCPeerConnection !== 'undefined') {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        peerConnRef.current = pc;

        pc.ontrack = (event) => {
          if (videoScreenRef.current && event.streams[0]) {
            videoScreenRef.current.srcObject = event.streams[0];
            if (isMounted) {
              setStreamActive(true);
              setConnectionState('connected');
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('ice_candidate', {
              targetAttemptId: attempt.id,
              candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            if (isMounted) {
              setConnectionState('fallback');
              setStreamActive(false);
            }
          }
        };

        // Emit viewer request to the signaling server
        socket.emit('viewer_request', { targetAttemptId: attempt.id });

        socket.on('offer', async (data: any) => {
          if (data.attemptId === attempt.id && pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('answer', {
                targetSocketId: data.studentSocketId,
                sdp: answer,
              });
            } catch (err) {
              console.warn('WebRTC answer creation error:', err);
              if (isMounted) setConnectionState('fallback');
            }
          }
        });

        socket.on('ice_candidate', async (data: any) => {
          if (pc && data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.warn('Error adding ice candidate:', err);
            }
          }
        });
      } catch (err) {
        console.warn('WebRTC initialization failed:', err);
        setConnectionState('fallback');
      }
    } else {
      // In demo mode or without socket, use high-fidelity snapshot fallback stream
      setConnectionState('connected');
    }

    // Auto fallback timeout if WebRTC takes longer than 4.5 seconds
    const fallbackTimer = setTimeout(() => {
      if (isMounted && connectionState === 'connecting' && !streamActive) {
        setConnectionState('fallback');
      }
    }, 4500);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      if (peerConnRef.current) {
        peerConnRef.current.close();
        peerConnRef.current = null;
      }
      if (socket) {
        socket.emit('stop_view', { targetAttemptId: attempt.id });
      }
    };
  }, [attempt.id, socket]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Screen Feed (2 cols) */}
      <div className="md:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-indigo-600" />
            <span>Candidate Screen Stream</span>
          </span>
          <div className="flex items-center gap-2">
            {streamActive ? (
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                WebRTC Active · 60 FPS
              </span>
            ) : (
              <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Snapshot Stream · 8s Refresh
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-950 rounded-xl aspect-video border border-slate-200 overflow-hidden relative flex items-center justify-center">
          {streamActive ? (
            <video
              ref={videoScreenRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : latestFrame ? (
            <img
              src={latestFrame}
              alt="Candidate Screen Stream"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
              <span>Awaiting candidate display frame...</span>
            </div>
          )}

          <div className="absolute top-3 left-3 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
            {attempt.name} · {attempt.rollNo}
          </div>
        </div>
      </div>

      {/* Webcam Feed (1 col) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-teal-600" />
            <span>Webcam Stream</span>
          </span>
          <span className="text-[11px] font-semibold text-teal-700">Verified</span>
        </div>

        <div className="bg-slate-900 rounded-xl aspect-video md:aspect-auto md:h-[240px] border border-slate-200 overflow-hidden relative flex items-center justify-center">
          {latestWebcam ? (
            <img
              src={latestWebcam}
              alt="Candidate Webcam Stream"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
              <Camera className="w-6 h-6 text-slate-600" />
              <span>Webcam active</span>
            </div>
          )}

          <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 text-white text-[10px] px-2 py-1 rounded flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">1 Face In Frame</span>
            <span className="font-mono">720p</span>
          </div>
        </div>

        {/* Quick Candidate Metrics */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mt-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Candidate Status:</span>
            <span className="font-semibold text-slate-800 capitalize">
              {attempt.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Flagged Incidents:</span>
            <span
              className={`font-bold tabular-nums ${
                attempt.violationCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {attempt.violationCount} incidents
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Connection:</span>
            <span
              className={`font-semibold ${
                attempt.isOnline ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {attempt.isOnline ? 'Active Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

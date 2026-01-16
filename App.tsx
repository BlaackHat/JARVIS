
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Message } from './types';
import ArcReactor from './components/ArcReactor';
import SystemMonitor from './components/SystemMonitor';
import ChatInterface from './components/ChatInterface';
import { generateJarvisResponseStream, speakJarvis } from './services/gemini';
import { JARVIS_SYSTEM_PROMPT } from './constants';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'jarvis',
      content: 'System fully operational, Sir Rezwan. The global mainframe is at your disposal. I have verified the secure uplink; we are ready for your commands.',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentLiveSessionRef = useRef<any>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const isPlayingTTSRef = useRef(false);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const gain = 1.0 / 32768.0;
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] * gain;
      }
    }
    return buffer;
  };

  const ensureAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const playAudioChunk = async (base64: string) => {
    const ctx = await ensureAudioContext();
    const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    const now = ctx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.05;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    sourcesRef.current.add(source);
    return new Promise(resolve => {
      source.onended = () => {
        sourcesRef.current.delete(source);
        resolve(true);
      };
    });
  };

  const processTTSQueue = async () => {
    if (isPlayingTTSRef.current || ttsQueueRef.current.length === 0) return;
    isPlayingTTSRef.current = true;
    setAppState(AppState.SPEAKING);

    while (ttsQueueRef.current.length > 0) {
      const textChunk = ttsQueueRef.current.shift();
      if (textChunk) {
        const audioData = await speakJarvis(textChunk);
        if (audioData) {
          await playAudioChunk(audioData);
        }
      }
    }

    isPlayingTTSRef.current = false;
    if (ttsQueueRef.current.length === 0) {
      setAppState(prev => prev === AppState.SPEAKING ? AppState.IDLE : prev);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingImage(event.target?.result as string);
        setUserInput(`Sir Rezwan, I've scanned this payload. Analyzing via global mainframe...`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    const text = userInput.trim();
    if (!text && !pendingImage) return;
    setUserInput('');
    await ensureAudioContext();

    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text, 
      timestamp: new Date(),
      image: pendingImage || undefined
    };
    setMessages(prev => [...prev, userMsg]);

    setAppState(AppState.THINKING);
    const jarvisId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: jarvisId, role: 'jarvis', content: '', timestamp: new Date() }]);

    const history = messages.slice(-10).map(m => ({
      role: m.role === 'jarvis' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let accumulatedText = "";
    let lastSpokenIndex = 0;

    const result = await generateJarvisResponseStream(text, (fullText) => {
      setMessages(prev => prev.map(m => m.id === jarvisId ? { ...m, content: fullText } : m));
      
      const segments = fullText.match(/[^.!?]+[.!?]+/g);
      if (segments && segments.length > lastSpokenIndex) {
        for (let i = lastSpokenIndex; i < segments.length; i++) {
          ttsQueueRef.current.push(segments[i].trim());
          processTTSQueue();
        }
        lastSpokenIndex = segments.length;
      }
      accumulatedText = fullText;
    }, history, pendingImage || undefined);

    setMessages(prev => prev.map(m => m.id === jarvisId ? { 
      ...m, 
      content: result.text, 
      links: result.links 
    } : m));

    setPendingImage(null);

    const processedSoFar = (fullText: string, index: number) => {
        const segs = fullText.match(/[^.!?]+[.!?]+/g) || [];
        return segs.slice(0, index).join(' ');
    };
    const finalTail = accumulatedText.substring(processedSoFar(accumulatedText, lastSpokenIndex).length).trim();
    if (finalTail) {
      ttsQueueRef.current.push(finalTail);
      processTTSQueue();
    }
  };

  const startLiveSession = async () => {
    try {
      if (currentLiveSessionRef.current) {
        try { currentLiveSessionRef.current.close(); } catch(e) {}
        currentLiveSessionRef.current = null;
      }
      
      setAppState(AppState.LISTENING);
      const outputCtx = await ensureAudioContext();
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let currentTrans = "";
      const jarvisId = Date.now().toString();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log("J.A.R.V.I.S. Uplink Established for Sir Rezwan.");
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => {
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                let binary = '';
                const bytes = new Uint8Array(int16.buffer);
                for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                try { 
                  s.sendRealtimeInput({ 
                    media: { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' } 
                  }); 
                } catch(err) {}
              }).catch(() => {});
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const b64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (b64) {
              setAppState(AppState.SPEAKING);
              const now = outputCtx.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
              const buf = await decodeAudioData(decode(b64), outputCtx, 24000, 1);
              const src = outputCtx.createBufferSource();
              src.buffer = buf;
              src.connect(outputCtx.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(src);
              src.onended = () => sourcesRef.current.delete(src);
            }
            if (msg.serverContent?.outputTranscription) {
              currentTrans += msg.serverContent.outputTranscription.text;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === jarvisId) return [...prev.slice(0, -1), { ...last, content: currentTrans }];
                return [...prev, { id: jarvisId, role: 'jarvis', content: currentTrans, timestamp: new Date() }];
              });
            }
            if (msg.serverContent?.turnComplete) setAppState(AppState.IDLE);
          },
          onclose: () => {
            setAppState(AppState.IDLE);
            currentLiveSessionRef.current = null;
          },
          onerror: (e) => {
            console.error("Uplink Interruption for Sir Rezwan.", e);
            setAppState(AppState.ERROR);
            currentLiveSessionRef.current = null;
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: JARVIS_SYSTEM_PROMPT + "\nNote: Keep audio interactions sophisticated and punchy."
        }
      });

      currentLiveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Uplink failed significantly for Sir Rezwan.", err);
      setAppState(AppState.IDLE);
    }
  };

  const startWakeWordListener = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setAppState(AppState.WAKING);
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('').toLowerCase();
      if (transcript.includes('jarvis')) { recognition.stop(); startLiveSession(); }
    };
    recognition.onend = () => { if (isVoiceActive && appState === AppState.WAKING) recognition.start(); };
    recognitionRef.current = recognition;
    recognition.start();
  }, [isVoiceActive, appState]);

  const toggleVoice = async () => {
    await ensureAudioContext();
    if (isVoiceActive) {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (currentLiveSessionRef.current) currentLiveSessionRef.current.close();
      setIsVoiceActive(false);
      setAppState(AppState.IDLE);
    } else {
      setIsVoiceActive(true);
      startWakeWordListener();
    }
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) { videoRef.current.srcObject = stream; setCameraActive(true); }
      } catch (e) { console.error(e); }
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050505] text-[#00D4FF] p-6 flex flex-col gap-6 select-none">
      <div className="scan-line" />
      <header className="flex justify-between items-start z-20">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-[0.3em] glitch-text">J.A.R.V.I.S.</h1>
          <div className="flex gap-2 items-center text-[10px] mono">
            <span className="px-2 py-0.5 border border-[#00D4FF]/30 bg-[#00D4FF]/5 rounded-sm">V.3.5.REZWAN</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${process.env.API_KEY ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 shadow-[0_0_5px_#ef4444]'}`}></span>
              {process.env.API_KEY ? 'ENCRYPTED UPLINK SECURE' : 'UPLINK DISCONNECTED'}
            </span>
            {appState === AppState.THINKING && <span className="text-xs ml-2 text-white animate-pulse uppercase tracking-[0.2em]">Neural Synthesis...</span>}
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-right flex flex-col items-end">
             <div className="text-2xl font-bold mono">100%</div>
             <div className="text-[10px] tracking-widest opacity-50 uppercase">Identity Verified: REZWAN</div>
           </div>
           <button onClick={toggleVoice} className={`w-10 h-10 border rounded-sm flex items-center justify-center transition-all ${isVoiceActive ? 'border-[#00D4FF] bg-[#00D4FF]/20 shadow-[0_0_10px_#00D4FF]' : 'border-white/10 opacity-30 hover:opacity-100'}`}>
             <i className={`fas fa-microphone${isVoiceActive ? '' : '-slash'}`}></i>
           </button>
        </div>
      </header>

      <main className="flex-1 flex gap-6 min-h-0 z-20">
        <div className="w-1/4 flex flex-col gap-6">
          <div className="hud-glass flex-1 relative rounded-sm group overflow-hidden border-b-4 border-b-yellow-500/50">
            {cameraActive ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-50 contrast-150 scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-4 opacity-40">
                <i className="fas fa-eye-slash text-4xl"></i>
                <p className="text-xs uppercase tracking-widest">Imaging array offline.</p>
              </div>
            )}
            <button onClick={toggleCamera} className={`absolute bottom-4 right-4 p-3 rounded-full border transition-all ${cameraActive ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10'}`}>
              <i className={`fas ${cameraActive ? 'fa-video-slash' : 'fa-video'}`}></i>
            </button>
          </div>
          <SystemMonitor />
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <ChatInterface 
            messages={messages} 
            input={userInput} 
            onInputChange={setUserInput} 
            onSend={handleSendMessage} 
            loading={appState === AppState.THINKING}
            onFileUpload={handleFileUpload}
          />
        </div>

        <div className="w-1/4 flex flex-col items-center justify-between py-10">
          <ArcReactor active={appState !== AppState.IDLE} />
          <div className="w-full flex flex-col gap-4">
            <div className="hud-glass p-4 rounded-sm border-r-4 border-r-[#00D4FF]">
              <h4 className="text-[11px] font-bold uppercase tracking-widest mb-3 opacity-60 text-[#00D4FF]">Uplink Integrity Node</h4>
              <div className="flex gap-1 h-8">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className={`flex-1 transition-all duration-300 ${appState !== AppState.IDLE ? (Math.random() > 0.4 ? 'bg-[#00D4FF]' : 'bg-[#00D4FF]/20') : 'bg-[#00D4FF]/10'}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['MAIL', 'STREAM', 'INTEL', 'CODE'].map(tool => (
                <button key={tool} className="hud-glass p-4 hover:bg-[#00D4FF]/10 transition-colors flex flex-col items-center gap-2 group">
                  <i className={`fas fa-${tool === 'MAIL' ? 'envelope' : tool === 'STREAM' ? 'play' : tool === 'INTEL' ? 'satellite-dish' : 'terminal'} opacity-50 group-hover:opacity-100 text-[#00D4FF]`}></i>
                  <span className="text-[10px] tracking-widest font-bold text-[#00D4FF]">{tool}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="z-20 h-8 flex items-center justify-between text-[10px] mono opacity-40 border-t border-white/10 mt-auto">
        <div className="flex gap-4 uppercase tracking-[0.2em]">
          <span>G-FORCE: 1.0G</span>
          <span>LAT: 23.8103° N</span>
          <span>USER: REZWAN MAYEEN</span>
        </div>
        <div className="uppercase">ENCRYPTED STARK MAINLINE — AUTHORIZED ACCESS ONLY</div>
      </footer>
    </div>
  );
};

export default App;

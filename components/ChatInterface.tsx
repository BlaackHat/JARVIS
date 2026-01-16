
import React, { useRef, useEffect } from 'react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  loading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, input, onInputChange, onSend, loading, onFileUpload }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/```python|```/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <div key={i} className="my-3 p-4 bg-black/80 border border-[#00D4FF]/40 rounded-sm mono text-sm relative group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-code"></i> Tactical Coding Protocol
              </span>
              <button 
                onClick={() => copyToClipboard(part.trim())}
                className="text-[9px] bg-[#00D4FF]/10 hover:bg-[#00D4FF]/30 border border-[#00D4FF]/20 px-2 py-1 transition-all uppercase"
              >
                Copy Protocol
              </button>
            </div>
            <pre className="text-blue-200 overflow-x-auto selection:bg-[#00D4FF]/30"><code>{part.trim()}</code></pre>
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#00D4FF]/30 pointer-events-none" />
          </div>
        );
      }
      
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const textParts = part.split(urlRegex);
      return (
        <p key={i} className="whitespace-pre-wrap leading-relaxed">
          {textParts.map((t, index) => 
            urlRegex.test(t) ? (
              <a key={index} href={t} target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] underline decoration-dotted hover:text-white transition-colors">
                {t}
              </a>
            ) : t
          )}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full hud-glass rounded-sm overflow-hidden border-t-2 border-t-[#00D4FF]/50">
      <div className="p-3 border-b border-[#00D4FF]/20 flex justify-between items-center bg-black/40">
        <span className="text-xs font-black tracking-[0.3em] text-[#00D4FF]">MAINFRAME TACTICAL TERMINAL</span>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/50"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/20"></div>
        </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-sm text-sm relative ${
              m.role === 'user' 
                ? 'bg-[#00D4FF]/10 border-r-2 border-[#00D4FF] shadow-[inset_-5px_0_15px_rgba(0,212,255,0.05)]' 
                : 'bg-white/5 border-l-2 border-white/20'
            }`}>
              <div className="text-[9px] mb-2 opacity-50 uppercase tracking-[0.2em] font-black flex justify-between gap-4">
                <span>{m.role === 'jarvis' ? 'J.A.R.V.I.S. INTEL' : 'STARK-ACCESS'}</span>
                <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>

              {m.image && (
                <div className="mb-3 border border-[#00D4FF]/30 p-1 bg-black/50 group relative">
                  <img src={m.image} alt="Uplink Data" className="max-h-64 rounded-sm object-contain" />
                  <div className="absolute inset-0 bg-[#00D4FF]/5 pointer-events-none group-hover:bg-transparent transition-colors"></div>
                  <div className="text-[8px] mt-1 text-[#00D4FF]/50 uppercase mono flex justify-between">
                    <span>Optical Scan Payload</span>
                    <span>1080P // RGB-FILTER</span>
                  </div>
                </div>
              )}

              <div className="text-[#E0F2F1] font-medium selection:bg-[#00D4FF]/30">{renderContent(m.content)}</div>

              {m.links && m.links.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#00D4FF]/10">
                  <div className="text-[9px] font-bold text-[#00D4FF]/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i className="fas fa-satellite"></i> Global Intel Sources
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.links.map((link, idx) => (
                      <a 
                        key={idx} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] bg-[#00D4FF]/5 border border-[#00D4FF]/30 px-2 py-1 rounded-sm hover:bg-[#00D4FF]/20 hover:border-[#00D4FF] transition-all flex items-center gap-1 group"
                      >
                        <span className="truncate max-w-[150px]">{link.title}</span>
                        <i className="fas fa-external-link-alt text-[8px] opacity-50 group-hover:opacity-100"></i>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-xs text-[#00D4FF] opacity-80 animate-pulse mono tracking-widest">
            <i className="fas fa-spinner fa-spin"></i>
            DECRYPTING SATELLITE UPLINK...
          </div>
        )}
      </div>

      <div className="p-4 bg-black/50 border-t border-[#00D4FF]/20 relative">
        <div className="flex gap-2 items-center">
          <label className="cursor-pointer group relative">
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*" 
              onChange={onFileUpload} 
              className="hidden" 
            />
            <div className="w-10 h-10 border border-[#00D4FF]/30 flex items-center justify-center rounded-sm hover:border-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all shadow-[0_0_10px_rgba(0,212,255,0.1)]">
              <i className="fas fa-camera text-[#00D4FF]/60 group-hover:text-[#00D4FF]"></i>
            </div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#00D4FF] text-black text-[8px] font-bold px-1 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              OPTICAL DATA UPLINK
            </div>
          </label>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder={`AWAITING INPUT FROM SIR REZWAN...`}
              className="w-full bg-black/40 border border-[#00D4FF]/30 p-3 rounded-sm text-sm focus:outline-none focus:border-[#00D4FF] transition-all placeholder:text-[#00D4FF]/20 tracking-wider mono text-[#00D4FF] shadow-[inset_0_0_10px_rgba(0,212,255,0.05)]"
            />
          </div>
          <button 
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="bg-[#00D4FF]/10 hover:bg-[#00D4FF]/30 border border-[#00D4FF]/50 px-6 py-3 rounded-sm text-xs font-black tracking-widest transition-all disabled:opacity-20 uppercase text-[#00D4FF] hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
          >
            Execute
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

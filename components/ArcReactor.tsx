
import React from 'react';

const ArcReactor: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <div className={`relative flex items-center justify-center w-48 h-48 transition-all duration-700 ${active ? 'scale-110' : 'scale-100 opacity-60'}`}>
      {/* Outer Ring */}
      <div className={`absolute w-full h-full rounded-full border-4 border-[#00D4FF] opacity-20 ${active ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
      
      {/* Inner Rotating Segments */}
      <div className={`absolute w-40 h-40 border-[8px] border-dashed border-[#00D4FF] rounded-full opacity-40 ${active ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
      
      {/* Core Glow */}
      <div className={`absolute w-20 h-20 rounded-full bg-[#00D4FF] shadow-[0_0_50px_#00D4FF] flex items-center justify-center transition-all duration-300 ${active ? 'opacity-90' : 'opacity-30'}`}>
        <div className="w-12 h-12 rounded-full border-2 border-white/30" />
      </div>

      {/* Tri-segments */}
      {[0, 120, 240].map((deg) => (
        <div
          key={deg}
          className={`absolute w-2 h-12 bg-[#00D4FF] rounded-full opacity-60 transition-all`}
          style={{ 
            transform: `rotate(${deg}deg) translateY(-80px)`,
            height: active ? '16px' : '12px',
            backgroundColor: active ? '#FFF' : '#00D4FF'
          }}
        />
      ))}
      
      {/* Dynamic Scan Line */}
      {active && <div className="absolute w-full h-[1px] bg-white/20 animate-pulse" />}
      
      {/* Listening Pulse Overlay */}
      {active && (
        <div className="absolute w-full h-full rounded-full border border-[#00D4FF] animate-ping opacity-10" />
      )}
    </div>
  );
};

export default ArcReactor;

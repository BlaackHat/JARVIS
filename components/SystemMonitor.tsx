
import React, { useEffect, useState } from 'react';
import { SystemMetric } from '../types';

const MetricBar: React.FC<SystemMetric> = ({ label, value, max, unit }) => {
  const percentage = (value / max) * 100;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1 uppercase tracking-widest opacity-70">
        <span>{label}</span>
        <span>{value.toFixed(1)}{unit}</span>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#00D4FF] transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, boxShadow: '0 0 10px #00D4FF' }}
        />
      </div>
    </div>
  );
};

const SystemMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { label: 'Core Integrity', value: 98.4, max: 100, unit: '%' },
    { label: 'Energy Output', value: 4500, max: 10000, unit: ' kW' },
    { label: 'Neural Throughput', value: 12.5, max: 20, unit: ' GB/s' },
    { label: 'Thermal Shield', value: 42, max: 100, unit: '°C' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(m => ({
        ...m,
        value: Math.max(0, Math.min(m.max, m.value + (Math.random() - 0.5) * (m.max * 0.05)))
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hud-glass p-6 w-72 rounded-sm border-l-4 border-l-[#00D4FF]">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
        <i className="fas fa-microchip text-[#00D4FF]"></i>
        SYSTEM STATUS
      </h3>
      {metrics.map(m => <MetricBar key={m.label} {...m} />)}
      
      <div className="mt-6 pt-4 border-t border-white/10 text-[10px] mono opacity-40">
        <p>ENCRYPTION: AES-256-GCM</p>
        <p>PROTOCOL: STARK-OS V2.4</p>
        <p>STATUS: OPERATIONAL</p>
      </div>
    </div>
  );
};

export default SystemMonitor;

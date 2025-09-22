import React from 'react';
import { NodeType } from '../types';

const iconSvgs: Record<NodeType, string> = {
    [NodeType.GENERATOR]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="m16.24 16.24 2.83 2.83"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="m16.24 7.76 2.83-2.83"></path></svg>`,
    [NodeType.TRANSFORMER]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="4"></circle><circle cx="18" cy="12" r="4"></circle><line x1="6" y1="12" x2="18" y2="12"></line></svg>`,
    [NodeType.BUS]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="10" width="20" height="4" rx="1"></rect></svg>`,
    [NodeType.LOAD]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V18"></path><path d="M12 18H6L12 2L18 18H12Z"></path></svg>`,
    [NodeType.BREAKER]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"></rect><path d="M5 12H2"></path><path d="M19 12h3"></path></svg>`,
    [NodeType.UNKNOWN]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
};

interface PaletteItemProps {
  type: NodeType;
  label: string;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ type, label }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="flex flex-col items-center p-2 bg-slate-800 rounded-lg border border-slate-700 cursor-grab active:cursor-grabbing hover:bg-slate-700 hover:border-sky-500 transition-colors"
        >
            <div className="w-8 h-8 text-slate-300" dangerouslySetInnerHTML={{ __html: iconSvgs[type] }} />
            <span className="text-xs text-slate-400 mt-2">{label}</span>
        </div>
    );
};

const ComponentPalette: React.FC = () => {
  const componentTypes = [
    { type: NodeType.GENERATOR, label: 'Generator' },
    { type: NodeType.TRANSFORMER, label: 'Transformer' },
    { type: NodeType.BUS, label: 'Bus' },
    { type: NodeType.LOAD, label: 'Load' },
    { type: NodeType.BREAKER, label: 'Breaker' },
  ];

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 text-center">Component Palette</h3>
      <div className="grid grid-cols-2 gap-3">
        {componentTypes.map(({ type, label }) => (
          <PaletteItem key={type} type={type} label={label} />
        ))}
      </div>
    </div>
  );
};

export default ComponentPalette;

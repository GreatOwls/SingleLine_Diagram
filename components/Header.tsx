import React, { useRef } from 'react';

interface HeaderProps {
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Header: React.FC<HeaderProps> = ({ onSave, onLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="relative text-center p-6 border-b border-slate-700/50">
      <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
        Interactive Single-Line Diagram Builder
      </h1>
      <p className="text-slate-400 mt-2">
        Visually construct and manage your electrical systems with ease.
      </p>
      <div className="absolute top-4 right-4 flex gap-3">
        <button 
          onClick={onSave}
          className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-md transition-colors text-sm"
        >
          Save Diagram
        </button>
        <button 
          onClick={handleLoadClick}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
        >
          Load Diagram
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onLoad} 
          className="hidden" 
          accept=".json" 
        />
      </div>
    </header>
  );
};

export default Header;
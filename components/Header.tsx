import React, { useRef } from 'react';

interface HeaderProps {
  onSave: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportJPG: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  appMode: 'view' | 'edit';
  onEnterEditMode: () => void;
  onExitEditMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSave, onLoad, onExportJPG, onUndo, onRedo, canUndo, canRedo, appMode, onEnterEditMode, onExitEditMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <header className="relative text-center p-6 border-b border-white/10">
      <div className="absolute top-1/2 -translate-y-1/2 left-6 flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo || appMode === 'view'}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:enabled:bg-white/10 text-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 9l-3 3m0 0l3 3m-3-3h8a5 5 0 005-5V7" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo || appMode === 'view'}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:enabled:bg-white/10 text-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H8a5 5 0 00-5 5v2" />
          </svg>
        </button>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 tracking-tight">
        Single-Line Diagram Builder
      </h1>
      <p className="text-gray-400 mt-2 text-base">
        Facility Dept. Seagate Teparuk
      </p>
      <div className="absolute top-1/2 -translate-y-1/2 right-6 flex gap-3">
        {appMode === 'view' ? (
            <button 
              onClick={onEnterEditMode}
              className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow-md shadow-green-600/20"
            >
              Enter Edit Mode
            </button>
        ) : (
            <button 
              onClick={onExitEditMode}
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow-md shadow-yellow-500/20"
            >
              Exit Edit Mode
            </button>
        )}
        <button 
          onClick={onExportJPG}
          className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow"
        >
          Export JPG
        </button>
        <button 
          onClick={onSave}
          disabled={appMode === 'view'}
          className="bg-white/5 border border-white/10 hover:enabled:bg-white/10 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button 
          onClick={handleLoadClick}
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow-md shadow-sky-600/20"
        >
          Load
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

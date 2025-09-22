import React, { useState, useEffect } from 'react';
import type { ComponentTypeDefinition } from '../types';

interface PaletteItemProps {
  component: ComponentTypeDefinition;
  onEdit: () => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ component, onEdit }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: component.type }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="group relative flex flex-col items-center p-2 bg-gray-700/50 rounded-xl border border-transparent cursor-grab active:cursor-grabbing hover:bg-gray-700/80 hover:border-sky-500 transition-all transform hover:scale-105"
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-gray-900/50 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-sky-600 hover:text-white transition-all z-10"
                aria-label={`Edit ${component.label}`}
                title={`Edit ${component.label}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
            </button>
            <div className="w-8 h-8 text-gray-300" dangerouslySetInnerHTML={{ __html: component.iconSvg }} />
            <span className="text-xs text-gray-400 mt-2 text-center">{component.label}</span>
        </div>
    );
};

interface AddComponentModalProps {
    onAddComponent: (component: ComponentTypeDefinition) => void;
    onEditComponent: (component: ComponentTypeDefinition) => void;
    componentToEdit: ComponentTypeDefinition | null;
    onClose: () => void;
}

const AddComponentModal: React.FC<AddComponentModalProps> = ({ onAddComponent, onEditComponent, componentToEdit, onClose }) => {
    const [type, setType] = useState('');
    const [label, setLabel] = useState('');
    const [iconSvg, setIconSvg] = useState('<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>');
    const [error, setError] = useState('');
    
    const isEditMode = componentToEdit !== null;

    useEffect(() => {
        if (isEditMode) {
            setType(componentToEdit.type);
            setLabel(componentToEdit.label);
            setIconSvg(componentToEdit.iconSvg);
        }
    }, [componentToEdit, isEditMode]);

    const inputClasses = "w-full bg-gray-900/70 border border-white/10 rounded-lg p-2.5 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 focus:outline-none transition-all disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!type.trim() || !label.trim() || !iconSvg.trim()) {
            setError('All fields are required.');
            return;
        }
        if (!iconSvg.trim().startsWith('<svg') || !iconSvg.trim().endsWith('</svg>')) {
            setError('Icon must be a valid SVG element string, starting with <svg> and ending with </svg>.');
            return;
        }
        
        const componentData = { 
            type: isEditMode ? type : type.toUpperCase().trim().replace(/\s+/g, '_'), 
            label: label.trim(), 
            iconSvg: iconSvg.trim() 
        };
        
        if (isEditMode) {
            onEditComponent(componentData);
        } else {
            onAddComponent(componentData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">{isEditMode ? 'Edit Custom Component' : 'Add Custom Component'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-lg text-sm mb-4 border border-red-500/30">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="comp-type" className="block text-sm font-medium text-gray-400 mb-1.5">Component Type (ID)</label>
                        <input id="comp-type" type="text" value={type} onChange={e => setType(e.target.value)} placeholder="E.g., FUSE (no spaces, all caps)" disabled={isEditMode} className={inputClasses} />
                        {isEditMode && <p className="text-xs text-gray-500 mt-1.5">Component Type cannot be changed after creation.</p>}
                    </div>
                    <div>
                        <label htmlFor="comp-label" className="block text-sm font-medium text-gray-400 mb-1.5">Display Label</label>
                        <input id="comp-label" type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="E.g., Fuse" className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="comp-svg" className="block text-sm font-medium text-gray-400 mb-1.5">Icon SVG Code</label>
                        <textarea id="comp-svg" value={iconSvg} onChange={e => setIconSvg(e.target.value)} rows={5} className={`${inputClasses} font-mono text-xs`}></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all text-sm">Cancel</button>
                        <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg transition-all text-sm shadow-md shadow-sky-600/20">{isEditMode ? 'Save Changes' : 'Add Component'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface ComponentPaletteProps {
    onHide: () => void;
    componentTypes: ComponentTypeDefinition[];
    onAddComponentType: (component: ComponentTypeDefinition) => void;
    onEditComponentType: (component: ComponentTypeDefinition) => void;
}

const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onHide, componentTypes, onAddComponentType, onEditComponentType }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentTypeDefinition | null>(null);

  const handleEdit = (component: ComponentTypeDefinition) => {
    setEditingComponent(component);
    setIsModalOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingComponent(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingComponent(null);
  };

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-4 shadow-lg flex-shrink-0 w-48 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 tracking-wider">PALETTE</h3>
          <button 
              onClick={onHide}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Hide Component Palette"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-grow">
          {componentTypes.map((component) => (
            <PaletteItem key={component.type} component={component} onEdit={() => handleEdit(component)} />
          ))}
        </div>
        <button 
          onClick={handleAddNew}
          className="w-full mt-4 text-center bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-sky-500/30"
        >
          + Add New
        </button>
      </div>
      {isModalOpen && (
        <AddComponentModal 
            onAddComponent={onAddComponentType} 
            onEditComponent={onEditComponentType}
            componentToEdit={editingComponent}
            onClose={handleCloseModal} 
        />
      )}
    </>
  );
};

export default ComponentPalette;

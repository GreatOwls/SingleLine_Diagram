import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { DiagramData, Node, Link, Group, ComponentTypeDefinition } from './types';
import { NodeType } from './types';
import Header from './components/Header';
import ManualInputPanel from './components/ManualInputPanel';
import Diagram, { type DiagramHandle } from './components/Diagram';
import ComponentPalette from './components/ComponentPalette';
import PasswordModal from './components/PasswordModal';

const initialComponentTypes: ComponentTypeDefinition[] = [
  { type: NodeType.GENERATOR, label: 'Generator', iconSvg: `<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 width="25px" height="25px" viewBox="0 0 554.625 554.625" style="enable-background:new 0 0 554.625 554.625;"
	 xml:space="preserve">
<g>
	<polygon points="293.772,554.625 280.222,258.188 265.486,258.188 253.925,554.625 	" fill="currentColor"/>
	<path fill="currentColor" d="M282.383,172.125c7.114,0,12.89-7.564,12.89-14.678L282.67,15.577C282.67,8.463,282.623,0,275.508,0h-1.722
		c-7.114,0-7.736,8.463-7.736,15.577l-12.029,141.87c0,7.114,5.766,14.678,12.891,14.678H282.383z"/>
	<path fill="currentColor" d="M434.924,322.008c5.995,3.834,13.148,8.348,16.982,2.353l0.928-1.444c3.835-5.996-2.964-11.073-8.97-14.898
		l-113.096-86.493c-5.995-3.834-15.481-3.041-19.307,2.964l-8.319,13.034c-3.834,5.996-0.564,14.927,5.441,18.762L434.924,322.008z"
		/>
	<path fill="currentColor" d="M119.697,322.008l126.349-65.742c5.996-3.835,9.267-12.766,5.432-18.762l-8.319-13.034
		c-3.834-5.996-13.311-6.79-19.306-2.964l-113.096,86.502c-5.996,3.835-12.795,8.903-8.97,14.898l0.928,1.444
		C106.548,330.355,113.701,325.842,119.697,322.008z"/>
	<circle fill="currentColor" cx="273.853" cy="212.766" r="19.823"/>
</g>
</svg>
` },
  { type: NodeType.TRANSFORMER, label: 'Transformer', iconSvg: `<?xml version='1.0' encoding='iso-8859-1'?>
<!-- License: CC0. Made by SVG Repo: https://www.svgrepo.com/svg/108054/transformer -->
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 232" xmlns:xlink="http://www.w3.org/1999/xlink" enable-background="new 0 0 232 232">
  <g>
    <path fill="currentColor" d="m83.329,140.575c0-9.533-3.671-18.651-9.979-25.536 6.307-6.885 9.977-16.002 9.977-25.535 0-9.527-3.67-18.639-9.977-25.522 6.348-6.906 9.96-16.129 9.96-25.547 0-9.986-4.032-19.747-11.068-26.786-7.098-7.086-16.829-11.149-26.701-11.149h-45.541v16h45.541c5.665,0 11.271,2.359 15.386,6.467 3.994,3.994 6.371,9.777 6.371,15.468 0,5.726-2.325,11.321-6.356,15.351-1.264,1.262-2.717,2.368-4.273,3.289l-.069,13.758c6.656,3.964 10.365,10.943 10.365,18.671 0,7.61-3.964,14.763-10.964,18.666v13.738c7,3.904 10.966,11.057 10.966,18.667 0,7.901-4.019,15.188-10.939,19.017l.055,14.008c1.789,0.985 3.441,2.209 4.87,3.641 4.04,4.037 6.367,9.644 6.367,15.381 0,5.754-2.312,11.371-6.346,15.406-4.121,4.113-9.714,6.473-15.355,6.473h-45.619v16h45.618c9.848,0 19.565-4.064 26.669-11.153 7.018-7.019 11.043-16.76 11.043-26.726 0-9.644-3.781-19.081-10.401-26.038 6.577-6.916 10.4-16.189 10.4-26.009z"/>
    <path fill="currentColor" d="m187.125,16.5h44.875v-16h-44.875c-9.872,0-19.604,4.063-26.708,11.154-7.029,7.033-11.062,16.794-11.062,26.78 0,9.417 3.612,18.64 9.96,25.547-6.307,6.883-9.976,15.995-9.976,25.522 0,9.533 3.67,18.65 9.976,25.535-6.308,6.885-9.979,16.003-9.979,25.536 0,9.82 3.823,19.093 10.4,26.008-6.621,6.96-10.401,16.397-10.401,26.038 0,9.966 4.025,19.707 11.048,26.73 7.099,7.085 16.816,11.148 26.664,11.148h44.953v-16h-44.952c-5.641,0-11.233-2.359-15.349-6.468-4.04-4.04-6.351-9.657-6.351-15.411 0-5.737 2.328-11.344 6.372-15.385 1.426-1.428 3.081-2.651 4.87-3.637l.063-14.008c-6.92-3.829-11.288-11.115-11.288-19.017 0-7.61 3.633-14.763 10.633-18.667v-13.735c-7-3.903-10.631-11.056-10.631-18.666 0-7.728 3.861-14.707 10.516-18.671l.023-13.758c-1.557-0.921-2.964-2.027-4.225-3.287-4.034-4.032-6.337-9.628-6.337-15.354 0-5.691 2.389-11.474 6.376-15.462 4.122-4.113 9.74-6.472 15.405-6.472z"/>
    <rect fill="currentColor" width="16" x="108" y="0.5" height="231"/>
  </g>
</svg>
` },
  { type: NodeType.BUS, label: 'Bus', iconSvg: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="10" width="20" height="4" rx="1"></rect></svg>` },
  { type: NodeType.LOAD, label: 'Load', iconSvg: `<svg fill="currentColor" width="25px" height="25px" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" id="memory-alpha-l"><path d="M15 1V2H17V3H18V4H19V5H20V7H21V15H20V17H19V18H18V19H17V20H15V21H7V20H5V19H4V18H3V17H2V15H1V7H2V5H3V4H4V3H5V2H7V1H15M14 3H8V4H6V5H5V6H4V8H3V14H4V16H5V17H6V18H8V19H14V18H16V17H17V16H18V14H19V8H18V6H17V5H16V4H14V3M8 6H10V14H14V16H8V6Z" /></svg>` },
  { type: NodeType.BREAKER, label: 'Breaker', iconSvg: `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="228" cy="112" r="44" fill="currentColor"/>
  <circle cx="228" cy="382" r="44" fill="currentColor"/>
  <path id="arc" fill="currentColor" style="fill:none;stroke:#ffffff;stroke-width:20;stroke-linecap:round;" d="M282,128c70 66,70 174,0 240"/>
</svg>` },
];


const initialData: DiagramData = {
  nodes: [
    { id: 'G1', type: NodeType.GENERATOR, label: 'Generator 1' },
    { id: 'B1', type: NodeType.BREAKER, label: 'Main Breaker', properties: { size: '2000A' } },
    { id: 'T1', type: NodeType.TRANSFORMER, label: 'Transformer 1' },
    { id: 'BusA', type: NodeType.BUS, label: 'Main Bus' },
    { id: 'L1', type: NodeType.LOAD, label: 'Load 1', properties: { size: '500kW' } },
    { id: 'L2', type: NodeType.LOAD, label: 'Load 2', properties: { size: '750kW' } },
  ],
  links: [
    { source: 'G1', target: 'B1', properties: { diameter: '500 sq. mm.' } },
    { source: 'B1', target: 'T1', properties: { diameter: '500 sq. mm.' } },
    { source: 'T1', target: 'BusA', properties: { diameter: '240 sq. mm.' } },
    { source: 'BusA', target: 'L1', properties: { diameter: '70 sq. mm.' } },
    { source: 'BusA', target: 'L2', properties: { diameter: '95 sq. mm.' } },
  ],
  groups: [
    { id: 'group1', label: 'Generation Area', nodeIds: ['G1', 'B1'] },
    { id: 'group2', label: 'Distribution', nodeIds: ['BusA', 'L1', 'L2'] },
  ]
};

// --- History Management ---
interface AppState {
  diagramData: DiagramData;
  componentTypes: ComponentTypeDefinition[];
}

interface History {
  past: AppState[];
  present: AppState;
  future: AppState[];
}

const App: React.FC = () => {
  const [history, setHistory] = useState<History>({
    past: [],
    present: {
      diagramData: initialData,
      componentTypes: initialComponentTypes,
    },
    future: [],
  });
  
  const { diagramData, componentTypes } = history.present;
  
  const [appMode, setAppMode] = useState<'view' | 'edit'>('view');
  const [pendingLink, setPendingLink] = useState<{ source: string | null; target: string | null }>({ source: null, target: null });
  const [viewMode, setViewMode] = useState<'free' | 'fixed'>('fixed');
  const [isPaletteVisible, setIsPaletteVisible] = useState(true);

  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [tracedNodeId, setTracedNodeId] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const diagramRef = useRef<DiagramHandle>(null);

  const handleEnterEditMode = useCallback(() => {
    setIsPasswordModalOpen(true);
  }, []);

  const handleExitEditMode = useCallback(() => {
    setAppMode('view');
  }, []);

  const handlePasswordSuccess = useCallback(() => {
    setAppMode('edit');
    setIsPasswordModalOpen(false);
  }, []);

  const recordChange = useCallback((updater: (prevState: AppState) => AppState) => {
    setHistory(currentHistory => {
      const newPresent = updater(currentHistory.present);
      // Avoid adding duplicate states if nothing changed
      if (newPresent === currentHistory.present) {
        return currentHistory;
      }
      const newPast = [...currentHistory.past, currentHistory.present];
      return {
        past: newPast,
        present: newPresent,
        future: [], // Clear future on a new action
      };
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(currentHistory => {
      const { past, present, future } = currentHistory;
      if (past.length === 0) return currentHistory;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);
  
  const handleRedo = useCallback(() => {
    setHistory(currentHistory => {
      const { past, present, future } = currentHistory;
      if (future.length === 0) return currentHistory;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);


  const removeNode = useCallback((nodeId: string) => {
    recordChange(prev => {
        const newGroups = prev.diagramData.groups?.map(g => ({
            ...g,
            nodeIds: g.nodeIds.filter(id => id !== nodeId),
        })).filter(g => g.nodeIds.length > 0) || [];

        return {
            ...prev,
            diagramData: {
              ...prev.diagramData,
              nodes: prev.diagramData.nodes.filter(n => n.id !== nodeId),
              links: prev.diagramData.links.filter(l => l.source !== nodeId && l.target !== nodeId),
              groups: newGroups,
            }
        };
    });
  }, [recordChange]);

  const addLink = useCallback((link: Link) => {
    recordChange(prev => ({
      ...prev,
      diagramData: {
        ...prev.diagramData,
        links: [...prev.diagramData.links, link],
      }
    }));
  }, [recordChange]);

  const removeLink = useCallback((sourceId: string, targetId: string) => {
    recordChange(prev => ({
      ...prev,
      diagramData: {
        ...prev.diagramData,
        links: prev.diagramData.links.filter(l => !(l.source === sourceId && l.target === targetId)),
      }
    }));
  }, [recordChange]);

  const handleDropNode = useCallback((type: string, x: number, y: number) => {
    recordChange(prev => {
      const baseId = type.substring(0, 2).toUpperCase();
      let count = 1;
      let newId = `${baseId}${count}`;
      while (prev.diagramData.nodes.some(n => n.id === newId)) {
        count++;
        newId = `${baseId}${count}`;
      }
      
      const componentDef = prev.componentTypes.find(c => c.type === type);
      const newLabel = `${componentDef ? componentDef.label : type} ${count}`;

      const newNode: Node = {
        id: newId,
        label: newLabel,
        type: type,
        x,
        y,
        fx: x,
        fy: y,
      };

      return {
        ...prev,
        diagramData: {
          ...prev.diagramData,
          nodes: [...prev.diagramData.nodes, newNode],
        }
      };
    });
  }, [recordChange]);
  
  const handleAddNodeAndLink = useCallback((sourceNodeId: string, newNodeData: {
    type: string;
    label: string;
    properties?: { size?: string };
    linkProperties?: { diameter?: string };
  }) => {
    recordChange(prev => {
        const sourceNode = prev.diagramData.nodes.find(n => n.id === sourceNodeId);

        const baseId = newNodeData.type.substring(0, 2).toUpperCase();
        let count = 1;
        let newId = `${baseId}${count}`;
        while (prev.diagramData.nodes.some(n => n.id === newId)) {
            count++;
            newId = `${baseId}${count}`;
        }
        
        const newNodeX = sourceNode?.x ? sourceNode.x + 150 : 0;
        const newNodeY = sourceNode?.y ? sourceNode.y : 0;

        const newNode: Node = {
            id: newId,
            label: newNodeData.label,
            type: newNodeData.type,
            properties: newNodeData.properties,
            x: newNodeX,
            y: newNodeY,
        };

        const newLink: Link = {
            source: sourceNodeId,
            target: newId,
            properties: newNodeData.linkProperties,
        };

        return {
            ...prev,
            diagramData: {
              ...prev.diagramData,
              nodes: [...prev.diagramData.nodes, newNode],
              links: [...prev.diagramData.links, newLink],
            }
        };
    });
  }, [recordChange]);

  const handleAddComponentType = useCallback((newComponent: ComponentTypeDefinition) => {
    if (componentTypes.some(c => c.type.toUpperCase() === newComponent.type.toUpperCase())) {
      alert(`A component with type '${newComponent.type}' already exists.`);
      return;
    }
    recordChange(prev => ({
      ...prev,
      componentTypes: [...prev.componentTypes, newComponent],
    }));
  }, [recordChange, componentTypes]);

  const handleEditComponentType = useCallback((editedComponent: ComponentTypeDefinition) => {
    recordChange(prev => ({
      ...prev,
      componentTypes: prev.componentTypes.map(c => (c.type === editedComponent.type ? editedComponent : c)),
    }));
  }, [recordChange]);

  const handleAddGroup = useCallback((group: Group) => {
      recordChange(prev => ({
        ...prev,
        diagramData: {
          ...prev.diagramData,
          groups: [...(prev.diagramData.groups || []), group],
        }
      }));
  }, [recordChange]);

  const handleRemoveGroup = useCallback((groupId: string) => {
      recordChange(prev => ({
        ...prev,
        diagramData: {
          ...prev.diagramData,
          groups: prev.diagramData.groups?.filter(g => g.id !== groupId) || [],
        }
      }));
  }, [recordChange]);
  
  const handleUpdateGroup = useCallback((groupId: string, nodeIds: string[]) => {
      recordChange(prev => ({
        ...prev,
        diagramData: {
          ...prev.diagramData,
          groups: prev.diagramData.groups?.map(g => g.id === groupId ? { ...g, nodeIds } : g) || [],
        }
      }));
  }, [recordChange]);

  const handleFocusGroup = useCallback((groupId: string) => {
    setTracedNodeId(null);
    setFocusedGroupId(groupId);
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedGroupId(null);
  }, []);

  const handleTraceUpstream = useCallback((nodeId: string) => {
    setFocusedGroupId(null);
    setTracedNodeId(nodeId);
  }, []);

  const handleClearTrace = useCallback(() => {
    setTracedNodeId(null);
  }, []);
  
  const handleSaveDiagram = useCallback(() => {
    const jsonString = JSON.stringify(history.present, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [history.present]);

  const handleLoadDiagram = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const loadedState: AppState = JSON.parse(text);
        
        // Basic validation
        if (loadedState && loadedState.diagramData && Array.isArray(loadedState.diagramData.nodes) && Array.isArray(loadedState.diagramData.links) && Array.isArray(loadedState.componentTypes)) {
          setHistory({
            past: [],
            present: loadedState,
            future: [],
          });
        } else {
          // Fallback for old format
          const oldFormatData = JSON.parse(text);
          if (oldFormatData && Array.isArray(oldFormatData.nodes)) {
             setHistory({
                past: [],
                present: { diagramData: oldFormatData, componentTypes: initialComponentTypes },
                future: [],
             });
          } else {
            alert('Error: Invalid diagram file format.');
          }
        }
      } catch (error) {
        console.error("Failed to load diagram:", error);
        alert('Error: Could not parse the diagram file. Make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const handleExportJPG = useCallback(() => {
    diagramRef.current?.exportToJPG();
  }, []);


  const displayedData = useMemo<DiagramData>(() => {
    // Upstream Trace View has the highest priority
    if (tracedNodeId) {
        const pathNodeIds = new Set<string>();
        const pathLinks = new Set<Link>();
        
        const linkMap = new Map<string, string[]>();
        diagramData.links.forEach(link => {
            const source = link.source as string;
            const target = link.target as string;
            if (!linkMap.has(target)) {
                linkMap.set(target, []);
            }
            linkMap.get(target)!.push(source);
        });

        const q: string[] = [tracedNodeId];
        const visited = new Set<string>([tracedNodeId]);
        pathNodeIds.add(tracedNodeId);

        while (q.length > 0) {
            const currentNodeId = q.shift()!;
            const parentIds = linkMap.get(currentNodeId) || [];
            
            for (const parentId of parentIds) {
                if (!visited.has(parentId)) {
                    visited.add(parentId);
                    pathNodeIds.add(parentId);
                    q.push(parentId);

                    const originalLink = diagramData.links.find(l => (l.source as string) === parentId && (l.target as string) === currentNodeId);
                    if (originalLink) {
                        pathLinks.add(originalLink);
                    }
                }
            }
        }
        
        const pathNodes = diagramData.nodes.filter(n => pathNodeIds.has(n.id));

        return {
            nodes: pathNodes,
            links: Array.from(pathLinks),
            groups: [] // Don't show groups in trace view
        };
    }
    
    // Group Focus View is next
    if (focusedGroupId) {
      const focusedGroup = diagramData.groups?.find(g => g.id === focusedGroupId);
      if (!focusedGroup) {
          return { nodes: [], links: [], groups: [] };
      }

      const nodeIdsInGroup = new Set(focusedGroup.nodeIds);
      
      const internalNodes = diagramData.nodes.filter(n => nodeIdsInGroup.has(n.id));
      const internalLinks = diagramData.links.filter(l => 
          nodeIdsInGroup.has(l.source as string) && nodeIdsInGroup.has(l.target as string)
      );
      
      const externalNodesMap = new Map<string, Node>();
      const boundaryLinks: Link[] = [];

      diagramData.links.forEach(link => {
          const sourceInGroup = nodeIdsInGroup.has(link.source as string);
          const targetInGroup = nodeIdsInGroup.has(link.target as string);

          if (sourceInGroup !== targetInGroup) {
              const externalNodeId = sourceInGroup ? (link.target as string) : (link.source as string);
              const externalNode = diagramData.nodes.find(n => n.id === externalNodeId);
              
              if (externalNode && !externalNodesMap.has(externalNode.id)) {
                  externalNodesMap.set(externalNode.id, {
                      ...externalNode,
                      isExternal: true,
                  });
              }
              boundaryLinks.push({ ...link, isBoundary: true });
          }
      });

      const externalNodes = Array.from(externalNodesMap.values());
      
      return { 
          nodes: [...internalNodes, ...externalNodes], 
          links: [...internalLinks, ...boundaryLinks], 
          groups: [focusedGroup]
      };
    }
    
    // Default view
    return diagramData;
  }, [diagramData, focusedGroupId, tracedNodeId]);

  const isEditingDisabled = appMode === 'view' || !!focusedGroupId || !!tracedNodeId;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
      <Header 
        onSave={handleSaveDiagram} 
        onLoad={handleLoadDiagram} 
        onExportJPG={handleExportJPG}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        appMode={appMode}
        onEnterEditMode={handleEnterEditMode}
        onExitEditMode={handleExitEditMode}
      />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-row gap-6 max-w-screen-2xl">
        {isPaletteVisible ? (
            <ComponentPalette 
              onHide={() => setIsPaletteVisible(false)}
              componentTypes={componentTypes}
              onAddComponentType={handleAddComponentType}
              onEditComponentType={handleEditComponentType}
              appMode={appMode}
            />
          ) : (
            <button
              onClick={() => setIsPaletteVisible(true)}
              className="absolute top-1/2 -translate-y-1/2 left-4 md:left-6 z-20 bg-gray-800/80 backdrop-blur-sm border border-white/10 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-full shadow-lg transition-all"
              aria-label="Show Component Palette"
              title="Show Component Palette"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
        )}
        <div className="flex-grow flex flex-col bg-gray-900/70 rounded-2xl shadow-inner shadow-black/20 overflow-hidden">
          <div className="flex justify-end items-center p-2 border-b border-white/10">
            <div className="bg-black/20 p-1 rounded-lg flex items-center text-sm" role="radiogroup" aria-label="View Mode">
              <button 
                onClick={() => setViewMode('free')}
                className={`px-3 py-1 rounded-md transition-colors text-sm font-medium ${viewMode === 'free' ? 'bg-sky-600 text-white shadow' : 'text-gray-400 hover:bg-white/10'}`}
                role="radio"
                aria-checked={viewMode === 'free'}
              >
                Free View
              </button>
              <button 
                onClick={() => setViewMode('fixed')}
                className={`px-3 py-1 rounded-md transition-colors text-sm font-medium ${viewMode === 'fixed' ? 'bg-sky-600 text-white shadow' : 'text-gray-400 hover:bg-white/10'}`}
                role="radio"
                aria-checked={viewMode === 'fixed'}
              >
                Fixed View
              </button>
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center p-1 min-h-[500px] lg:min-h-0 relative">
             {tracedNodeId && (
              <div className="absolute top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-yellow-500/30 p-2 z-10 flex items-center justify-between text-sm shadow-lg">
                <p className="text-gray-300 ml-2">
                  Showing upstream path from: <strong className="text-yellow-400 font-semibold">{diagramData.nodes?.find(n => n.id === tracedNodeId)?.label}</strong>
                </p>
                <button 
                  onClick={handleClearTrace} 
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-1 px-3 rounded-md transition-colors"
                >
                  &times; Exit Trace
                </button>
              </div>
            )}
             {focusedGroupId && (
              <div className="absolute top-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-b border-sky-500/30 p-2 z-10 flex items-center justify-between text-sm shadow-lg">
                <p className="text-gray-300 ml-2">
                  Focusing on Group: <strong className="text-sky-400 font-semibold">{diagramData.groups?.find(g => g.id === focusedGroupId)?.label}</strong>
                </p>
                <button 
                  onClick={handleClearFocus} 
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-1 px-3 rounded-md transition-colors"
                >
                  &times; Exit Focus
                </button>
              </div>
            )}
            {displayedData.nodes.length > 0 ? (
              <Diagram 
                ref={diagramRef}
                data={displayedData} 
                pendingLink={pendingLink} 
                viewMode={viewMode} 
                appMode={appMode}
                onDropNode={handleDropNode} 
                onAddNodeAndLink={handleAddNodeAndLink}
                onTraceUpstream={handleTraceUpstream} 
                componentTypes={componentTypes}
              />
            ) : (
              <div className="text-center text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-500">{focusedGroupId ? 'Group is Empty' : 'Diagram is Empty'}</h2>
                <p className="mt-2 max-w-md mx-auto">{focusedGroupId ? 'This group has no components.' : 'Drag a component from the palette to build your diagram.'}</p>
              </div>
            )}
          </div>
        </div>
        <div className="w-full max-w-sm flex-shrink-0">
           <ManualInputPanel 
              data={diagramData}
              onRemoveNode={removeNode}
              onAddLink={addLink}
              onRemoveLink={removeLink}
              setPendingLink={setPendingLink}
              onAddGroup={handleAddGroup}
              onRemoveGroup={handleRemoveGroup}
              onUpdateGroup={handleUpdateGroup}
              onFocusGroup={handleFocusGroup}
              isEditingDisabled={isEditingDisabled}
           />
        </div>
      </main>
      <footer className="text-center p-4 text-gray-600 text-xs">
        <p>Nuttapon N.</p>
      </footer>
      {isPasswordModalOpen && (
        <PasswordModal 
          onClose={() => setIsPasswordModalOpen(false)}
          onSuccess={handlePasswordSuccess}
        />
      )}
    </div>
  );
};

export default App;

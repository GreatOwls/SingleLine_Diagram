import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { DiagramData, Node, Link, Group, ComponentTypeDefinition } from './types';
import { NodeType } from './types';
import Header from './components/Header';
import ManualInputPanel from './components/ManualInputPanel';
import Diagram, { type DiagramHandle } from './components/Diagram';
import ComponentPalette from './components/ComponentPalette';

const initialComponentTypes: ComponentTypeDefinition[] = [
  { type: NodeType.GENERATOR, label: 'Generator', iconSvg: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="m16.24 16.24 2.83 2.83"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="m16.24 7.76 2.83-2.83"></path></svg>` },
  { type: NodeType.TRANSFORMER, label: 'Transformer', iconSvg: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="4"></circle><circle cx="18" cy="12" r="4"></circle><line x1="6" y1="12" x2="18" y2="12"></line></svg>` },
  { type: NodeType.BUS, label: 'Bus', iconSvg: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="10" width="20" height="4" rx="1"></rect></svg>` },
  { type: NodeType.LOAD, label: 'Load', iconSvg: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V18"></path><path d="M12 18H6L12 2L18 18H12Z"></path></svg>` },
  { type: NodeType.BREAKER, label: 'Breaker', iconSvg: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"></rect><path d="M5 12H2"></path><path d="M19 12h3"></path></svg>` },
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
  
  const [pendingLink, setPendingLink] = useState<{ source: string | null; target: string | null }>({ source: null, target: null });
  const [viewMode, setViewMode] = useState<'free' | 'fixed'>('fixed');
  const [isPaletteVisible, setIsPaletteVisible] = useState(true);

  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [tracedNodeId, setTracedNodeId] = useState<string | null>(null);

  const diagramRef = useRef<DiagramHandle>(null);

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
      />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-row gap-6 max-w-screen-2xl">
        {isPaletteVisible ? (
            <ComponentPalette 
              onHide={() => setIsPaletteVisible(false)}
              componentTypes={componentTypes}
              onAddComponentType={handleAddComponentType}
              onEditComponentType={handleEditComponentType}
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
              isEditingDisabled={!!focusedGroupId || !!tracedNodeId}
           />
        </div>
      </main>
      <footer className="text-center p-4 text-gray-600 text-xs">
        <p>Nuttapon N.</p>
      </footer>
    </div>
  );
};

export default App;
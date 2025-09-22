import React, { useState, useCallback, useMemo } from 'react';
import type { DiagramData, Node, Link, Group } from './types';
import { NodeType } from './types';
import Header from './components/Header';
import ManualInputPanel from './components/ManualInputPanel';
import Diagram from './components/Diagram';
import ComponentPalette from './components/ComponentPalette';

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
    { source: 'G1', target: 'B1', properties: { diameter: '1000 MCM' } },
    { source: 'B1', target: 'T1', properties: { diameter: '1000 MCM' } },
    { source: 'T1', target: 'BusA', properties: { diameter: '500 MCM' } },
    { source: 'BusA', target: 'L1', properties: { diameter: '2/0 AWG' } },
    { source: 'BusA', target: 'L2', properties: { diameter: '3/0 AWG' } },
  ],
  groups: [
    { id: 'group1', label: 'Generation Area', nodeIds: ['G1', 'B1'] },
    { id: 'group2', label: 'Distribution', nodeIds: ['BusA', 'L1', 'L2'] },
  ]
};


const App: React.FC = () => {
  const [diagramData, setDiagramData] = useState<DiagramData>(initialData);
  const [pendingLink, setPendingLink] = useState<{ source: string | null; target: string | null }>({ source: null, target: null });
  const [viewMode, setViewMode] = useState<'free' | 'fixed'>('free');
  
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);

  const removeNode = useCallback((nodeId: string) => {
    setDiagramData(prev => {
        const newGroups = prev.groups?.map(g => ({
            ...g,
            nodeIds: g.nodeIds.filter(id => id !== nodeId),
        })).filter(g => g.nodeIds.length > 0) || [];

        return {
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== nodeId),
            links: prev.links.filter(l => l.source !== nodeId && l.target !== nodeId),
            groups: newGroups,
        };
    });
  }, []);

  const addLink = useCallback((link: Link) => {
    setDiagramData(prev => ({
      ...prev,
      links: [...prev.links, link],
    }));
  }, []);

  const removeLink = useCallback((sourceId: string, targetId: string) => {
    setDiagramData(prev => ({
      ...prev,
      links: prev.links.filter(l => !(l.source === sourceId && l.target === targetId)),
    }));
  }, []);

  const handleDropNode = useCallback((type: NodeType, x: number, y: number) => {
    setDiagramData(prev => {
      let count = 1;
      let newId = `${type.charAt(0)}${count}`;
      while(prev.nodes.some(n => n.id === newId)) {
        count++;
        newId = `${type.charAt(0)}${count}`;
      }

      const newLabel = `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} ${count}`;

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
        nodes: [...prev.nodes, newNode],
      };
    });
  }, []);

  const handleAddGroup = useCallback((group: Group) => {
      setDiagramData(prev => ({
          ...prev,
          groups: [...(prev.groups || []), group],
      }));
  }, []);

  const handleRemoveGroup = useCallback((groupId: string) => {
      setDiagramData(prev => ({
          ...prev,
          groups: prev.groups?.filter(g => g.id !== groupId) || [],
      }));
  }, []);
  
  const handleUpdateGroup = useCallback((groupId: string, nodeIds: string[]) => {
      setDiagramData(prev => ({
          ...prev,
          groups: prev.groups?.map(g => g.id === groupId ? { ...g, nodeIds } : g) || [],
      }));
  }, []);

  const handleFocusGroup = useCallback((groupId: string) => {
    setFocusedGroupId(groupId);
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedGroupId(null);
  }, []);
  
  const handleSaveDiagram = useCallback(() => {
    const jsonString = JSON.stringify(diagramData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [diagramData]);

  const handleLoadDiagram = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const loadedData = JSON.parse(text);
        
        // Basic validation
        if (loadedData && Array.isArray(loadedData.nodes) && Array.isArray(loadedData.links)) {
          setDiagramData({
            nodes: loadedData.nodes,
            links: loadedData.links,
            groups: loadedData.groups || [],
          });
        } else {
          alert('Error: Invalid diagram file format.');
        }
      } catch (error) {
        console.error("Failed to load diagram:", error);
        alert('Error: Could not parse the diagram file. Make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset file input to allow loading the same file again
    event.target.value = '';
  }, []);


  const displayedData = useMemo<DiagramData>(() => {
    if (!focusedGroupId) {
        return diagramData;
    }
    const focusedGroup = diagramData.groups?.find(g => g.id === focusedGroupId);
    if (!focusedGroup) {
        return { nodes: [], links: [], groups: [] };
    }

    const nodeIdsInGroup = new Set(focusedGroup.nodeIds);
    
    // 1. Get internal nodes and links
    const internalNodes = diagramData.nodes.filter(n => nodeIdsInGroup.has(n.id));
    const internalLinks = diagramData.links.filter(l => 
        nodeIdsInGroup.has(l.source as string) && nodeIdsInGroup.has(l.target as string)
    );
    
    // 2. Find boundary links and create external "ghost" nodes for context
    const externalNodesMap = new Map<string, Node>();
    const boundaryLinks: Link[] = [];

    diagramData.links.forEach(link => {
        const sourceInGroup = nodeIdsInGroup.has(link.source as string);
        const targetInGroup = nodeIdsInGroup.has(link.target as string);

        // Check if the link crosses the group boundary
        if (sourceInGroup !== targetInGroup) {
            const externalNodeId = sourceInGroup ? (link.target as string) : (link.source as string);
            const externalNode = diagramData.nodes.find(n => n.id === externalNodeId);
            
            if (externalNode && !externalNodesMap.has(externalNode.id)) {
                externalNodesMap.set(externalNode.id, {
                    ...externalNode,
                    isExternal: true, // Mark node as external for special rendering
                });
            }
            boundaryLinks.push({ ...link, isBoundary: true }); // Mark link as boundary
        }
    });

    const externalNodes = Array.from(externalNodesMap.values());
    
    return { 
        nodes: [...internalNodes, ...externalNodes], 
        links: [...internalLinks, ...boundaryLinks], 
        groups: [focusedGroup] // Only show the boundary for the focused group
    };
  }, [diagramData, focusedGroupId]);


  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      <Header onSave={handleSaveDiagram} onLoad={handleLoadDiagram} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-row gap-8">
        <ComponentPalette />
        <div className="flex-grow flex flex-col bg-slate-800/50 rounded-lg border border-slate-700 shadow-2xl shadow-slate-950/50">
          <div className="flex justify-end items-center p-2 border-b border-slate-700">
            <div className="bg-slate-900/50 p-1 rounded-lg flex items-center text-sm" role="radiogroup" aria-label="View Mode">
              <button 
                onClick={() => setViewMode('free')}
                className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'free' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                role="radio"
                aria-checked={viewMode === 'free'}
              >
                Free View
              </button>
              <button 
                onClick={() => setViewMode('fixed')}
                className={`px-3 py-1 rounded-md transition-colors ${viewMode === 'fixed' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                role="radio"
                aria-checked={viewMode === 'fixed'}
              >
                Fixed View
              </button>
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center p-4 min-h-[500px] lg:min-h-0 relative">
             {focusedGroupId && (
              <div className="absolute top-0 left-0 right-0 bg-slate-900/90 border-b border-sky-500/50 p-2 z-10 flex items-center justify-between text-sm animate-fade-in-down">
                <p className="text-slate-300">
                  Focusing on Group: <strong className="text-sky-400">{diagramData.groups?.find(g => g.id === focusedGroupId)?.label}</strong>
                </p>
                <button 
                  onClick={handleClearFocus} 
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1 px-3 rounded-md transition"
                >
                  &times; Exit Focus
                </button>
              </div>
            )}
            {displayedData.nodes.length > 0 ? (
              <Diagram data={displayedData} pendingLink={pendingLink} viewMode={viewMode} onDropNode={handleDropNode} />
            ) : (
              <div className="text-center text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-slate-400">{focusedGroupId ? 'Group is Empty' : 'Diagram is Empty'}</h2>
                <p className="mt-2 max-w-md mx-auto">{focusedGroupId ? 'This group has no components.' : 'Drag a component from the left palette to build your diagram.'}</p>
              </div>
            )}
          </div>
        </div>
        <div className="w-full max-w-sm">
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
              isEditingDisabled={!!focusedGroupId}
           />
        </div>
      </main>
      <footer className="text-center p-4 text-slate-500 text-sm">
        <p>Built with React and D3.js</p>
      </footer>
    </div>
  );
};

export default App;

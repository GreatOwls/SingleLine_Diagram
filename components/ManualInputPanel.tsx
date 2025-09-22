import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { DiagramData, Node, Link, Group } from '../types';
import { NodeType } from '../types';

interface ManualInputPanelProps {
  data: DiagramData;
  onRemoveNode: (nodeId: string) => void;
  onAddLink: (link: Link) => void;
  onRemoveLink: (sourceId: string, targetId: string) => void;
  setPendingLink: (link: { source: string | null; target: string | null }) => void;
  onAddGroup: (group: Group) => void;
  onRemoveGroup: (groupId: string) => void;
  onUpdateGroup: (groupId: string, nodeIds: string[]) => void;
  onFocusGroup: (groupId: string) => void;
  isEditingDisabled: boolean;
}

type ActiveTab = 'nodes' | 'links' | 'groups';

const commonWireSizes = [
  '1.5 sq. mm.', '2.5 sq. mm.', '4 sq. mm.', '6 sq. mm.', '10 sq. mm.', '16 sq. mm.', '25 sq. mm.', '35 sq. mm.', '50 sq. mm.', '70 sq. mm.', '95 sq. mm.', '120 sq. mm.', '150 sq. mm.', '185 sq. mm.', '240 sq. mm.', '300 sq. mm.'
];

const ManualInputPanel: React.FC<ManualInputPanelProps> = ({ 
  data, onRemoveNode, onAddLink, onRemoveLink, setPendingLink,
  onAddGroup, onRemoveGroup, onUpdateGroup, onFocusGroup, isEditingDisabled
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nodes');
  
  // Node state
  const [nodeSearchTerm, setNodeSearchTerm] = useState('');

  // Link form state
  const [linkSource, setLinkSource] = useState<string>('');
  const [linkTarget, setLinkTarget] = useState<string>('');
  const [linkDiameter, setLinkDiameter] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // Group form state
  const [groupId, setGroupId] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);
  const [selectedNodeForGroup, setSelectedNodeForGroup] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  
  // Refs for auto-focus
  const nodeIdInputRef = useRef<HTMLInputElement>(null);
  const linkSourceSelectRef = useRef<HTMLSelectElement>(null);
  const groupIdInputRef = useRef<HTMLInputElement>(null);

  const filteredNodes = useMemo(() => {
      if (!nodeSearchTerm.trim()) {
          return data.nodes;
      }
      const lowercasedFilter = nodeSearchTerm.toLowerCase();
      return data.nodes.filter(node =>
          node.id.toLowerCase().includes(lowercasedFilter) ||
          node.label.toLowerCase().includes(lowercasedFilter)
      );
  }, [data.nodes, nodeSearchTerm]);

  const filteredGroups = useMemo(() => {
    if (!groupSearchTerm.trim()) {
        return data.groups || [];
    }
    const lowercasedFilter = groupSearchTerm.toLowerCase();
    return (data.groups || []).filter(group =>
        group.id.toLowerCase().includes(lowercasedFilter) ||
        group.label.toLowerCase().includes(lowercasedFilter)
    );
  }, [data.groups, groupSearchTerm]);


  const unassignedNodes = useMemo(() => {
    const assignedNodeIds = new Set(data.groups?.flatMap(g => g.nodeIds) || []);
    return data.nodes.filter(n => !assignedNodeIds.has(n.id));
  }, [data.nodes, data.groups]);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    data.links.forEach(link => {
        ids.add(link.source as string);
        ids.add(link.target as string);
    });
    return ids;
  }, [data.links]);


  // Effect to update parent state for diagram preview
  useEffect(() => {
    if (activeTab === 'links') {
      setPendingLink({ source: linkSource || null, target: linkTarget || null });
    }
  }, [linkSource, linkTarget, activeTab, setPendingLink]);

  // Effect to clean up preview when tab changes or component unmounts
  useEffect(() => {
    if (activeTab !== 'links') {
      setPendingLink({ source: null, target: null });
    }
    return () => {
      setPendingLink({ source: null, target: null });
    };
  }, [activeTab, setPendingLink]);

  // Effect for auto-focus on tab change
  useEffect(() => {
    if (isEditingDisabled) return;

    // Use a timeout to ensure the element is rendered before focusing
    setTimeout(() => {
        if (activeTab === 'nodes') {
            nodeIdInputRef.current?.focus();
        } else if (activeTab === 'links') {
            linkSourceSelectRef.current?.focus();
        } else if (activeTab === 'groups') {
            groupIdInputRef.current?.focus();
        }
    }, 0);
  }, [activeTab, isEditingDisabled]);


  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    if(!linkSource || !linkTarget) {
      setLinkError("Source and Target must be selected.");
      return;
    }

    if (linkSource === linkTarget) {
      setLinkError("A component cannot be linked to itself.");
      return;
    }
    if (data.links.some(l => (l.source === linkSource && l.target === linkTarget) || (l.source === linkTarget && l.target === linkSource))) {
      setLinkError("This connection already exists.");
      return;
    }

    const newLink: Link = { source: linkSource, target: linkTarget };
    if(linkDiameter) {
      newLink.properties = { diameter: linkDiameter };
    }

    onAddLink(newLink);
    setLinkSource('');
    setLinkTarget('');
    setLinkDiameter('');
  };
  
  const handleAddGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);
    if (!groupId || !groupLabel) {
      setGroupError("Group ID and Label are required.");
      return;
    }
    if (data.groups?.some(g => g.id === groupId)) {
      setGroupError(`A group with ID '${groupId}' already exists.`);
      return;
    }
    onAddGroup({ id: groupId, label: groupLabel, nodeIds: [] });
    setGroupId('');
    setGroupLabel('');
  };

  const handleAddNodeToGroup = (groupId: string, nodeId: string) => {
    if (!nodeId) return;
    const group = data.groups?.find(g => g.id === groupId);
    if (group && !group.nodeIds.includes(nodeId)) {
        onUpdateGroup(groupId, [...group.nodeIds, nodeId]);
    }
    setSelectedNodeForGroup('');
  };

  const handleRemoveNodeFromGroup = (groupId: string, nodeId: string) => {
    const group = data.groups?.find(g => g.id === groupId);
    if (group) {
        onUpdateGroup(groupId, group.nodeIds.filter(id => id !== nodeId));
    }
  };

  const TabButton: React.FC<{tab: ActiveTab, label: string}> = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
        activeTab === tab 
          ? 'bg-sky-600 text-white shadow' 
          : 'bg-transparent hover:bg-white/10 text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  const inputClasses = "w-full bg-gray-900/50 border border-white/10 rounded-lg p-2.5 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 focus:outline-none transition-all";
  const selectClasses = inputClasses + " appearance-none bg-no-repeat bg-right";

  const renderNodeEditor = () => (
    <div>
      <div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Components</h3>
        <p className="text-sm text-gray-400 mb-4">Add components by dragging from the palette on the left.</p>
        <div className="mb-2">
            <label htmlFor="node-search" className="sr-only">Search Components</label>
            <input
                ref={nodeIdInputRef}
                id="node-search"
                type="search"
                value={nodeSearchTerm}
                onChange={e => setNodeSearchTerm(e.target.value)}
                placeholder="Search by ID or Label..."
                className={inputClasses}
            />
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2 pr-1 -mr-2">
            {data.nodes.length === 0 && <p className="text-gray-500 text-sm p-4 text-center">No components added yet.</p>}
            {data.nodes.length > 0 && filteredNodes.length === 0 && <p className="text-gray-500 text-sm p-4 text-center">No components match your search.</p>}
            {filteredNodes.map(node => (
                <div key={node.id} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                    <div>
                        <p className="font-semibold text-gray-300">{node.id} <span className="text-xs font-normal text-gray-400">({node.type})</span></p>
                        <p className="text-sm text-gray-400">{node.label}</p>
                         {node.properties?.size && <p className="text-xs text-gray-500">{node.properties.size}</p>}
                    </div>
                    <button onClick={() => onRemoveNode(node.id)} className="text-red-500 hover:text-red-400 p-1 rounded-full text-2xl font-bold leading-none transition-colors">&times;</button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderLinkEditor = () => (
    <div>
        <form onSubmit={handleAddLink} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Add New Connection</h3>
             <div>
                <label htmlFor="link-source" className="block text-sm font-medium text-gray-400 mb-1.5">From</label>
                <select ref={linkSourceSelectRef} id="link-source" value={linkSource} onChange={e => setLinkSource(e.target.value)} className={selectClasses} style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                    <option value="" disabled>Select source...</option>
                    {data.nodes.map(n => <option key={n.id} value={n.id}>{connectedNodeIds.has(n.id) ? '🔌 ' : ''}{n.id} - {n.label}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="link-target" className="block text-sm font-medium text-gray-400 mb-1.5">To</label>
                <select id="link-target" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} className={selectClasses} style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}>
                     <option value="" disabled>Select target...</option>
                    {data.nodes.map(n => <option key={n.id} value={n.id}>{connectedNodeIds.has(n.id) ? '🔌 ' : ''}{n.id} - {n.label}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="link-diameter" className="block text-sm font-medium text-gray-400 mb-1.5">Wire Size</label>
                <input id="link-diameter" type="text" value={linkDiameter} list="wire-sizes-list" onChange={e => setLinkDiameter(e.target.value)} placeholder="e.g., 50 sq. mm." className={inputClasses} />
                <datalist id="wire-sizes-list">
                    {commonWireSizes.map(size => <option key={size} value={size} />)}
                </datalist>
            </div>
             {linkError && <p className="text-red-400 text-sm">{linkError}</p>}
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-md shadow-sky-600/20" disabled={data.nodes.length < 2}>Add Connection</button>
        </form>
         <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Existing Connections</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 -mr-2">
                {data.links.length === 0 && <p className="text-gray-500 text-sm p-4 text-center">No connections added yet.</p>}
                {data.links.map((link, i) => (
                    <div key={`${link.source}-${link.target}-${i}`} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                        <div>
                           <p className="font-mono text-sm text-gray-300">{link.source} &rarr; {link.target}</p>
                           {link.properties?.diameter && <p className="text-xs text-gray-500">{link.properties.diameter}</p>}
                        </div>
                        <button onClick={() => onRemoveLink(link.source as string, link.target as string)} className="text-red-500 hover:text-red-400 p-1 rounded-full text-2xl font-bold leading-none transition-colors">&times;</button>
                    </div>
                ))}
            </div>
      </div>
    </div>
  );

  const renderGroupEditor = () => (
    <div>
        <form onSubmit={handleAddGroupSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Add New Group</h3>
            <div>
                <label htmlFor="group-id" className="block text-sm font-medium text-gray-400 mb-1.5">Group ID</label>
                <input ref={groupIdInputRef} id="group-id" type="text" value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="e.g., SubstationA" className={inputClasses} />
            </div>
             <div>
                <label htmlFor="group-label" className="block text-sm font-medium text-gray-400 mb-1.5">Group Label</label>
                <input id="group-label" type="text" value={groupLabel} onChange={e => setGroupLabel(e.target.value)} placeholder="e.g., Substation A" className={inputClasses} />
            </div>
             {groupError && <p className="text-red-400 text-sm">{groupError}</p>}
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-md shadow-sky-600/20">Add Group</button>
        </form>

        <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Existing Groups</h3>
            <div className="mb-2">
                <label htmlFor="group-search" className="sr-only">Search Groups</label>
                <input
                    id="group-search"
                    type="search"
                    value={groupSearchTerm}
                    onChange={e => setGroupSearchTerm(e.target.value)}
                    placeholder="Search by ID or Label..."
                    className={inputClasses}
                />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1 -mr-2">
                {(!data.groups || data.groups.length === 0) && <p className="text-gray-500 text-sm p-4 text-center">No groups created yet.</p>}
                {data.groups && data.groups.length > 0 && filteredGroups.length === 0 && <p className="text-gray-500 text-sm p-4 text-center">No groups match your search.</p>}
                {filteredGroups.map(group => (
                    <div key={group.id} className="bg-black/20 p-3 rounded-lg">
                         <div className="flex items-center justify-between mb-3">
                            <div>
                               <p className="font-semibold text-gray-300">{group.label} <span className="text-xs font-normal text-gray-400">({group.id})</span></p>
                            </div>
                             <div className="flex items-center gap-2">
                                <button onClick={() => onFocusGroup(group.id)} className="text-xs bg-sky-600/50 hover:bg-sky-600/80 text-sky-200 px-2.5 py-1 rounded-md transition-colors">Focus</button>
                                <button onClick={() => onRemoveGroup(group.id)} className="text-red-500 hover:text-red-400 p-1 rounded-full text-2xl font-bold leading-none transition-colors">&times;</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                          {group.nodeIds.map(nodeId => {
                            const node = data.nodes.find(n => n.id === nodeId);
                            return (
                              <div key={nodeId} className="flex items-center justify-between bg-gray-900/50 p-2 rounded text-sm">
                                <span className="text-gray-300">{node?.label || nodeId}</span>
                                <button onClick={() => handleRemoveNodeFromGroup(group.id, nodeId)} className="text-red-600 hover:text-red-500 text-lg px-1 font-bold leading-none">&times;</button>
                              </div>
                            )
                          })}
                        </div>
                        {unassignedNodes.length > 0 && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                                <select 
                                  value={selectedNodeForGroup} 
                                  onChange={e => setSelectedNodeForGroup(e.target.value)} 
                                  className={`${selectClasses} flex-grow !p-2 text-sm`}
                                  style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`}}
                                >
                                    <option value="" disabled>Add component...</option>
                                    {unassignedNodes.map(n => <option key={n.id} value={n.id}>{n.id} - {n.label}</option>)}
                                </select>
                                <button onClick={() => handleAddNodeToGroup(group.id, selectedNodeForGroup)} className="bg-sky-600/80 hover:bg-sky-600 text-white text-sm font-bold py-1 px-3 rounded-md transition-colors">Add</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-5 shadow-lg h-full relative">
        {isEditingDisabled && (
            <div className="absolute inset-0 bg-gray-800/90 z-20 flex items-center justify-center text-center p-4 rounded-2xl">
                <p className="text-gray-300">Exit focus or trace view to resume editing.</p>
            </div>
        )}
        <fieldset disabled={isEditingDisabled}>
            <div className="flex gap-1 mb-6 bg-black/20 p-1 rounded-xl">
              <TabButton tab="nodes" label="Components" />
              <TabButton tab="links" label="Connections" />
              <TabButton tab="groups" label="Groups" />
            </div>
            <div className="h-[calc(100%-52px)] overflow-y-auto -mr-3 pr-3">
              {activeTab === 'nodes' && renderNodeEditor()}
              {activeTab === 'links' && renderLinkEditor()}
              {activeTab === 'groups' && renderGroupEditor()}
            </div>
        </fieldset>
    </div>
  );
};

export default ManualInputPanel;

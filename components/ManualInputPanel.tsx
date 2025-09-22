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
  '14 AWG', '12 AWG', '10 AWG', '8 AWG', '6 AWG', '4 AWG', '2 AWG', '1/0 AWG', '2/0 AWG', '3/0 AWG', '4/0 AWG',
  '250 MCM', '350 MCM', '500 MCM', '750 MCM', '1000 MCM'
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
      className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
        activeTab === tab 
          ? 'bg-sky-600 text-white' 
          : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
      }`}
    >
      {label}
    </button>
  );

  const renderNodeEditor = () => (
    <div>
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Existing Components</h3>
        <p className="text-sm text-slate-400 mb-4">Add components by dragging from the palette on the left.</p>
        <div className="mb-2">
            <label htmlFor="node-search" className="sr-only">Search Components</label>
            <input
                ref={nodeIdInputRef}
                id="node-search"
                type="search"
                value={nodeSearchTerm}
                onChange={e => setNodeSearchTerm(e.target.value)}
                placeholder="Search by ID or Label..."
                className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {data.nodes.length === 0 && <p className="text-slate-500 text-sm">No components added yet.</p>}
            {data.nodes.length > 0 && filteredNodes.length === 0 && <p className="text-slate-500 text-sm">No components match your search.</p>}
            {filteredNodes.map(node => (
                <div key={node.id} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                    <div>
                        <p className="font-bold text-slate-300">{node.id} <span className="text-xs font-normal text-slate-400">({node.type})</span></p>
                        <p className="text-sm text-slate-400">{node.label}</p>
                         {node.properties?.size && <p className="text-xs text-slate-500 italic">{node.properties.size}</p>}
                    </div>
                    <button onClick={() => onRemoveNode(node.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
                </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderLinkEditor = () => (
    <div>
        <form onSubmit={handleAddLink} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Add New Connection</h3>
             <div>
                <label htmlFor="link-source" className="block text-sm font-medium text-slate-400 mb-1">From</label>
                <select ref={linkSourceSelectRef} id="link-source" value={linkSource} onChange={e => setLinkSource(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none">
                    <option value="" disabled>Select source...</option>
                    {data.nodes.map(n => <option key={n.id} value={n.id}>{connectedNodeIds.has(n.id) ? '🔌 ' : ''}{n.id} - {n.label}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="link-target" className="block text-sm font-medium text-slate-400 mb-1">To</label>
                <select id="link-target" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none">
                     <option value="" disabled>Select target...</option>
                    {data.nodes.map(n => <option key={n.id} value={n.id}>{connectedNodeIds.has(n.id) ? '🔌 ' : ''}{n.id} - {n.label}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="link-diameter" className="block text-sm font-medium text-slate-400 mb-1">Wire Diameter</label>
                <input id="link-diameter" type="text" value={linkDiameter} list="wire-sizes-list" onChange={e => setLinkDiameter(e.target.value)} placeholder="e.g., 4/0 AWG" className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                <datalist id="wire-sizes-list">
                    {commonWireSizes.map(size => <option key={size} value={size} />)}
                </datalist>
            </div>
             {linkError && <p className="text-red-400 text-sm">{linkError}</p>}
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition" disabled={data.nodes.length < 2}>Add Connection</button>
        </form>
         <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Existing Connections</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {data.links.length === 0 && <p className="text-slate-500 text-sm">No connections added yet.</p>}
                {data.links.map((link, i) => (
                    <div key={`${link.source}-${link.target}-${i}`} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                        <div>
                           <p className="font-mono text-sm text-slate-300">{link.source} &rarr; {link.target}</p>
                           {link.properties?.diameter && <p className="text-xs text-slate-500 italic">{link.properties.diameter}</p>}
                        </div>
                        <button onClick={() => onRemoveLink(link.source as string, link.target as string)} className="text-red-400 hover:text-red-300 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
                    </div>
                ))}
            </div>
      </div>
    </div>
  );

  const renderGroupEditor = () => (
    <div>
        <form onSubmit={handleAddGroupSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Add New Group</h3>
            <div>
                <label htmlFor="group-id" className="block text-sm font-medium text-slate-400 mb-1">Group ID</label>
                <input ref={groupIdInputRef} id="group-id" type="text" value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="e.g., SubstationA" className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
            </div>
             <div>
                <label htmlFor="group-label" className="block text-sm font-medium text-slate-400 mb-1">Group Label</label>
                <input id="group-label" type="text" value={groupLabel} onChange={e => setGroupLabel(e.target.value)} placeholder="e.g., Substation A" className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none" />
            </div>
             {groupError && <p className="text-red-400 text-sm">{groupError}</p>}
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition">Add Group</button>
        </form>

        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Existing Groups</h3>
            <div className="mb-2">
                <label htmlFor="group-search" className="sr-only">Search Groups</label>
                <input
                    id="group-search"
                    type="search"
                    value={groupSearchTerm}
                    onChange={e => setGroupSearchTerm(e.target.value)}
                    placeholder="Search by ID or Label..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-md p-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {(!data.groups || data.groups.length === 0) && <p className="text-slate-500 text-sm">No groups created yet.</p>}
                {data.groups && data.groups.length > 0 && filteredGroups.length === 0 && <p className="text-slate-500 text-sm">No groups match your search.</p>}
                {filteredGroups.map(group => (
                    <div key={group.id} className="bg-slate-700/50 p-3 rounded-md">
                         <div className="flex items-center justify-between mb-2">
                            <div>
                               <p className="font-bold text-slate-300">{group.label} <span className="text-xs font-normal text-slate-400">({group.id})</span></p>
                            </div>
                             <div className="flex items-center gap-2">
                                <button onClick={() => onFocusGroup(group.id)} className="text-xs bg-sky-800/70 hover:bg-sky-700/70 text-sky-300 px-2 py-1 rounded-md transition">View</button>
                                <button onClick={() => onRemoveGroup(group.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full text-lg font-bold leading-none">&times;</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                          {group.nodeIds.map(nodeId => {
                            const node = data.nodes.find(n => n.id === nodeId);
                            return (
                              <div key={nodeId} className="flex items-center justify-between bg-slate-800/50 p-1.5 rounded text-sm">
                                <span>{node?.label || nodeId}</span>
                                <button onClick={() => handleRemoveNodeFromGroup(group.id, nodeId)} className="text-red-500/80 hover:text-red-400 text-xs px-1">&times; remove</button>
                              </div>
                            )
                          })}
                        </div>
                        {unassignedNodes.length > 0 && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-600/50">
                                <select 
                                  value={selectedNodeForGroup} 
                                  onChange={e => setSelectedNodeForGroup(e.target.value)} 
                                  className="flex-grow bg-slate-800 border border-slate-600 rounded-md p-1.5 text-sm text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                                >
                                    <option value="" disabled>Add a component...</option>
                                    {unassignedNodes.map(n => <option key={n.id} value={n.id}>{n.id} - {n.label}</option>)}
                                </select>
                                <button onClick={() => handleAddNodeToGroup(group.id, selectedNodeForGroup)} className="bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold py-1 px-3 rounded-md transition">Add</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 h-full shadow-lg relative">
        {isEditingDisabled && (
            <div className="absolute inset-0 bg-slate-800/90 z-20 flex items-center justify-center text-center p-4 rounded-lg">
                <p className="text-slate-300">Exit group focus view to resume editing.</p>
            </div>
        )}
        <fieldset disabled={isEditingDisabled}>
            <div className="flex gap-2 mb-4 bg-slate-900/50 p-1 rounded-lg">
              <TabButton tab="nodes" label="Components" />
              <TabButton tab="links" label="Connections" />
              <TabButton tab="groups" label="Groups" />
            </div>
            <div>
              {activeTab === 'nodes' && renderNodeEditor()}
              {activeTab === 'links' && renderLinkEditor()}
              {activeTab === 'groups' && renderGroupEditor()}
            </div>
        </fieldset>
    </div>
  );
};

export default ManualInputPanel;

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { DiagramData, Node, Link } from '../types';
import { NodeType } from '../types';

interface DiagramProps {
  data: DiagramData;
  pendingLink: { source: string | null; target: string | null };
  viewMode: 'free' | 'fixed';
  onDropNode: (type: NodeType, x: number, y: number) => void;
  onAddNodeAndLink: (sourceNodeId: string, newNodeData: {
    type: NodeType;
    label: string;
    properties?: { size?: string };
  }) => void;
}

const iconSvgs: Record<NodeType, string> = {
    [NodeType.GENERATOR]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="m4.93 4.93 2.83 2.83"></path><path d="m16.24 16.24 2.83 2.83"></path><path d="m4.93 19.07 2.83-2.83"></path><path d="m16.24 7.76 2.83-2.83"></path></svg>`,
    [NodeType.TRANSFORMER]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="4"></circle><circle cx="18" cy="12" r="4"></circle><line x1="6" y1="12" x2="18" y2="12"></line></svg>`,
    [NodeType.BUS]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="10" width="20" height="4" rx="1"></rect></svg>`,
    [NodeType.LOAD]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V18"></path><path d="M12 18H6L12 2L18 18H12Z"></path></svg>`,
    [NodeType.BREAKER]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2"></rect><path d="M5 12H2"></path><path d="M19 12h3"></path></svg>`,
    [NodeType.UNKNOWN]: `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
};


const Diagram: React.FC<DiagramProps> = ({ data, pendingLink, viewMode, onDropNode, onAddNodeAndLink }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || !data.nodes || !svgRef.current) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        return;
    }
    
    if (data.nodes.length === 0) {
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
    }

    // Create copies to avoid mutating props
    const nodes: (d3.SimulationNodeDatum & Node)[] = data.nodes.map(n => ({ ...n }));
    const links: (d3.SimulationLinkDatum<d3.SimulationNodeDatum & Node> & Link)[] = data.links.map(l => ({ ...l }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous diagram

    const parent = svg.node()?.parentElement;
    if (!parent) return;
    
    // --- Tooltip ---
    d3.select(parent).selectAll('.tooltip').remove();
    const tooltip = d3.select(parent)
        .append('div')
        .attr('class', 'tooltip');

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const iconSize = 40;
    
    const simulation = d3.forceSimulation(nodes);

    const container = svg.append("g");
    
    // --- Draw Group Boundaries ---
    const groupColors = d3.scaleOrdinal(d3.schemePastel1);
    const groupLayer = container.insert('g', ':first-child').attr('class', 'group-layer');

    // --- Draw Preview Elements ---
    const previewLinkLine = container.append('line')
        .attr('class', 'preview-link')
        .attr('stroke', '#facc15') // yellow-400
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '6,6')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    // --- Draw Links ---
    const linkGroup = container.append("g")
        .selectAll('g')
        .data(links)
        .join('g');

    const link = linkGroup.append('line')
        .attr('stroke', '#475569') // slate-600
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', d => d.isBoundary ? '5,5' : 'none');

    const linkLabel = linkGroup.append('text')
        .text(d => d.properties?.diameter || '')
        .attr('fill', '#94a3b8') // slate-400
        .style('font-size', '10px')
        .attr('text-anchor', 'start')
        .attr('dx', 8)
        .attr('dy', -4); // offset from line

    // halo for link labels
    linkLabel.clone(true).lower()
        .attr('stroke', '#1e293b') // slate-800
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round');


    // --- Draw Nodes ---
    const node = container.append("g")
        .selectAll('g')
        .data(nodes)
        .join('g');

    // Node background and border
    node.append('circle')
        .attr('r', iconSize / 2)
        .attr('fill', d => d.isExternal ? 'transparent' : '#0f172a') // slate-900
        .attr('stroke', d => {
            if (d.isExternal) return '#475569'; // slate-600
            return (d.id === pendingLink.source || d.id === pendingLink.target) 
            ? '#facc15' // yellow-400 for pending
            : '#38bdf8' // sky-400 for normal
        })
        .attr('stroke-width', d => 
            (d.id === pendingLink.source || d.id === pendingLink.target) 
            ? 4 
            : 2.5
        )
        .attr('stroke-dasharray', d => d.isExternal ? '4,4' : 'none');

    // Node Icons
    const iconPadding = 16;
    node.filter(d => !d.isExternal).append('foreignObject')
        .attr('x', -iconSize / 2 + iconPadding / 2)
        .attr('y', -iconSize / 2 + iconPadding / 2)
        .attr('width', iconSize - iconPadding)
        .attr('height', iconSize - iconPadding)
        .style('color', '#e2e8f0') // slate-200, for 'currentColor' in SVGs
        .style('pointer-events', 'none')
        .html(d => iconSvgs[d.type] || iconSvgs[NodeType.UNKNOWN]);


    // Node Labels
    const labels = node.append('text')
        .text(d => d.label)
        .attr('y', iconSize / 2 + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.isExternal ? '#64748b' : '#cbd5e1') // slate-500 for external, slate-300 for normal
        .style('font-size', '12px')
        .style('pointer-events', 'none');

    // Label halo for readability
    labels.clone(true).lower()
        .attr('stroke', '#1e293b') // slate-800
        .attr('stroke-width', 4)
        .attr('stroke-linejoin', 'round');

    // Property Labels (Size)
    const propertyLabels = node.filter(d => !d.isExternal).append('text')
        .text(d => d.properties?.size || '')
        .attr('y', iconSize / 2 + 36) // Position below main label
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8') // slate-400
        .style('font-size', '11px')
        .style('font-style', 'italic');
    
    propertyLabels.clone(true).lower()
        .attr('stroke', '#1e293b') // slate-800
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round');

    // --- Tooltip Events ---
    node.filter(d => !d.isExternal).on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', 0.95);
        
        let content = `<strong>ID:</strong> ${d.id}<br/>`;
        content += `<strong>Label:</strong> ${d.label}<br/>`;
        content += `<strong>Type:</strong> ${d.type}`;
        if (d.properties?.size) {
            content += `<br/><strong>Size:</strong> ${d.properties.size}`;
        }

        tooltip.html(content);

        const currentTransform = d3.zoomTransform(svg.node()!);
        
        const nodeX = d.x || 0;
        const nodeY = d.y || 0;

        const transformedX = nodeX * currentTransform.k + currentTransform.x;
        const transformedY = nodeY * currentTransform.k + currentTransform.y;

        const nodeRadius = (iconSize / 2) * currentTransform.k;
        const margin = 15;

        tooltip
            .style('left', (transformedX + nodeRadius + margin) + 'px')
            .style('top', transformedY + 'px')
            .style('transform', 'translateY(-50%)');
    })
    .on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
    });

    // --- Node Click Popover ---
    function closePopover() {
        container.selectAll('.node-popover').remove();
        d3.select(window).on('mousedown.popover', null);
    }
    
    function renderForm(
        d: d3.SimulationNodeDatum & Node,
        popoverContent: d3.Selection<HTMLDivElement, unknown, null, undefined>
    ) {
        popoverContent.html(''); // Clear existing content

        const header = popoverContent.append('xhtml:div')
            .style('display', 'flex').style('justify-content', 'space-between')
            .style('align-items', 'center').style('margin-bottom', '12px');
        
        header.append('xhtml:span').style('font-weight', '600').text('Add & Connect Component');

        header.append('xhtml:button').html('&times;')
            .style('background', 'none').style('border', 'none').style('color', '#94a3b8')
            .style('font-size', '20px').style('cursor', 'pointer').style('line-height', '1')
            .on('click', (event) => { event.stopPropagation(); closePopover(); });

        const form = popoverContent.append('xhtml:form')
            .style('display', 'flex').style('flex-direction', 'column')
            .style('gap', '10px').style('flex-grow', '1');

        const componentTypes = [NodeType.TRANSFORMER, NodeType.BUS, NodeType.LOAD, NodeType.BREAKER];
        const inputStyles = 'width: 100%; box-sizing: border-box; background-color: #334155; border: 1px solid #475569; border-radius: 6px; padding: 8px; color: #cbd5e1; font-size: 14px;';
        const labelStyles = 'font-size: 13px; color: #94a3b8; margin-bottom: -4px;';

        // Type Selector
        form.append('xhtml:label').attr('for', 'popover-type').text('Component Type').attr('style', labelStyles);
        const typeSelect = form.append('xhtml:select')
            .attr('id', 'popover-type').attr('style', inputStyles);
        
        typeSelect.selectAll('option')
            .data(componentTypes)
            .join('option')
            .attr('value', d => d)
            .text(d => d.charAt(0) + d.slice(1).toLowerCase());
        
        // Label Input
        form.append('xhtml:label').attr('for', 'popover-label').text('Label').attr('style', labelStyles);
        const labelInput = form.append('xhtml:input')
            .attr('id', 'popover-label').attr('type', 'text')
            .attr('style', inputStyles);
            
        const generateDefaultLabel = (type: NodeType) => {
            let count = 1;
            let defaultLabel = `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} ${count}`;
            while(data.nodes.some(n => n.label === defaultLabel)) {
                count++;
                defaultLabel = `${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} ${count}`;
            }
            return defaultLabel;
        }

        labelInput.attr('value', generateDefaultLabel(componentTypes[0]));

        let userHasTyped = false;
        labelInput.on('input', () => { userHasTyped = true; });
        
        typeSelect.on('change', function() {
            if (!userHasTyped) {
                const selectedType = d3.select(this).property('value') as NodeType;
                labelInput.property('value', generateDefaultLabel(selectedType));
            }
        });

        // Size Input
        form.append('xhtml:label').attr('for', 'popover-size').text('Size (optional)').attr('style', labelStyles);
        const sizeInput = form.append('xhtml:input')
            .attr('id', 'popover-size').attr('type', 'text').attr('placeholder', 'e.g., 500kW')
            .attr('style', inputStyles);

        // Submit Button
        form.append('xhtml:button').attr('type', 'submit').text('Add Component')
            .attr('style', 'width: 100%; background-color: #0ea5e9; color: white; font-weight: 600; padding: 10px; border-radius: 6px; border: none; cursor: pointer; margin-top: 8px; font-size: 14px; transition: background-color 0.2s;')
            .on('mouseover', function() { d3.select(this).style('background-color', '#0284c7'); })
            .on('mouseout', function() { d3.select(this).style('background-color', '#0ea5e9'); });
        
        form.on('submit', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const type = (typeSelect.node() as HTMLSelectElement).value as NodeType;
            const label = (labelInput.node() as HTMLInputElement).value;
            const size = (sizeInput.node() as HTMLInputElement).value;

            if (!label) {
                (labelInput.node() as HTMLInputElement).style.borderColor = '#f87171'; // red-400
                return;
            }

            const newNodeData = { type, label, properties: size ? { size } : undefined };
            onAddNodeAndLink(d.id, newNodeData);
            closePopover();
        });

        setTimeout(() => (labelInput.node() as HTMLInputElement)?.select(), 50);
    }

    function showPopover(event: MouseEvent, d: d3.SimulationNodeDatum & Node) {
        closePopover();

        const popoverWidth = 280;
        const popoverHeight = 320;

        const popover = container.append('foreignObject')
            .attr('class', 'node-popover')
            .attr('x', d.x! + iconSize / 2 + 10)
            .attr('y', d.y! - popoverHeight / 2)
            .attr('width', popoverWidth)
            .attr('height', popoverHeight);

        popover.on('mousedown', (event) => event.stopPropagation());
        popover.on('wheel', (event) => event.stopPropagation());

        const popoverBody = popover.append('xhtml:body')
            .style('margin', '0').style('padding', '0')
            .style('background', 'transparent').style('height', '100%');

        const popoverContent = popoverBody.append('xhtml:div')
            .style('background-color', '#1e293b').style('border', '1px solid #334155')
            .style('border-radius', '8px').style('color', '#cbd5e1')
            .style('font-family', 'sans-serif').style('font-size', '14px')
            .style('padding', '16px').style('height', '100%')
            .style('box-sizing', 'border-box').style('display', 'flex')
            .style('flex-direction', 'column');

        renderForm(d, popoverContent);

        d3.select(window).on('mousedown.popover', (e: MouseEvent) => {
            if (!popover.node()?.contains(e.target as globalThis.Node)) {
                closePopover();
            }
        });
    }

    // --- Click handler for nodes ---
    node.filter(d => !d.isExternal).on('click', (event, d) => {
        if (event.defaultPrevented) return; // ignore during drag
        event.stopPropagation();
        showPopover(event, d);
    });

    // --- Layout and Interactivity ---
    if (viewMode === 'fixed') {
        const verticalSpacing = 140;
        const horizontalSpacing = 150;

        // --- BFS-based Layout ---
        const linkTargets = new Set(links.map(l => (l.target as any).id || l.target));
        const rootNodes = nodes.filter(n => n.type === NodeType.GENERATOR || !linkTargets.has(n.id));

        const levels: (typeof nodes)[] = [];
        const visited = new Set<string>();
        let queue = [...rootNodes];
        queue.forEach(n => visited.add(n.id));

        while (queue.length > 0) {
            levels.push(queue);
            const nextQueue: (typeof nodes)[] = [];
            for (const currentNode of queue) {
                const children = links
                    .filter(l => ((l.source as any).id || l.source) === currentNode.id)
                    .map(l => nodes.find(n => n.id === ((l.target as any).id || l.target)))
                    .filter((n): n is (d3.SimulationNodeDatum & Node) => !!n && !visited.has(n.id));
                
                children.forEach(child => {
                    if (!visited.has(child.id)) {
                        visited.add(child.id);
                        nextQueue.push(child);
                    }
                });
            }
            queue = nextQueue;
        }

        const unvisitedNodes = nodes.filter(n => !visited.has(n.id));
        if (unvisitedNodes.length > 0) {
            levels.push(unvisitedNodes);
        }

        const totalHeight = (levels.length - 1) * verticalSpacing;
        levels.forEach((level, levelIndex) => {
            const levelWidth = (level.length - 1) * horizontalSpacing;
            const startX = -levelWidth / 2;
            level.forEach((n, nodeIndex) => {
                n.fx = startX + nodeIndex * horizontalSpacing;
                n.fy = levelIndex * verticalSpacing - totalHeight / 2;
            });
        });
        
        simulation
            .force("link", d3.forceLink(links).id((d: any) => d.id))
            .alpha(0.3).restart();

        node.attr('cursor', d => d.isExternal ? 'default' : 'pointer');
    
    } else { // 'free' view
        nodes.forEach(n => {
            if (!n.fx && !n.fy) { // Respect fixed position from drop
              n.fx = null;
              n.fy = null;
            }
        });

        simulation
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force("collide", d3.forceCollide(iconSize * 1.2))
            .alpha(1).restart();
        
        node.attr('cursor', d => d.isExternal ? 'default' : 'grab');

        function dragstarted(event: d3.D3DragEvent<SVGGElement, d3.SimulationNodeDatum & Node, any>, d: d3.SimulationNodeDatum & Node) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(this).attr('cursor', 'grabbing');
        }

        function dragged(event: d3.D3DragEvent<SVGGElement, d3.SimulationNodeDatum & Node, any>, d: d3.SimulationNodeDatum & Node) {
          d.fx = event.x;
          d.fy = event.y;
        }

        function dragended(event: d3.D3DragEvent<SVGGElement, d3.SimulationNodeDatum & Node, any>, d: d3.SimulationNodeDatum & Node) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          d3.select(this).attr('cursor', 'grab');
        }

        node.filter(d => !d.isExternal).call(d3.drag<SVGGElement, d3.SimulationNodeDatum & Node>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
    }


    // Zooming and Panning
    const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            container.attr('transform', event.transform);
            closePopover();
        });

    svg.call(zoom)
       .call(zoom.transform, initialTransform);

    // --- Drag and Drop from Palette ---
    svg
      .on('dragover', (event) => {
        event.preventDefault(); // This is necessary to allow a drop
      })
      .on('drop', (event) => {
        event.preventDefault();
        const droppedData = JSON.parse(event.dataTransfer.getData('application/json'));
        const type = droppedData.type as NodeType;

        if (type && Object.values(NodeType).includes(type)) {
          const currentTransform = d3.zoomTransform(svg.node()!);
          const [mx, my] = d3.pointer(event, svg.node()!);
          const { x, y } = currentTransform.invert([mx, my]);
          onDropNode(type, x, y);
        }
      });


    // --- Simulation Ticker ---
    simulation.on('tick', () => {
        link
            .attr('x1', d => (d.source as any).x)
            .attr('y1', d => (d.source as any).y)
            .attr('x2', d => (d.target as any).x)
            .attr('y2', d => (d.target as any).y);
        
        linkLabel
            .attr('x', d => ((d.source as any).x + (d.target as any).x) / 2)
            .attr('y', d => ((d.source as any).y + (d.target as any).y) / 2);

        node.attr('transform', d => `translate(${d.x}, ${d.y})`);

        // --- Update Group Boundaries ---
        const groupPathData: { [key: string]: [number, number][] } = {};
        const groupPadding = iconSize * 0.9;

        (data.groups || []).forEach(group => {
            const groupNodes = group.nodeIds.map(nodeId => nodes.find(n => n.id === nodeId && !n.isExternal)).filter((n): n is d3.SimulationNodeDatum & Node => !!n && n.x !== undefined && n.y !== undefined);
            if (groupNodes.length === 0) return;
            
            const points: [number, number][] = groupNodes.flatMap(n => [
                [n.x! - groupPadding, n.y! - groupPadding], [n.x! - groupPadding, n.y! + groupPadding],
                [n.x! + groupPadding, n.y! - groupPadding], [n.x! + groupPadding, n.y! + groupPadding]
            ]);

            const hull = d3.polygonHull(points);
            if (hull) {
                groupPathData[group.id] = hull;
            }
        });

        groupLayer.selectAll<SVGPathElement, DiagramData['groups'][number]>('path')
            .data(data.groups || [], d => d.id)
            .join('path')
            .attr('d', d => {
                const path = groupPathData[d.id];
                return path ? `M${path.join('L')}Z` : '';
            })
            .attr('fill', d => groupColors(d.id))
            .attr('stroke', d => groupColors(d.id))
            .attr('stroke-width', 20)
            .attr('stroke-linejoin', 'round')
            .style('opacity', 0.15)
            .style('pointer-events', 'none');
        
        // Update group labels
        groupLayer.selectAll<SVGTextElement, DiagramData['groups'][number]>('text')
            .data(data.groups || [], d => d.id)
            .join('text')
            .text(d => d.label)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('fill', '#e2e8f0') // slate-200
            .style('font-size', '14px')
            .attr('x', d => {
                const path = groupPathData[d.id];
                return path ? d3.polygonCentroid(path)[0] : -9999;
            })
            .attr('y', d => {
                const path = groupPathData[d.id];
                if (!path) return -9999;
                const [minY] = d3.extent(path, p => p[1]) || [0];
                return minY - 20; // Position above the hull
            });


        // Update preview link
        if (pendingLink.source && pendingLink.target) {
            const sourceNode = nodes.find(n => n.id === pendingLink.source);
            const targetNode = nodes.find(n => n.id === pendingLink.target);

            if (sourceNode?.x && sourceNode?.y && targetNode?.x && targetNode?.y) {
                previewLinkLine
                    .attr('x1', sourceNode.x)
                    .attr('y1', sourceNode.y)
                    .attr('x2', targetNode.x)
                    .attr('y2', targetNode.y)
                    .style('opacity', 0.8);
            } else {
                previewLinkLine.style('opacity', 0);
            }
        } else {
            previewLinkLine.style('opacity', 0);
        }
    });

  }, [data, pendingLink, viewMode, onDropNode, onAddNodeAndLink]);

  return (
    <svg ref={svgRef} width="100%" height="100%" className="overflow-hidden"></svg>
  );
};

export default Diagram;
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import type { DiagramData, Node, Link, ComponentTypeDefinition } from '../types';

interface DiagramProps {
  data: DiagramData;
  pendingLink: { source: string | null; target: string | null };
  viewMode: 'free' | 'fixed';
  appMode: 'view' | 'edit';
  onDropNode: (type: string, x: number, y: number) => void;
  onAddNodeAndLink: (sourceNodeId: string, newNodeData: {
    type: string;
    label: string;
    properties?: { size?: string };
    linkProperties?: { diameter?: string };
  }) => void;
  onTraceUpstream: (nodeId: string) => void;
  componentTypes: ComponentTypeDefinition[];
}

export interface DiagramHandle {
  exportToJPG: () => void;
}

const unknownIconSvg = `<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

const commonWireSizes = [
  '1.5 sq. mm.', '2.5 sq. mm.', '4 sq. mm.', '6 sq. mm.', '10 sq. mm.', '16 sq. mm.', '25 sq. mm.', '35 sq. mm.', '50 sq. mm.', '70 sq. mm.', '95 sq. mm.', '120 sq. mm.', '150 sq. mm.', '185 sq. mm.', '240 sq. mm.', '300 sq. mm.'
];


const Diagram = forwardRef<DiagramHandle, DiagramProps>(({ data, pendingLink, viewMode, appMode, onDropNode, onAddNodeAndLink, onTraceUpstream, componentTypes }, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useImperativeHandle(ref, () => ({
    exportToJPG: () => {
      const svgElement = svgRef.current;
      if (!svgElement) {
        alert("Cannot export: Diagram element not found.");
        return;
      }

      // 1. Get the content's bounding box from the original SVG to get correct dimensions
      const contentGroup = svgElement.querySelector('g');
      if (!contentGroup) {
          alert("Cannot export: No content found in the diagram.");
          return;
      }
      const bbox = contentGroup.getBBox();

      // Add a check for an empty or invalid bounding box
      if (bbox.width === 0 && bbox.height === 0) {
          alert("Cannot export: Diagram content is not visible or has no dimensions.");
          return;
      }

      // 2. Clone the SVG to manipulate it without affecting the live diagram
      const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
      
      // 3. Remove the zoom/pan transform from the main group in the clone.
      // This is the key step to ensure the viewBox is the only thing framing the content,
      // effectively centering the entire diagram regardless of the current on-screen view.
      const groupInClone = svgClone.querySelector('g');
      groupInClone?.removeAttribute('transform');

      // 4. Set dimensions and viewBox on the clone for export
      const padding = 50;
      const exportWidth = bbox.width + padding * 2;
      const exportHeight = bbox.height + padding * 2;
      
      const viewBox = `${bbox.x - padding} ${bbox.y - padding} ${exportWidth} ${exportHeight}`;

      svgClone.setAttribute('width', String(exportWidth));
      svgClone.setAttribute('height', String(exportHeight));
      svgClone.setAttribute('viewBox', viewBox);

      // 5. Serialize the modified clone
      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

      // 6. Create an Image to render the SVG
      const image = new Image();
      image.src = svgDataUrl;

      image.onload = () => {
        // 7. Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            alert("Could not create an image canvas for export.");
            return;
        }
        
        // 8. Draw background color + image
        const backgroundColor = '#111827'; // gray-900
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        // 9. Trigger download
        const link = document.createElement('a');
        link.download = 'single-line-diagram.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.95); // High quality
        link.click();
      };
      
      image.onerror = (err) => {
        console.error("Failed to convert SVG to Image:", err);
        alert("Error exporting image. The diagram may contain elements that cannot be rendered for export.");
      };
    }
  }));

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

    const iconSvgs = componentTypes.reduce((acc, comp) => {
        acc[comp.type] = comp.iconSvg;
        return acc;
    }, {} as Record<string, string>);

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

    const link = linkGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#6b7280') // gray-500
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', d => d.isBoundary ? '5,5' : 'none');

    const linkLabel = linkGroup.append('text')
        .text(d => d.properties?.diameter || '')
        .attr('fill', '#9ca3af') // gray-400
        .style('font-size', '10px')
        .attr('text-anchor', 'start')
        .attr('dx', 8)
        .attr('dy', -4); // offset from line

    // halo for link labels
    linkLabel.clone(true).lower()
        .attr('stroke', '#111827') // gray-900
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
        .attr('fill', d => d.isExternal ? 'transparent' : '#374151') // gray-700
        .attr('stroke', d => {
            if (d.isExternal) return '#4b5563'; // gray-600
            return (d.id === pendingLink.source || d.id === pendingLink.target) 
            ? '#facc15' // yellow-400 for pending
            : '#38bdf8' // sky-400 for normal
        })
        .attr('stroke-width', d => 
            (d.id === pendingLink.source || d.id === pendingLink.target) 
            ? 3 
            : 2
        )
        .attr('stroke-dasharray', d => d.isExternal ? '4,4' : 'none');

    // Node Icons
    const iconPadding = 16;
    node.filter(d => !d.isExternal).append('foreignObject')
        .attr('x', -iconSize / 2 + iconPadding / 2)
        .attr('y', -iconSize / 2 + iconPadding / 2)
        .attr('width', iconSize - iconPadding)
        .attr('height', iconSize - iconPadding)
        .style('color', '#e5e7eb') // gray-200, for 'currentColor' in SVGs
        .style('pointer-events', 'none')
        .html(d => iconSvgs[d.type] || unknownIconSvg);


    // Node Labels
    const labels = node.append('text')
        .text(d => d.label)
        .attr('y', iconSize / 2 + 20)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.isExternal ? '#6b7280' : '#e5e7eb') // gray-500 for external, gray-200 for normal
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('pointer-events', 'none');

    // Label halo for readability
    labels.clone(true).lower()
        .attr('stroke', '#111827') // gray-900
        .attr('stroke-width', 4)
        .attr('stroke-linejoin', 'round');

    // Property Labels (Size)
    const propertyLabels = node.filter(d => !d.isExternal).append('text')
        .text(d => d.properties?.size || '')
        .attr('y', iconSize / 2 + 36) // Position below main label
        .attr('text-anchor', 'middle')
        .attr('fill', '#9ca3af') // gray-400
        .style('font-size', '11px');
    
    propertyLabels.clone(true).lower()
        .attr('stroke', '#111827') // gray-900
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round');

    // --- Tooltip Events ---
    node.filter(d => !d.isExternal).on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', 1);
        
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

    // --- Popover and Context Menu Management ---
    function closePopover() {
        container.selectAll('.node-popover').remove();
        d3.select(window).on('mousedown.popover', null);
    }
    
    function closeContextMenu() {
        container.selectAll('.node-context-menu').remove();
        d3.select(window).on('mousedown.contextmenu', null);
    }

    // FIX: Changed type from d3.Selection<HTMLDivElement, ...> to d3.Selection<d3.BaseType, ...>
    // to handle the generic type returned by d3 when appending namespaced 'xhtml:*' elements.
    function renderForm(
        d: d3.SimulationNodeDatum & Node,
        popoverContent: d3.Selection<d3.BaseType, unknown, null, undefined>
    ) {
        popoverContent.html(''); // Clear existing content

        const header = popoverContent.append('xhtml:div')
            .style('display', 'flex').style('justify-content', 'space-between')
            .style('align-items', 'center').style('margin-bottom', '16px');
        
        header.append('xhtml:span').style('font-weight', '600').style('font-size', '16px').text('Add & Connect Component');

        header.append('xhtml:button').html('&times;')
            .style('background', 'none').style('border', 'none').style('color', '#9ca3af')
            .style('font-size', '24px').style('cursor', 'pointer').style('line-height', '1')
            .on('click', (event) => { event.stopPropagation(); closePopover(); });

        const form = popoverContent.append('xhtml:form')
            .style('display', 'flex').style('flex-direction', 'column')
            .style('gap', '12px').style('flex-grow', '1');

        const connectableComponentTypes = componentTypes.filter(c => c.type !== 'GENERATOR');
        const inputStyles = 'width: 100%; box-sizing: border-box; background-color: #111827; border: 1px solid #4b5563; border-radius: 8px; padding: 10px; color: #d1d5db; font-size: 14px; transition: all 0.2s;';
        const labelStyles = 'font-size: 13px; color: #9ca3af; margin-bottom: -6px; font-weight: 500;';

        // Type Selector
        form.append('xhtml:label').attr('for', 'popover-type').text('Component Type').attr('style', labelStyles);
        const typeSelect = form.append('xhtml:select')
            .attr('id', 'popover-type').attr('style', inputStyles + ' appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em;');
        
        typeSelect.selectAll('option')
            .data(connectableComponentTypes)
            .join('option')
            .attr('value', d => d.type)
            .text(d => d.label);
        
        // Label Input
        form.append('xhtml:label').attr('for', 'popover-label').text('Label').attr('style', labelStyles);
        const labelInput = form.append('xhtml:input')
            .attr('id', 'popover-label').attr('type', 'text')
            .attr('style', inputStyles);
            
        const generateDefaultLabel = (type: string) => {
            const componentDef = componentTypes.find(c => c.type === type);
            const labelBase = componentDef ? componentDef.label : type;
            let count = 1;
            let defaultLabel = `${labelBase} ${count}`;
            while(data.nodes.some(n => n.label === defaultLabel)) {
                count++;
                defaultLabel = `${labelBase} ${count}`;
            }
            return defaultLabel;
        }

        labelInput.attr('value', generateDefaultLabel(connectableComponentTypes[0]?.type || ''));

        let userHasTyped = false;
        labelInput.on('input', () => { userHasTyped = true; });
        
        typeSelect.on('change', function() {
            if (!userHasTyped) {
                const selectedType = d3.select(this).property('value') as string;
                labelInput.property('value', generateDefaultLabel(selectedType));
            }
        });

        // Size Input
        form.append('xhtml:label').attr('for', 'popover-size').text('Size (optional)').attr('style', labelStyles);
        const sizeInput = form.append('xhtml:input')
            .attr('id', 'popover-size').attr('type', 'text').attr('placeholder', 'e.g., 500kW')
            .attr('style', inputStyles);

        // Wire Diameter Input
        form.append('xhtml:label').attr('for', 'popover-diameter').text('Wire Diameter (optional)').attr('style', labelStyles);
        const diameterInput = form.append('xhtml:input')
            .attr('id', 'popover-diameter').attr('type', 'text').attr('placeholder', 'e.g., 50 sq. mm.')
            .attr('list', 'wire-sizes-list-popover')
            .attr('style', inputStyles);
        
        const datalist = form.append('xhtml:datalist').attr('id', 'wire-sizes-list-popover');
        datalist.selectAll('option')
            .data(commonWireSizes)
            .join('option')
            .attr('value', d => d);

        // Submit Button
        form.append('xhtml:button').attr('type', 'submit').text('Add Component')
            .attr('style', 'width: 100%; background-color: #0ea5e9; color: white; font-weight: 600; padding: 10px; border-radius: 8px; border: none; cursor: pointer; margin-top: 8px; font-size: 14px; transition: background-color 0.2s;')
            .on('mouseover', function() { d3.select(this).style('background-color', '#0284c7'); })
            .on('mouseout', function() { d3.select(this).style('background-color', '#0ea5e9'); });
        
        form.on('submit', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const type = (typeSelect.node() as HTMLSelectElement).value as string;
            const label = (labelInput.node() as HTMLInputElement).value;
            const size = (sizeInput.node() as HTMLInputElement).value;
            const diameter = (diameterInput.node() as HTMLInputElement).value;

            if (!label) {
                (labelInput.node() as HTMLInputElement).style.borderColor = '#f87171'; // red-400
                return;
            }

            const newNodeData = { 
                type, 
                label, 
                properties: size ? { size } : undefined,
                linkProperties: diameter ? { diameter } : undefined 
            };
            onAddNodeAndLink(d.id, newNodeData);
            closePopover();
        });

        setTimeout(() => (labelInput.node() as HTMLInputElement)?.select(), 50);
    }

    function showPopover(event: MouseEvent, d: d3.SimulationNodeDatum & Node) {
        closePopover();
        closeContextMenu();

        const popoverWidth = 300;
        const popoverHeight = 420;

        const popover = container.append('foreignObject')
            .attr('class', 'node-popover')
            .attr('x', d.x! + iconSize / 2 + 15)
            .attr('y', d.y! - popoverHeight / 2)
            .attr('width', popoverWidth)
            .attr('height', popoverHeight);

        popover.on('mousedown', (event) => event.stopPropagation());
        popover.on('wheel', (event) => event.stopPropagation());

        const popoverBody = popover.append('xhtml:body')
            .style('margin', '0').style('padding', '0')
            .style('background', 'transparent').style('height', '100%');

        const popoverContent = popoverBody.append('xhtml:div')
            .style('background-color', 'rgba(31, 41, 55, 0.8)') // gray-800 with transparency
            .style('backdrop-filter', 'blur(8px)')
            .style('border', '1px solid rgba(255, 255, 255, 0.1)')
            .style('border-radius', '12px').style('color', '#d1d5db') // gray-300
            .style('font-family', 'Inter, sans-serif').style('font-size', '14px')
            .style('padding', '20px').style('height', '100%')
            .style('box-sizing', 'border-box').style('display', 'flex')
            .style('flex-direction', 'column')
            .style('box-shadow', '0 10px 25px rgba(0,0,0,0.3)');

        renderForm(d, popoverContent);

        d3.select(window).on('mousedown.popover', (e: MouseEvent) => {
            if (!popover.node()?.contains(e.target as globalThis.Node)) {
                closePopover();
            }
        });
    }

    // --- Context Menu (Right-Click) Handler ---
    node.filter(d => !d.isExternal).on('contextmenu', (event, d) => {
        event.preventDefault();
        closePopover();
        closeContextMenu();

        const [pointerX, pointerY] = d3.pointer(event, container.node() as any);

        const contextMenu = container.append('foreignObject')
            .attr('class', 'node-context-menu')
            .attr('x', pointerX + 5)
            .attr('y', pointerY + 5)
            .attr('width', 180)
            .attr('height', 50);
        
        contextMenu.on('mousedown', e => e.stopPropagation());

        const body = contextMenu.append('xhtml:body')
            .style('margin', '0').style('padding', '0').style('background', 'transparent');

        const menuDiv = body.append('xhtml:div')
            .style('background-color', 'rgba(31, 41, 55, 0.8)') // gray-800 with transparency
            .style('backdrop-filter', 'blur(8px)')
            .style('border', '1px solid rgba(255, 255, 255, 0.1)')
            .style('border-radius', '8px').style('padding', '4px').style('box-shadow', '0 4px 15px rgba(0,0,0,0.3)');

        menuDiv.append('xhtml:button')
            .text('Trace Upstream Path')
            .attr('style', 'width: 100%; text-align: left; background: none; border: none; color: #d1d5db; padding: 8px 12px; cursor: pointer; border-radius: 6px; font-size: 14px; font-family: Inter, sans-serif; transition: background-color 0.2s;')
            .on('mouseover', function() { d3.select(this).style('background-color', 'rgba(255, 255, 255, 0.1)'); })
            .on('mouseout', function() { d3.select(this).style('background-color', 'transparent'); })
            .on('click', () => {
                onTraceUpstream(d.id);
                closeContextMenu();
            });

        d3.select(window).on('mousedown.contextmenu', (e: MouseEvent) => {
            if (!contextMenu.node()?.contains(e.target as globalThis.Node)) {
                closeContextMenu();
            }
        });
    });

    if (appMode === 'edit') {
        // --- Click handler for nodes (for adding new connected nodes) ---
        node.filter(d => !d.isExternal).on('click', (event, d) => {
            if (event.defaultPrevented) return; // ignore during drag
            event.stopPropagation();
            showPopover(event, d);
        });
    }


    // --- Layout and Interactivity ---
    if (viewMode === 'fixed') {
        const buildHierarchy = (nodes: Node[], links: Link[]) => {
            if (nodes.length === 0) return null;

            // 1. Prepare data structures for traversal
            const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));
            const adj = new Map(nodes.map(n => [n.id, [] as string[]]));
            const targetIds = new Set<string>();

            links.forEach(link => {
                const sourceId = (link.source as any).id || (link.source as string);
                const targetId = (link.target as any).id || (link.target as string);
                if (adj.has(sourceId)) {
                    adj.get(sourceId)!.push(targetId);
                }
                targetIds.add(targetId);
            });

            // 2. Find root nodes (nodes that are never a target)
            const rootNodes: (Node & {children: any[]})[] = [];
            for (const node of nodes) {
                if (!targetIds.has(node.id)) {
                    const rootNode = nodeMap.get(node.id);
                    if (rootNode) rootNodes.push(rootNode);
                }
            }
            
            // Fallback for graphs with no clear root (e.g., contains only cycles)
            if (rootNodes.length === 0 && nodes.length > 0) {
                const fallbackRoot = nodeMap.get(nodes[0].id);
                if (fallbackRoot) rootNodes.push(fallbackRoot);
            }

            // 3. Build a strict tree using BFS to handle cycles and multiple parents gracefully
            const visited = new Set<string>();
            const q = [...rootNodes];
            rootNodes.forEach(r => visited.add(r.id));

            let head = 0;
            while(head < q.length) {
                const parent = q[head++];
                // Ensure children array is clean before populating
                parent.children = []; 

                const childrenIds = adj.get(parent.id) || [];
                for (const childId of childrenIds) {
                    if (!visited.has(childId)) {
                        visited.add(childId);
                        const childNode = nodeMap.get(childId);
                        if(childNode) {
                            parent.children.push(childNode);
                            q.push(childNode);
                        }
                    }
                }
            }

            // 4. If there are multiple disconnected trees, create a virtual root to group them
            if (rootNodes.length > 1) {
                return { id: '__DUMMY_ROOT__', type: 'UNKNOWN', label: 'root', children: rootNodes };
            }
            
            return rootNodes[0];
        };

        const hierarchyData = buildHierarchy(nodes, links);

        if (hierarchyData) {
            const root = d3.hierarchy(hierarchyData, d => (d as any).children);
            
            const verticalSpacing = 160;
            const horizontalSpacing = 120;
            const treeLayout = d3.tree().nodeSize([horizontalSpacing, verticalSpacing]);
            
            treeLayout(root);
            
            const descendants = root.descendants();
            let minY = Infinity;
            descendants.forEach(d => {
                if (d.y < minY) minY = d.y;
            });

            const xCoords = descendants.map(d => d.x);
            const minX = d3.min(xCoords) || 0;
            const maxX = d3.max(xCoords) || 0;
            const treeWidth = maxX - minX;
            const xOffset = -(minX + treeWidth / 2);

            descendants.forEach(d => {
                const originalNode = nodes.find(n => n.id === (d.data as any).id);
                if (originalNode) {
                    if ((d.data as any).id === '__DUMMY_ROOT__') {
                        originalNode.fx = null;
                        originalNode.fy = null;
                    } else {
                        originalNode.fx = d.x + xOffset;
                        originalNode.fy = d.y - minY;
                    }
                }
            });
        }
        
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
        
        node.attr('cursor', d => {
            if (d.isExternal) return 'default';
            return 'grab';
        });

        // In free view, nodes can be dragged for temporary rearrangement in both view and edit modes.
        // Note: In the current implementation, dragged positions are not persisted in the state.
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
            closeContextMenu();
        });

    svg.call(zoom)
       .call(zoom.transform, initialTransform);

    // --- Drag and Drop from Palette ---
    svg
      .on('dragover', (event) => {
        event.preventDefault(); // This is necessary to allow a drop
      })
      .on('drop', (event) => {
        if (appMode === 'view') return;
        event.preventDefault();
        const droppedData = JSON.parse(event.dataTransfer.getData('application/json'));
        const type = droppedData.type as string;

        if (type) {
          const currentTransform = d3.zoomTransform(svg.node()!);
          const [mx, my] = d3.pointer(event, svg.node()!);
          // FIX: Correctly destructure the array returned by `currentTransform.invert`. It returns [x, y], not {x, y}.
          const [x, y] = currentTransform.invert([mx, my]);
          onDropNode(type, x, y);
        }
      });


    // --- Simulation Ticker ---
    simulation.on('tick', () => {
        link.attr('d', d => {
            const source = d.source as any;
            const target = d.target as any;

            if (source.x == null || source.y == null || target.x == null || target.y == null) {
                return null;
            }

            if (viewMode === 'fixed') {
                // Classic org chart elbow path
                const midY = (source.y + target.y) / 2;
                return `M ${source.x},${source.y} V ${midY} H ${target.x} V ${target.y}`;
            } else {
                // 'free' view, a simple straight line
                return `M ${source.x},${source.y} L ${target.x},${target.y}`;
            }
        });
        
        linkLabel
            .attr('x', d => ((d.source as any).x + (d.target as any).x) / 2)
            .attr('y', d => ((d.source as any).y + (d.target as any).y) / 2);

        node.attr('transform', d => `translate(${d.x}, ${d.y})`);

        // --- Update Group Boundaries ---
        const groupPathData: { [key: string]: string } = {};
        const groupPadding = iconSize * 1.5;
        const cornerRadius = 30;

        (data.groups || []).forEach(group => {
            const groupNodes = group.nodeIds
                .map(nodeId => nodes.find(n => n.id === nodeId && !n.isExternal))
                .filter((n): n is d3.SimulationNodeDatum & Node => !!n && n.x !== undefined && n.y !== undefined);

            if (groupNodes.length === 0) return;

            const xCoords = groupNodes.map(n => n.x!);
            const yCoords = groupNodes.map(n => n.y!);

            const minX = d3.min(xCoords)! - groupPadding;
            const maxX = d3.max(xCoords)! + groupPadding;
            const minY = d3.min(yCoords)! - groupPadding - 20; // Extra v-padding for label
            const maxY = d3.max(yCoords)! + groupPadding;
            
            const width = maxX - minX;
            const height = maxY - minY;

            const pathString = `
              M${minX + cornerRadius},${minY}
              h${width - 2 * cornerRadius}
              a${cornerRadius},${cornerRadius} 0 0 1 ${cornerRadius},${cornerRadius}
              v${height - 2 * cornerRadius}
              a${cornerRadius},${cornerRadius} 0 0 1 -${cornerRadius},${cornerRadius}
              h-${width - 2 * cornerRadius}
              a${cornerRadius},${cornerRadius} 0 0 1 -${cornerRadius},-${cornerRadius}
              v-${height - 2 * cornerRadius}
              a${cornerRadius},${cornerRadius} 0 0 1 ${cornerRadius},-${cornerRadius}
              z
            `;
            groupPathData[group.id] = pathString.trim();
        });


        groupLayer.selectAll<SVGPathElement, DiagramData['groups'][number]>('path')
            .data(data.groups || [], d => d.id)
            .join('path')
            .attr('d', d => groupPathData[d.id] || '')
            .attr('fill', 'rgba(255, 255, 255, 0.05)')
            .attr('stroke', 'rgba(255, 255, 255, 0.05)')
            .attr('stroke-width', 20)
            .attr('stroke-linejoin', 'round')
            .style('pointer-events', 'none');
        
        // Update group labels
        groupLayer.selectAll<SVGTextElement, DiagramData['groups'][number]>('text')
            .data(data.groups || [], d => d.id)
            .join('text')
            .text(d => d.label)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .attr('fill', '#e5e7eb') // gray-200
            .style('font-size', '16px')
            .style('letter-spacing', '0.05em')
            .attr('x', d => {
                const groupNodes = d.nodeIds
                    .map(id => nodes.find(n => n.id === id))
                    .filter((n): n is Node => !!n && n.x !== undefined);
                if (groupNodes.length === 0) return -9999;
                const xCoords = groupNodes.map(n => n.x!);
                return d3.mean(xCoords);
            })
            .attr('y', d => {
                 const groupNodes = d.nodeIds
                    .map(id => nodes.find(n => n.id === id))
                    .filter((n): n is Node => !!n && n.y !== undefined);
                if (groupNodes.length === 0) return -9999;
                const yCoords = groupNodes.map(n => n.y!);
                return (d3.min(yCoords) || 0) - groupPadding;
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

  }, [data, pendingLink, viewMode, appMode, componentTypes, onDropNode, onAddNodeAndLink, onTraceUpstream]);

  return (
    <svg ref={svgRef} className="w-full h-full bg-transparent select-none"></svg>
  );
});

Diagram.displayName = 'Diagram';

export default Diagram;
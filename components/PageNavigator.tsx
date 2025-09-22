import React from 'react';
import type { Page } from '../types';

interface PageNavigatorProps {
    pages: Page[];
    currentPageId: string;
    onPageChange: (pageId: string) => void;
}

const PageNavigator: React.FC<PageNavigatorProps> = ({ pages, currentPageId, onPageChange }) => {
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="page-select" className="text-sm font-medium text-slate-400">View:</label>
            <select 
                id="page-select"
                value={currentPageId}
                onChange={(e) => onPageChange(e.target.value)}
                className="bg-slate-900/50 border border-slate-700 rounded-md p-1.5 text-sm text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
                <option key="__global__" value="__global__">Global View</option>
                <optgroup label="Pages">
                    {pages.map(page => (
                        <option key={page.id} value={page.id}>{page.label}</option>
                    ))}
                </optgroup>
            </select>
        </div>
    );
};

export default PageNavigator;
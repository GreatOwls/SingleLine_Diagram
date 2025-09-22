
// This file is illustrative. The Diagram component uses a simplified d3-drawn representation
// instead of these React components because integrating JSX rendering within D3 is complex.
// However, these components are structured for completeness.

import React from 'react';

interface IconProps {
  size: number;
}

export const GeneratorIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2v4"></path>
    <path d="M12 18v4"></path>
    <path d="m4.93 4.93 2.83 2.83"></path>
    <path d="m16.24 16.24 2.83 2.83"></path>
    <path d="m4.93 19.07 2.83-2.83"></path>
    <path d="m16.24 7.76 2.83-2.83"></path>
  </svg>
);

export const TransformerIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="4"></circle>
    <circle cx="18" cy="12" r="4"></circle>
    <line x1="6" y1="12" x2="18" y2="12"></line>
  </svg>
);

export const BusIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="10" width="20" height="4" rx="1"></rect>
  </svg>
);

export const LoadIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V18"></path>
    <path d="M12 18H6L12 2L18 18H12Z"></path>
  </svg>
);

export const BreakerIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="14" rx="2"></rect>
    <path d="M5 12H2"></path>
    <path d="M19 12h3"></path>
  </svg>
);

export const UnknownIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

'use client';

import { useState } from 'react';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
    return (
        <div className="border-b border-slate-200">
            <nav className="flex gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
              px-4 py-3 font-medium text-sm border-b-2 transition-colors
              ${activeTab === tab.id
                                ? 'border-orange-500 text-orange-600'
                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                            }
            `}
                    >
                        <div className="flex items-center gap-2">
                            {tab.icon}
                            {tab.label}
                        </div>
                    </button>
                ))}
            </nav>
        </div>
    );
}

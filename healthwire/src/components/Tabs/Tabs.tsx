import React, { useEffect, useState, type ComponentType } from 'react';

export type TabConfig = {
  title: string;
  Content: ComponentType;
};

type TabsProps = {
  tabs: TabConfig[];
  defaultTab?: string;
  className?: string;
};

const Tabs = ({ tabs, defaultTab, className }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab((prev) => {
      if (!Array.isArray(tabs) || tabs.length === 0) return prev;
      const titles = tabs.map((t) => t.title);
      if (titles.includes(prev ?? '')) return prev;
      if (defaultTab && titles.includes(defaultTab)) return defaultTab;
      return titles[0];
    });
  }, [tabs, defaultTab]);

  if (!Array.isArray(tabs) || tabs.length === 0) {
    return <div className="text-sm text-slate-500">No tabs available for your permissions.</div>;
  }

  const Active = tabs.find((t) => t.title === activeTab)?.Content;

  return (
    <div>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.title}
            type="button"
            className={`py-2 ${className ?? ''} ${
              activeTab === tab.title ? 'border-b-4 border-primary w-full text-black' : 'bg-white w-full'
            }`}
            onClick={() => setActiveTab(tab.title)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="mt-4">{Active ? <Active key={activeTab} /> : null}</div>
    </div>
  );
};

export default Tabs;

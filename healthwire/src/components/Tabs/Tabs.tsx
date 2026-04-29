import React, { useEffect, useState } from "react";

const Tabs = ({ tabs, defaultTab ,className}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab((prev) => {
      if (!Array.isArray(tabs) || tabs.length === 0) return prev;
      const titles = tabs.map((t) => t.title);
      if (titles.includes(prev)) return prev;
      if (defaultTab && titles.includes(defaultTab)) return defaultTab;
      return titles[0];
    });
  }, [tabs, defaultTab]);

  if (!Array.isArray(tabs) || tabs.length === 0) {
    return <div className="text-sm text-slate-500">No tabs available for your permissions.</div>;
  }





  return (
    <div>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.title}
            className={` py-2 ${className} ${
              activeTab === tab.title ? " border-b-4 border-primary  w-full text-black" : "bg-white  w-full"
            }`}
            onClick={() => setActiveTab(tab.title)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.title}
            className={activeTab === tab.title ? "" : "hidden"}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
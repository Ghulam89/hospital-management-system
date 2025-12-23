import React, { useState } from "react";

const Tabs = ({ tabs, defaultTab ,className}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);





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
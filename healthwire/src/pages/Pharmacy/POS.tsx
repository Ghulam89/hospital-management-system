import React, { useState } from 'react';
import POSInvoiceComponent from './POS/index';
import BillsList from './POS/BillsList';

const POSWrapper = () => {
  const [tab, setTab] = useState<'pos' | 'bills'>('pos');
  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded shadow flex gap-2">
        <button
          className={`px-4 py-2 rounded ${tab === 'pos' ? 'bg-primary text-white' : 'border'}`}
          onClick={() => setTab('pos')}
        >
          POS
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'bills' ? 'bg-primary text-white' : 'border'}`}
          onClick={() => setTab('bills')}
        >
          Bills
        </button>
      </div>
      {tab === 'pos' ? <POSInvoiceComponent /> : <BillsList />}
    </div>
  );
};

export default POSWrapper;

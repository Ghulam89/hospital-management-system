import React, { useState, useEffect } from 'react';
import Select2 from 'react-select2-wrapper';
import 'select2/dist/css/select2.min.css';
import $ from 'jquery';
import 'select2';

interface Option {
  id: string;
  text: string;
}

interface Select2DropdownProps {
  options: Option[];
}

const Select2Dropdown: React.FC<Select2DropdownProps> = ({ options }) => {
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleSelectChange = (e: any) => {  // use `any` for Select2 event
    const value = e.target.value;
    setSelectedValue(value);
  };

  useEffect(() => {
    // Ensure jQuery is attached to the window object
    if (!window.$) {
      window.$ = $;
    }
  }, []);

  return (
    <div className="select2-dropdown-container p-4">
      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-white">
        Select2 Dropdown
      </label>
      <Select2
        data={options}
        value={selectedValue}
        onChange={handleSelectChange}
        options={{
          placeholder: 'Select an option',
          allowClear: true,
        }}
        className="form-control w-full p-2 border border-gray-300 rounded-md"
      />
      <div className="mt-3 text-gray-700 dark:text-white">
        Selected Value: {selectedValue}
      </div>
    </div>
  );
};

export default Select2Dropdown;

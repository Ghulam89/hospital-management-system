import React from 'react';
import { DatePicker } from 'antd';
import moment from 'moment';

const { RangePicker } = DatePicker;

const CustomDateRangePicker = ({ value, onChange }) => {
  // Function to disable dates in the past
  const disabledDate = (current) => {
    // Can not select days before today
    return current && current < moment().startOf('day');
  };

  return (
    <RangePicker
      value={value}
      onChange={onChange}
      format="DD/MM/YYYY"
      style={{ width: '100%' }}
      allowClear={false}
      disabledDate={disabledDate}
      getPopupContainer={trigger => trigger.parentNode}
      popupStyle={{
        // Custom styles for the dropdown
        zIndex: 9999,
      }}
      renderExtraFooter={() => (
        <div style={{ padding: '10px', textAlign: 'center' }}>
          Select date range
        </div>
      )}
    />
  );
};

export default CustomDateRangePicker;
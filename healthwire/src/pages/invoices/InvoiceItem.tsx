import React from 'react';
import { FaTrash } from 'react-icons/fa';

interface InvoiceItemProps {
  id: number;
  procedure: string;
  rate: number;
  quantity: number;
  onDelete: (id: number) => void;
  onQuantityChange: (id: number, quantity: number) => void;
}

const InvoiceItem = ({ id, procedure, rate, quantity, onDelete, onQuantityChange }: InvoiceItemProps) => {
  return (
    <tr className="border-b">
      <td className="p-3">{procedure}</td>
      <td className="p-3">{rate}</td>
      <td className="p-3">
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => onQuantityChange(id, parseInt(e.target.value) || 1)}
          className="w-20 p-1 border rounded"
        />
      </td>
      <td className="p-3">{rate * quantity}</td>
      <td className="p-3">
        <button
          onClick={() => onDelete(id)}
          className="text-red-500 hover:text-red-700"
        >
          <FaTrash />
        </button>
      </td>
    </tr>
  );
};

export default InvoiceItem;
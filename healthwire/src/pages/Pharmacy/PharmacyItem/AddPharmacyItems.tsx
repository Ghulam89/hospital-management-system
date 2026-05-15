import { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import { ScanBarcode } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Base_url } from '../../../utils/Base_url';
import 'react-datepicker/dist/react-datepicker.css';
import BarcodeScanner from '../../../components/BarcodeScanner';

const AddPharmacyItems = ({ 
  isModalOpen, 
  setIsModalOpen, 
  selectedItem, 
  fetchItems,
  racks,
  manufacturers,
  suppliers,
  categories
}) => {
  const [formData, setFormData] = useState({
    name: '',
    pharmRackId: null,
    barcode: '',
    alternateBarcodes: [],
    pharmManufacturerId: null,
    pharmSupplierId: null,
    pharmCategoryId: null,
    unit: '',
    conversionUnit: 1,
    reOrderLevel: 0,
    retailPrice: 0,
    openingStock: 0,
    drugInteraction: [],
    genericName: '',
    unitCost: 0,
    pieceCost: 0,
    availableQuantity: 0,
    expiredQuantity: 0,
    narcotic: false,
    active: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [newDrugInteraction, setNewDrugInteraction] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [newAlternateBarcode, setNewAlternateBarcode] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [isNameSuggestionsLoading, setIsNameSuggestionsLoading] = useState(false);

  useEffect(() => {
    if (selectedItem) {
      setFormData({
        name: selectedItem.name || '',
        pharmRackId: selectedItem.pharmRackId || null,
        barcode: selectedItem.barcode || '',
        alternateBarcodes: selectedItem.alternateBarcodes || [],
        pharmManufacturerId: selectedItem.pharmManufacturerId || null,
        pharmSupplierId: selectedItem.pharmSupplierId || null,
        pharmCategoryId: selectedItem.pharmCategoryId || null,
        unit: selectedItem.unit || '',
        conversionUnit: selectedItem.conversionUnit || 1,
        reOrderLevel: selectedItem.reOrderLevel || 0,
        retailPrice: selectedItem.retailPrice || 0,
        openingStock: selectedItem.openingStock || 0,
        drugInteraction: selectedItem.drugInteraction || [],
        genericName: selectedItem.genericName || '',
        unitCost: selectedItem.unitCost || 0,
        pieceCost: selectedItem.pieceCost || 0,
        availableQuantity: selectedItem.availableQuantity || 0,
        expiredQuantity: selectedItem.expiredQuantity || 0,
        narcotic: selectedItem.narcotic || false,
        active: selectedItem.active !== undefined ? selectedItem.active : true
      });
    } else {
      setFormData({
        name: '',
        pharmRackId: null,
        barcode: '',
        alternateBarcodes: [],
        pharmManufacturerId: null,
        pharmSupplierId: null,
        pharmCategoryId: null,
        unit: '',
        conversionUnit: 1,
        reOrderLevel: 0,
        retailPrice: 0,
        openingStock: 0,
        drugInteraction: [],
        genericName: '',
        unitCost: 0,
        pieceCost: 0,
        availableQuantity: 0,
        expiredQuantity: 0,
        narcotic: false,
        active: true
      });
    }
  }, [selectedItem, isModalOpen]);

  useEffect(() => {
    let active = true;
    const query = String(formData.name || '').trim();

    if (!isModalOpen || selectedItem || query.length < 2) {
      setNameSuggestions([]);
      setIsNameSuggestionsLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsNameSuggestionsLoading(true);
        const res = await axios.get(`${Base_url}/apis/pharmItem/get`, {
          params: { search: query, page: 1, limit: 10 },
        });
        const list = res?.data?.data || [];
        if (active) {
          setNameSuggestions(Array.isArray(list) ? list : []);
        }
      } catch {
        if (active) {
          setNameSuggestions([]);
        }
      } finally {
        if (active) {
          setIsNameSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [formData.name, isModalOpen, selectedItem]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const allowNegative = name === 'openingStock' && !!selectedItem;
    const pattern = allowNegative ? /^-?[0-9]*\.?[0-9]*$/ : /^[0-9]*\.?[0-9]*$/;
    if (value === '' || pattern.test(value)) {
      const numValue = value === '' ? 0 : parseFloat(value);
      
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        
        // Auto-calculate Piece Cost from Unit Cost (Pack)
        if (name === 'unitCost' && numValue > 0 && prev.conversionUnit > 0) {
          updated.pieceCost = (numValue / prev.conversionUnit).toFixed(2);
        }
        
        // Auto-calculate Unit Cost (Pack) from Piece Cost
        if (name === 'pieceCost' && numValue > 0 && prev.conversionUnit > 0) {
          updated.unitCost = (numValue * prev.conversionUnit).toFixed(2);
        }
        
        // Update conversion unit and recalculate costs
        if (name === 'conversionUnit' && numValue > 0) {
          if (prev.unitCost > 0) {
            updated.pieceCost = (prev.unitCost / numValue).toFixed(2);
          } else if (prev.pieceCost > 0) {
            updated.unitCost = (prev.pieceCost * numValue).toFixed(2);
          }
          if (!selectedItem && Number(prev.openingStock) > 0) {
            updated.availableQuantity = (Number(prev.openingStock) * numValue).toString();
          }
        }
        
        if (name === 'openingStock' && !selectedItem) {
          const conv = Number(prev.conversionUnit) || 1;
          updated.availableQuantity = (numValue * conv).toString();
        }

        // Validate Retail Price should not be below Cost Price
        if (name === 'retailPrice' && numValue > 0 && prev.unitCost > 0 && numValue < prev.unitCost) {
          toast.warning('Retail Price should not be below Unit Cost (Pack)');
        }
        
        return updated;
      });
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addDrugInteraction = () => {
    if (newDrugInteraction.trim() && !formData.drugInteraction.includes(newDrugInteraction)) {
      setFormData(prev => ({
        ...prev,
        drugInteraction: [...prev.drugInteraction, newDrugInteraction]
      }));
      setNewDrugInteraction('');
    }
  };

  const removeDrugInteraction = (interaction) => {
    setFormData(prev => ({
      ...prev,
      drugInteraction: prev.drugInteraction.filter(item => item !== interaction)
    }));
  };

  const addAlternateBarcode = () => {
    const value = newAlternateBarcode.trim();
    if (!value) {
      return;
    }
    setFormData(prev => {
      const existing = prev.alternateBarcodes || [];
      if (existing.length >= 8 || existing.includes(value)) {
        return prev;
      }
      return {
        ...prev,
        alternateBarcodes: [...existing, value]
      };
    });
    setNewAlternateBarcode('');
  };

  const removeAlternateBarcode = (code) => {
    setFormData(prev => ({
      ...prev,
      alternateBarcodes: (prev.alternateBarcodes || []).filter(item => item !== code)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter item name');
      return;
    }

    setIsLoading(true);

    try {
      // Convert object IDs to just IDs if they're objects
      // Also clean the data - remove empty strings and convert to proper types
      const payload: any = {
        name: formData.name.trim(),
        pharmRackId: formData.pharmRackId?._id || formData.pharmRackId || null,
        barcode: formData.barcode || null,
        alternateBarcodes: formData.alternateBarcodes || [],
        pharmManufacturerId: formData.pharmManufacturerId?._id || formData.pharmManufacturerId || null,
        pharmCategoryId: formData.pharmCategoryId?._id || formData.pharmCategoryId || null,
        unit: formData.unit || null,
        conversionUnit: Number(formData.conversionUnit) || 1,
        reOrderLevel: Number(formData.reOrderLevel) || 0,
        retailPrice: Number(formData.retailPrice) || 0,
        openingStock: Number(formData.openingStock) || 0,
        drugInteraction: formData.drugInteraction || [],
        genericName: formData.genericName || null,
        unitCost: Number(formData.unitCost) || 0,
        pieceCost: Number(formData.pieceCost) || 0,
        expiredQuantity: Number(formData.expiredQuantity) || 0,
        narcotic: Boolean(formData.narcotic),
        active: Boolean(formData.active)
      };

      // Only include availableQuantity when user has explicitly changed it
      const aq = Number(formData.availableQuantity) || 0;
      const origAq = Number(selectedItem?.availableQuantity) || 0;
      if (!selectedItem) {
        if (aq > 0) payload.availableQuantity = aq;
      } else {
        if (aq !== origAq) payload.availableQuantity = aq;
      }

      console.log('Submitting payload:', payload);

      const request = selectedItem
        ? axios.put(`${Base_url}/apis/pharmItem/update/${selectedItem._id}`, payload)
        : axios.post(`${Base_url}/apis/pharmItem/create`, payload);

      const res = await request;

      if (res.data.status === 'ok') {
        toast.success(`Item ${selectedItem ? 'updated' : 'added'} successfully`);
        setIsModalOpen(false);
        fetchItems();
      } else {
        toast.error(res.data.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save Item';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="800px">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {selectedItem ? 'Edit Pharmacy Item' : 'Add New Pharmacy Item'}
        </h1>
        <MdClose 
          onClick={() => setIsModalOpen(false)} 
          size={24} 
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        />
      </div>
      
      <hr className="border-gray dark:border-gray-700" />
      
      <form onSubmit={handleSubmit}>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Information */}
          <div className="col-span-2">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter item name..."
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
                {isNameSuggestionsLoading && (
                  <div className="mt-1 text-xs text-gray-500">Searching matching items...</div>
                )}
                {!isNameSuggestionsLoading && nameSuggestions.length > 0 && !selectedItem && (
                  <div className="mt-2 border rounded bg-white dark:bg-gray-800 max-h-40 overflow-auto shadow-sm">
                    {nameSuggestions.map((item: any) => (
                      <button
                        key={item?._id || item?.name}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, name: item?.name || prev.name }));
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-800 dark:text-gray-100">{item?.name}</span>
                          <span className="text-xs text-gray-500">
                            {(item?.pharmManufacturerId?.name || item?.pharmManufacturerId) ? (item?.pharmManufacturerId?.name || item?.pharmManufacturerId) : ''}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 p-3 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  💡 <strong>Tip:</strong> When adding opening stock, available quantity will be automatically set to the same value.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Barcode
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      placeholder="Barcode or scan..."
                      className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScanner(true)}
                      className="inline-flex items-center justify-center rounded border-[1.5px] border-stroke bg-gray-50 dark:bg-gray-800 px-4 py-3 text-primary hover:bg-primary hover:text-white transition-colors"
                      title="Scan barcode"
                    >
                      <ScanBarcode size={22} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    name="genericName"
                    value={formData.genericName}
                    onChange={handleChange}
                    placeholder="Generic name..."
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alternate Barcodes (up to 8)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAlternateBarcode}
                    onChange={(e) => setNewAlternateBarcode(e.target.value)}
                    placeholder="Add alternate barcode"
                    className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addAlternateBarcode}
                    disabled={!newAlternateBarcode.trim() || (formData.alternateBarcodes || []).length >= 8}
                    className="inline-flex items-center justify-center rounded border-[1.5px] border-stroke bg-gray-50 dark:bg-gray-800 px-4 py-3 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                {formData.alternateBarcodes && formData.alternateBarcodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.alternateBarcodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs text-gray-800 dark:text-gray-100"
                      >
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => removeAlternateBarcode(code)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reference Data */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">References</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rack
                </label>
                <select
                  name="pharmRackId"
                  value={formData.pharmRackId?._id || formData.pharmRackId || ''}
                  onChange={(e) => handleSelectChange('pharmRackId', e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select Rack</option>
                  {racks.map(rack => (
                    <option key={rack._id} value={rack._id}>{rack.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Manufacturer
                </label>
                <select
                  name="pharmManufacturerId"
                  value={formData.pharmManufacturerId?._id || formData.pharmManufacturerId || ''}
                  onChange={(e) => handleSelectChange('pharmManufacturerId', e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map(mfg => (
                    <option key={mfg._id} value={mfg._id}>{mfg.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stock & Pricing */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Stock & Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="Unit (e.g., tablet, ml)"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                {/* <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity/Pack
                  </label>
                  <input
                    type="number"
                    name="conversionUnit"
                    value={formData.conversionUnit}
                    onChange={handleNumberChange}
                    placeholder="Quantity per pack"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div> */}

<div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Re-order Level
                  </label>
                  <input
                    type="number"
                    name="reOrderLevel"
                    value={formData.reOrderLevel}
                    onChange={handleNumberChange}
                    placeholder="Re-order level"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Retail Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="retailPrice"
                    value={formData.retailPrice}
                    onChange={handleNumberChange}
                    placeholder="Retail price"
                    min={0}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    name="openingStock"
                    value={formData.openingStock}
                    onChange={handleNumberChange}
                    placeholder="Opening stock"
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit Cost (Pack)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="unitCost"
                    value={formData.unitCost}
                    onChange={handleNumberChange}
                    placeholder="Cost per pack"
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                 <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Piece Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="pieceCost"
                    value={formData.pieceCost}
                    onChange={handleNumberChange}
                    placeholder="Cost per piece"
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available Quantity
                  </label>
                  <input
                    type="number"
                    name="availableQuantity"
                    value={formData.availableQuantity}
                    placeholder="Auto-set from opening stock"
                    className="w-full rounded border-[1.5px] border-stroke bg-gray-100 py-3 px-5 text-gray-600 outline-none cursor-not-allowed dark:border-form-strokedark dark:bg-gray-800 dark:text-gray-400"
                    title="This field is locked and automatically calculated"
                    disabled
                    readOnly
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expired Quantity
                  </label>
                  <input
                    type="number"
                    name="expiredQuantity"
                    value={formData.expiredQuantity}
                    placeholder="Expired quantity"
                    className="w-full rounded border-[1.5px] border-stroke bg-gray-100 py-3 px-5 text-gray-600 outline-none cursor-not-allowed dark:border-form-strokedark dark:bg-gray-800 dark:text-gray-400"
                    title="This field is locked and automatically calculated"
                    disabled
                    readOnly
                  />
                </div>
              </div>
              
             
              
              
            </div>
          </div>

          {/* Additional Information */}
          <div className="col-span-2">
            <h2 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Additional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  name="pharmCategoryId"
                  value={formData.pharmCategoryId?._id || formData.pharmCategoryId || ''}
                  onChange={(e) => handleSelectChange('pharmCategoryId', e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drug Interactions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDrugInteraction}
                    onChange={(e) => setNewDrugInteraction(e.target.value)}
                    placeholder="Add drug interaction"
                    className="flex-1 rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addDrugInteraction}
                    className="px-4 bg-primary text-white rounded hover:bg-opacity-90"
                  >
                    Add
                  </button>
                </div>
                {formData.drugInteraction.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.drugInteraction.map((interaction, index) => (
                      <span key={index} className="inline-flex items-center bg-gray-100 px-2 py-1 rounded text-sm">
                        {interaction}
                        <button
                          type="button"
                          onClick={() => removeDrugInteraction(interaction)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="narcotic"
                    checked={formData.narcotic}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Narcotic Item</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div className="col-span-2 pt-4">
            <button 
              type="submit" 
              className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {selectedItem ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                selectedItem ? 'Update Item' : 'Add Item'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
    <BarcodeScanner
      isOpen={showBarcodeScanner}
      onClose={() => setShowBarcodeScanner(false)}
      onScan={(code) => {
        setFormData(prev => ({
          ...prev,
          barcode: code
        }));
      }}
      title="Scan Item Barcode"
    />
    </>
  );
};

export default AddPharmacyItems;

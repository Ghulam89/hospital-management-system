import React, { useState, useEffect } from 'react';
import Modal from '../../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { Base_url } from '../../../utils/Base_url';

interface UploadPharmacyItemProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  fetchItems?: () => void;
  selectedItem?: any;
  racks?: any[];
  manufacturers?: any[];
  suppliers?: any[];
  categories?: any[];
}

const UploadPharmacyItem: React.FC<UploadPharmacyItemProps> = (props) => {
  const {
    isModalOpen,
    setIsModalOpen,
    fetchItems,
    selectedItem,
    racks = [],
    manufacturers = [],
    suppliers = [],
    categories = [],
  } = props;
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [autoDetectCategory, setAutoDetectCategory] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({
    processed: 0,
    success: 0,
    failed: 0,
    total: 0,
    isUploading: false
  });

  // Handle file upload in batches
  const BATCH_SIZE = 500; // Process 50 items at a time
  const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Reset previous data
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setTotalRows(0);
    setSelectedCategory(null);
    setUploadProgress({
      processed: 0,
      success: 0,
      failed: 0,
      total: 0,
      isUploading: false
    });

    setFile(selectedFile);

    // Try to auto-detect category from file name
    if (autoDetectCategory && categories.length > 0) {
      const fileName = selectedFile.name.toLowerCase().replace(/\.(xls|xlsx)$/i, '').trim();
      const matchedCategory = categories.find((cat: any) => 
        cat.name && fileName.includes(cat.name.toLowerCase())
      );
      if (matchedCategory) {
        setSelectedCategory(matchedCategory);
      }
    }

    try {
      const data = await readExcelFile(selectedFile) as any[];
      if (data && data.length > 0) {
        // Get headers from first row
        const excelHeaders = Object.keys(data[0]).filter(key => key !== '__rowNum__');
        setHeaders(excelHeaders);
        setTotalRows(data.length);
        // Show first 5 rows for preview
        setPreviewData(data.slice(0, 5));
      } else {
        toast.warning('No data found in the Excel file');
      }
    } catch (error) {
      toast.error('Error reading Excel file. Please ensure it is a valid Excel file.');
      console.error('Excel read error:', error);
    }
  };

  const readExcelFile = (file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target && e.target.result ? e.target.result as ArrayBuffer : new ArrayBuffer(0));
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

          // Try to find header row, or use first row
          let headerRowIndex = 0;
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            defval: ''
          });

          // Look for common header patterns
          for (let i = 0; i < Math.min(5, rows.length); i++) {
            const row = rows[i];
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('name') || rowStr.includes('product') || rowStr.includes('item')) {
              headerRowIndex = i;
              break;
            }
          }

          const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, {
            defval: '',
            range: headerRowIndex
          });

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // Helper function to find column value by multiple possible names
  const getColumnValue = (row: any, possibleNames: string[]): string => {
    for (const name of possibleNames) {
      // Try exact match first
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return String(row[name]).trim();
      }
      // Try case-insensitive match
      const foundKey = Object.keys(row).find(key => 
        key.toLowerCase() === name.toLowerCase()
      );
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
        return String(row[foundKey]).trim();
      }
    }
    return '';
  };

  const processData = (data: any[]) => {
    return data.map((row: any) => {
      // Map Excel columns to pharmacy item fields
      const name = getColumnValue(row, ['Name', 'Product Name', 'Item Name', 'Product', 'Item']);
      const retailPrice = getColumnValue(row, ['Retail Price', 'Price', 'Selling Price', 'MRP', 'Rate']);
      const unitCost = getColumnValue(row, ['Unit Cost', 'Cost', 'Purchase Price', 'Buying Price', 'Cost Price']);
      const barcode = getColumnValue(row, ['Barcode', 'Barcode Number', 'Code', 'SKU']);
      const unit = getColumnValue(row, ['Unit', 'UOM', 'Unit of Measure']);
      const genericName = getColumnValue(row, ['Generic Name', 'Generic', 'Generic Name']);
      const openingStock = getColumnValue(row, ['Opening Stock', 'Stock', 'Quantity', 'Qty', 'Initial Stock']);
      const reOrderLevel = getColumnValue(row, ['Reorder Level', 'Min Stock', 'Minimum Stock', 'Reorder']);
      const categoryName = getColumnValue(row, ['Category', 'Category Name', 'Product Category']);
      const manufacturerName = getColumnValue(row, ['Manufacturer', 'Manufacturer Name', 'Brand', 'Company']);
      const supplierName = getColumnValue(row, ['Supplier', 'Supplier Name', 'Vendor']);
      const rackName = getColumnValue(row, ['Rack', 'Rack Name', 'Shelf', 'Location']);

      if (!name) {
        return null; // Skip rows without name
      }

      // Find category - use selected category, or try to find from Excel, or use first available
      let categoryId = null;
      if (selectedCategory) {
        categoryId = selectedCategory._id || selectedCategory;
      } else if (categoryName && categories.length > 0) {
        const foundCategory = categories.find((cat: any) => 
          cat.name && cat.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (foundCategory) {
          categoryId = foundCategory._id || foundCategory;
        }
      }

      // Find manufacturer
      let manufacturerId = null;
      if (manufacturerName && manufacturers.length > 0) {
        const foundManufacturer = manufacturers.find((man: any) => 
          man.name && man.name.toLowerCase() === manufacturerName.toLowerCase()
        );
        if (foundManufacturer) {
          manufacturerId = foundManufacturer._id || foundManufacturer;
        }
      }

      // Find supplier
      let supplierId = null;
      if (supplierName && suppliers.length > 0) {
        const foundSupplier = suppliers.find((sup: any) => 
          sup.name && sup.name.toLowerCase() === supplierName.toLowerCase()
        );
        if (foundSupplier) {
          supplierId = foundSupplier._id || foundSupplier;
        }
      }

      // Find rack
      let rackId = null;
      if (rackName && racks.length > 0) {
        const foundRack = racks.find((rack: any) => 
          rack.name && rack.name.toLowerCase() === rackName.toLowerCase()
        );
        if (foundRack) {
          rackId = foundRack._id || foundRack;
        }
      }

      // Parse numeric values
      const parsedRetailPrice = retailPrice ? parseFloat(retailPrice.replace(/,/g, '')) || 0 : 0;
      const parsedUnitCost = unitCost ? parseFloat(unitCost.replace(/,/g, '')) || 0 : 0;
      const parsedOpeningStock = openingStock ? parseFloat(openingStock.replace(/,/g, '')) || 0 : 0;
      const parsedReOrderLevel = reOrderLevel ? parseFloat(reOrderLevel.replace(/,/g, '')) || 0 : 0;

      return {
        name: name,
        retailPrice: parsedRetailPrice,
        unitCost: parsedUnitCost,
        barcode: barcode || null,
        unit: unit || 'pack',
        genericName: genericName || null,
        openingStock: parsedOpeningStock,
        availableQuantity: parsedOpeningStock, // Initialize from opening stock
        reOrderLevel: parsedReOrderLevel,
        pharmCategoryId: categoryId,
        pharmManufacturerId: manufacturerId,
        pharmSupplierId: supplierId,
        pharmRackId: rackId,
        active: true,
        departmentName: 'Pharmacy' // Default department for pharmacy items
      };
    }).filter(item => item !== null);
  };

  const processBatch = async (items: any[], batchIndex: number): Promise<{success: number, failed: number}> => {
    let success = 0;
    let failed = 0;

    // Process items in parallel but limited concurrency
    const concurrencyLimit = 100; // Process 10 items at a time within batch
    const chunks = [];
    
    for (let i = 0; i < items.length; i += concurrencyLimit) {
      chunks.push(items.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(item => 
          axios.post(`${Base_url}/apis/pharmItem/createExcel`, item)
            .then(() => ({ success: true }))
            .catch(e => ({ 
              success: false, 
              error: e,
              itemName: item.name 
            }))
        )
      );

      results.forEach(result => {
        if (result.success) {
          success++;
        } else {
          failed++;
          console.error('Failed to upload item:', result.itemName, result.error);
        }
      });

      // Update progress
      setUploadProgress(prev => ({
        ...prev,
        processed: prev.processed + chunk.length,
        success: prev.success + success,
        failed: prev.failed + failed
      }));

      // Small delay between chunks to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { success, failed };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }

    if (!selectedCategory && categories.length > 0) {
      toast.warning('Please select a category or ensure categories are available');
      return;
    }

    setIsLoading(true);
    setUploadProgress({
      processed: 0,
      success: 0,
      failed: 0,
      total: 0,
      isUploading: true
    });

    try {
      const data = await readExcelFile(file);
      const items = processData(data);

      if (items.length === 0) {
        toast.error('No valid items found in Excel file. Please check the file format.');
        setIsLoading(false);
        setUploadProgress(prev => ({ ...prev, isUploading: false }));
        return;
      }

      // Set total items
      setUploadProgress(prev => ({ ...prev, total: items.length }));

      // Split items into batches
      const batches = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
      }

      let totalSuccess = 0;
      let totalFailed = 0;

      // Process batches sequentially with delay
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);
        
        const result = await processBatch(batch, batchIndex);
        totalSuccess += result.success;
        totalFailed += result.failed;

        // Delay between batches (except for last batch)
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }

      // Final summary
      if (totalFailed > 0) {
        toast.warning(`Upload completed: ${totalSuccess} successful, ${totalFailed} failed`);
      } else {
        toast.success(`Successfully uploaded ${totalSuccess} pharmacy items`);
      }

      if (totalSuccess > 0) {
        setIsModalOpen(false);
        if (fetchItems) {
          // Wait a bit before refreshing to ensure data is saved
          setTimeout(() => fetchItems(), 1000);
        }
      }

      resetForm();

    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Upload failed');
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
      setUploadProgress(prev => ({ ...prev, isUploading: false }));
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setTotalRows(0);
    setSelectedCategory(null);
    setUploadProgress({
      processed: 0,
      success: 0,
      failed: 0,
      total: 0,
      isUploading: false
    });
    // Reset file input
    const input = document.getElementById('excel-file-input') as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  };

  const cancelUpload = () => {
    if (window.confirm('Are you sure you want to cancel the upload?')) {
      setIsLoading(false);
      setUploadProgress(prev => ({ ...prev, isUploading: false }));
      resetForm();
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="800px">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Upload Pharmacy Items from Excel
        </h1>
        <MdClose 
          onClick={() => {
            setIsModalOpen(false);
            resetForm();
          }} 
          size={24} 
          className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        />
      </div>
      
      <hr className="border-gray dark:border-gray-700" />
      
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Upload Progress Display */}
          {/* {uploadProgress.isUploading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Uploading items...
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {uploadProgress.processed} / {uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                <span>Successful: {uploadProgress.success}</span>
                <span>Failed: {uploadProgress.failed}</span>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-xs px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
          )} */}

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Excel File <span className="text-red-500">*</span>
            </label>
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              required
              disabled={isLoading || uploadProgress.isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported columns: Name, Retail Price, Unit Cost, Barcode, Unit, Generic Name, Opening Stock, Reorder Level, Category, Manufacturer, Supplier, Rack
            </p>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategory?._id || selectedCategory || ''}
                onChange={(e) => {
                  const cat = categories.find((c: any) => (c._id || c) === e.target.value);
                  setSelectedCategory(cat || null);
                }}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                required
                disabled={isLoading || uploadProgress.isUploading}
              >
                <option value="">Select Category</option>
                {categories.map((cat: any) => (
                  <option key={cat._id || cat} value={cat._id || cat}>
                    {cat.name || cat}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Category will be applied to all items in the Excel file
              </p>
            </div>
          )}

          {/* {previewData.length > 0 && !uploadProgress.isUploading && (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview ({totalRows} rows found)
              </label>
              <div className="overflow-x-auto max-h-60 border border-stroke rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                    <tr>
                      {headers.map((header, idx) => (
                        <th key={idx} className="px-3 py-2 text-left border-b">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b">
                        {headers.map((header, colIdx) => (
                          <td key={colIdx} className="px-3 py-1">{row[header] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )} */}
         
          <div className="pt-2">
            <button 
              type="submit" 
              className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploadProgress.isUploading || isLoading || !file || previewData.length === 0 || (categories.length > 0 && !selectedCategory)}
            >
              {uploadProgress.isUploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading ({uploadProgress.processed}/{uploadProgress.total})
                </span>
              ) : (
                `Upload Items${totalRows > 0 ? ` (${totalRows})` : ''}`
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UploadPharmacyItem;
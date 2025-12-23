import React, { useState, useEffect } from 'react';
import Modal from '../../components/modal';
import { MdClose } from 'react-icons/md';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const UploadExcel = ({ isModalOpen, setIsModalOpen, fetchProcedureData,selectedProcedure }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('https://api.holisticare.pk/apis/department/get');
      setDepartments(response?.data?.data || []);
    } catch (error) {
      toast.error('Failed to fetch departments');
      console.error('Department fetch error:', error);
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) return;

    // Reset previous data
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setTotalRows(0);

    setFile(selectedFile);
    
    try {
      const data = await readExcelFile(selectedFile);
      
      if (data.length > 0) {
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

  const findHeaderRow = (sheet) => {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1, // raw row data
    defval: ''
  });

  // Look for the row which contains 'Procedure Name' and 'Department'
  return rows.findIndex(row => row.includes('Procedure Name') && row.includes('Department'));
};

  const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        const headerRowIndex = findHeaderRow(firstSheet);
        if (headerRowIndex === -1) throw new Error('Header row not found');

        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
          defval: '',
          range: headerRowIndex
        });

        const filteredData = jsonData.filter(row =>
          row['Procedure Name'] && row['Department']
        );

        resolve(filteredData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(new Error('File reading failed'));
    };

    reader.readAsArrayBuffer(file);
  });
};

 const processData = (data) => {
  return data.map(row => {
    const procedureName = String(row['Procedure Name'] || '').trim();
    const price = String(row['Place'] || row['Price'] || '0').trim();
    const departmentName = String(row['Department'] || '').trim();
    const subDepartment = String(row['Sub Department'] || '').trim();
    const description = String(row['Description'] || '').trim();

    if (!procedureName || !departmentName) {
      console.warn(`Missing required data for: ${procedureName}`);
      return null;
    }

    // Find the department in the fetched list (case insensitive)
    const department = departments.find(d => 
      d.name.toLowerCase() === departmentName.toLowerCase()
    );

    if (!department) {
      console.warn(`Department not found in list: ${departmentName}`);
      return null;
    }

    const parsedPrice = parseFloat(price.replace(/,/g, ''));
    if (isNaN(parsedPrice)) {
      console.warn(`Invalid price for: ${procedureName}`);
      return null;
    }

    return {
      name: procedureName, 
      amount: parsedPrice,
      departmentName: department.name, // Use the exact name from database
      subDepartment,
      description
    };
  }).filter(proc => proc !== null);
};


const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!file) {
    toast.error('Please select an Excel file');
    return;
  }

  setIsLoading(true);

  try {
    const data = await readExcelFile(file);
    const procedures = processData(data);

    if (procedures.length === 0) {
      toast.error('No valid procedures found');
      return;
    }

    // Send each procedure individually
    const results = await Promise.all(
      procedures.map(proc => 
        axios.post('https://api.holisticare.pk/apis/procedure/createExcel', {
          name: proc.name,
          amount: proc.amount,
          departmentName: proc.departmentName,
          subDepartment: proc.subDepartment,
          description: proc.description
        }).catch(e => ({ error: e }))
      )
    );

    const successCount = results.filter(r => !r.error).length;
    const failedCount = results.filter(r => r.error).length;

    if (failedCount > 0) {
      toast.warning(`Uploaded ${successCount} procedures, failed ${failedCount}`);
    } else {
      toast.success(`Successfully uploaded ${successCount} procedures`);
    }

    setIsModalOpen(false);
    fetchProcedureData();
    resetForm();

  } catch (error) {
    toast.error(error.response?.data?.message || 'Upload failed');
    console.error('Upload error:', error);
  } finally {
    setIsLoading(false);
  }
};

  const resetForm = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setTotalRows(0);
    // Reset file input
    if (document.getElementById('excel-file-input')) {
      document.getElementById('excel-file-input').value = '';
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} width="800px">
      <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          Upload Procedures from Excel
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
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Note: File should have columns: Procedure Name, Place (Price), Department, Sub Department, Description
            </p>
          </div>
         
          <div className="pt-2">
            <button 
              type="submit" 
              className="flex w-full justify-center rounded-lg bg-primary p-3 font-medium text-white hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !file || previewData.length === 0}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                `Upload Procedures${totalRows > 0 ? ` (${totalRows})` : ''}`
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UploadExcel;
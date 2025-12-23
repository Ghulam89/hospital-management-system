
import React from 'react';

const Modal = ({ isOpen, onClose, children,className }) => {
  return (
    <>
      {isOpen && (
        <div className="fixed   shadow-lg z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-[rgba(0,0,0,0.3)] opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className={`inline-block align-bottom bg-white  text-left overflow-hidden shadow-xl rounded-md transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${className} `}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Modal;
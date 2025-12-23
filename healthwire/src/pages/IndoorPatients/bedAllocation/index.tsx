import React, { useEffect, useState } from 'react';

import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { Base_url } from '../../../utils/Base_url';
import axios from 'axios';
import { AsyncPaginate } from 'react-select-async-paginate';
import { FaBed } from 'react-icons/fa';
import Loader from '../../../common/Loader';

const BedAllocation = () => {
  const [selectedWard, setSelectedWard] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('Wards');
  const [wardDetails, setWardDetails] = useState([]);
  const [roomDetails, setRoomDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch first ward by default
        const wardsResponse = await axios.get(`${Base_url}/apis/ward/get`, {
          params: { page: 1, limit: 1 }
        });
        
        if (wardsResponse.data.data.length > 0) {
          const firstWard = wardsResponse.data.data[0];
          setSelectedWard({ label: firstWard.name, value: firstWard._id });
          fetchWardDetails(firstWard._id);
        }

        // Fetch first room by default
        const roomsResponse = await axios.get(`${Base_url}/apis/room/get`, {
          params: { page: 1, limit: 1 }
        });
        
        if (roomsResponse.data.data.length > 0) {
          const firstRoom = roomsResponse.data.data[0];
          setSelectedRoom({ label: firstRoom.name, value: firstRoom._id });
          fetchRoomDetails(firstRoom._id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const loadWardOptions = async (searchQuery, loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/ward/get`, {
        params: { page, limit: 20, search: searchQuery || "" },
      });

      return {
        options: response.data.data.map(item => ({
          label: item.name,
          value: item._id,
        })),
        hasMore: page < response.data.totalPages,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error("Error fetching wards:", error);
      return { options: [], hasMore: false };
    }
  };

  const loadRoomOptions = async (searchQuery, loadedOptions, { page }) => {
    try {
      const response = await axios.get(`${Base_url}/apis/room/get`, {
        params: { page, limit: 20, search: searchQuery || "" },
      });

      return {
        options: response.data.data.map(item => ({
          label: item.name,
          value: item._id,
        })),
        hasMore: page < response.data.totalPages,
        additional: { page: page + 1 },
      };
    } catch (error) {
      console.error("Error fetching rooms:", error);
      return { options: [], hasMore: false };
    }
  };

  const fetchWardDetails = async (wardId) => {
    if (!wardId) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get(`${Base_url}/apis/bedDetail/get`, {
        params: { wardId }
      });
      console.log(response);
      
      setWardDetails(response?.data?.data || []);
    } catch (error) {
      console.error("Error fetching ward details:", error);
      setWardDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomDetails = async (roomId) => {
    if (!roomId) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get(`${Base_url}/apis/roomDetail/get`, {
        params: { roomId }
      });
      setRoomDetails(response?.data?.data || []);
    } catch (error) {
      console.error("Error fetching room details:", error);
      setRoomDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selection changes
  useEffect(() => {
    if (activeTab === 'Wards' && selectedWard?.value) {
      fetchWardDetails(selectedWard.value);
    } else if (activeTab === 'Rooms' && selectedRoom?.value) {
      fetchRoomDetails(selectedRoom.value);
    }
  }, [selectedWard, selectedRoom, activeTab]);

  return (
    <>
      <Breadcrumb pageName="Bed Allocation" />
      
      <div className="">
        <div className="">
          <ul className='flex'>
            <li className='mr-1 border-b border-stroke'>
              <button 
                className={`px-5 py-2 ${activeTab === 'Wards' ? 'bg-white text-primary border-b-2 border-primary font-medium' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab('Wards')}
              >
                Wards
              </button>
            </li>
            <li className='mr-1 border-b border-stroke'>
              <button 
                className={`px-5 py-2 ${activeTab === 'Rooms' ? 'bg-white text-primary border-b-2 border-primary font-medium' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab('Rooms')}
              >
                Rooms
              </button>
            </li>
          </ul>
        </div>

        <div className="p-6.5">
         
              {activeTab === 'Wards' && (
                <>
                  <div className='flex items-center gap-5 mb-5'>
                    <label className='block text-sm font-medium text-black dark:text-white'>
                      Select Ward
                    </label>
                    <div className='w-full max-w-xs'>
                      <AsyncPaginate
                        value={selectedWard}
                        loadOptions={loadWardOptions}
                        onChange={(option) => setSelectedWard(option)}
                        placeholder="Select a ward..."
                        additional={{ page: 1 }}
                        classNamePrefix="react-select"
                        className='w-full'
                      />
                    </div>
                  </div>
                   
                  {isLoading ? (
                    <div className=' flex justify-center items-center h-44'>
<div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>


</div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {wardDetails.length > 0 ? (
              wardDetails.map((ward, index) => (
                <div key={index} className='border bg-white border-stroke rounded-lg p-4 text-center hover:shadow-md transition-shadow'>
                  <FaBed size={40} className='text-primary mx-auto'/>
                  <div className='text-sm text-gray-500 mt-1 capitalize'>{ward?.status}</div>
                  <div className='font-bold text-black dark:text-white'>{ward?.bedNo}</div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-5 text-gray-500">
                No beds found for selected ward
              </div>
            )}
          </div>
          )}
                 
                </>
              )}

              {activeTab === 'Rooms' && (
                <>
                  <div className='flex items-center gap-5 mb-5'>
                    <label className='block text-sm font-medium text-black dark:text-white'>
                      Select Room
                    </label>
                    <div className='w-full max-w-xs'>
                      <AsyncPaginate
                        value={selectedRoom}
                        loadOptions={loadRoomOptions}
                        onChange={(option) => setSelectedRoom(option)}
                        placeholder="Select a room..."
                        additional={{ page: 1 }}
                        classNamePrefix="react-select"
                        className='w-full'
                      />
                    </div>
                  </div>
                  {isLoading ? (
<div className=' flex justify-center items-center h-44'>
<div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>


</div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
            {roomDetails.length > 0 ? (
              roomDetails.map((room, index) => (
                <div key={index} className='border bg-white border-stroke rounded-lg p-4 text-center hover:shadow-md transition-shadow'>
                  <FaBed size={40} className='text-primary mx-auto'/>
                  <div className='text-sm text-gray-500 mt-1 capitalize'>{room?.status}</div>
                  <div className='font-bold text-black dark:text-white'>{room?.roomNo}</div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-5 text-gray-500">
                No rooms found
              </div>
            )}
          </div>
          )}
                 
                </>
              )}
           
        </div>
      </div>
    </>
  );
};

export default BedAllocation;
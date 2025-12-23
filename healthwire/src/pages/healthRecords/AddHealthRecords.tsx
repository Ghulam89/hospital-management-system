import React from 'react'

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb'
import { Input,DatePicker } from 'antd'
import moment from 'moment'

const AddHealthRecords = () => {
  return (
    <>
     <>

        <Breadcrumb pageName={'Add Health Record-'}  />
      
        <div>
             <div className="flex w-full items-center gap-4">
                 <div className=' flex items-center gap-2'>
            <Input placeholder='Name, MR# or Phone' />
            </div>
           <div className=' flex items-center gap-2'>
            <div className=' w-72'>
               <DatePicker
              defaultValue={[
                moment().startOf('month'),
                moment().endOf('month')
              ]} 
              format="DD/MM/YYYY"
            />
            </div>
           </div>
           
          </div>
        </div>

     </>
    </>
    
  )
}

export default AddHealthRecords
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Loader from '../common/Loader';
import PageTitle from '../components/PageTitle';
import SignIn from '../pages/Authentication/SignIn';
import Calendar from '../pages/Calendar';
import Chart from '../pages/Chart';
import ECommerce from '../pages/Dashboard/ECommerce';
import FormElements from '../pages/Form/FormElements';
import FormLayout from '../pages/Form/FormLayout';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import Tables from '../pages/Tables';
import Alerts from '../pages/UiElements/Alerts';
import Buttons from '../pages/UiElements/Buttons';
import Ward from '../pages/IndoorManagement/ward';
import Rooms from '../pages/IndoorManagement/rooms';
import BedDetails from '../pages/IndoorManagement/bedDetails';
import AddBedDetails from '../pages/IndoorManagement/bedDetails/AddBedDetails';
import HealthRecords from '../pages/healthRecords';
import RoomDetails from '../pages/IndoorManagement/roomDetails';
import Users from '../pages/users';
import Add_accountant from '../pages/users/Accountant/Add_accountant';
import Patients from '../pages/Patients';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddAdmin from '../pages/users/Admin/Add_admin';
import DischargedPatients from '../pages/IndoorManagement/dischargedPatients';
import Department from '../pages/Preferences/Departments';
import Branches from '../pages/Branches';
import RolesAndPermissions from '../pages/Admin/RolesAndPermissions';
import AddRoomDetails from '../pages/IndoorManagement/roomDetails/AddRoomDetails';
import Edit_accountant from '../pages/users/Accountant/Edit_accountant';
import AddmittedPatients from '../pages/IndoorPatients/addmittedPatients';
import CreateaddmittedPatients from '../pages/IndoorPatients/addmittedPatients/CreateaddmittedPatients';
import Edit_admin from '../pages/users/Admin/Edit_admin';
import AddDoctor from '../pages/users/Doctor/Add_Doctor';
import GeneralConsultations from '../pages/Appointments/generalConsultations';
import AllAppointments from '../pages/AllAppointments/Appointments';
import Procedure from '../pages/Preferences/Procedures';
import Invoice from '../pages/invoices';
import CustomerLedger from '../pages/invoices/CustomerLedger';
import SupplierLedger from '../pages/Pharmacy/SupplierLedger';
import InvoiceCreation from '../pages/invoices/InvoiceCreation';
import DetailsPatients from '../pages/Patients/DetailsPatients';
import PatientInvoice from '../pages/invoices/PatientInvoice';
import BedAllocation from '../pages/IndoorPatients/bedAllocation';
import DischargedPatient from '../pages/IndoorManagement/dischargedPatients/DischargedPatient';
import BirthCertificates from '../pages/IndoorManagement/birthCertificates';
import AddBirthCertificate from '../pages/IndoorManagement/birthCertificates/AddBirthCertificate';
import Public from './Public';
import Private from './Private';
import DeathCertificates from '../pages/IndoorManagement/deathCertificates';
import AddDeathCertificate from '../pages/IndoorManagement/deathCertificates/AddDeathCertificates';
import IndoorDutyRoster from '../pages/IndoorManagement/IndoorDutey';
import FamilyHistory from '../pages/Patients/FamilyHistory';
import MedicalCertificates from '../pages/Patients/MedicalCertificates';
import MedicalHistory from '../pages/Patients/MedicalHistory';
import BedPatientHistory from '../pages/Patients/BedPatientHistory/BedPatientHistory';
import PatientAppointments from '../pages/AllAppointments/PatientAppointment';
import PatientTokens from '../pages/Tokens/PatientTokens';
import AddNurse from '../pages/users/Nurse/AddNurse';
import EditNurse from '../pages/users/Nurse/EditNurse';
import PatientReports from '../pages/reports/patientReports';
import OpdReports from '../pages/reports/opdReports';
import FinancialReports from '../pages/reports/Financial/FinancialReports';
import AddHealthRecord from '../pages/healthRecords/AddHealthRecords';
import InvoiceUpdate from '../pages/invoices/UpdateInvoice';
import UpdateDoctor from '../pages/users/Doctor/UpdateDoctor';
import ExpenseCategories from '../pages/Preferences/ExpenseCategories';
import ExpenseList from '../pages/Preferences/Expenses';
import FinancialProfitLossDetails from '../pages/reports/Financial/FinancialProfitLossDetails';
import CreatePatientInvoice from '../pages/invoices/CreatePatientInvoice';
import DefaultLayout from '../layout/DefaultLayout';
import PharmacyCategories from '../pages/Pharmacy/PharmacyCategories';
import PharmacyManufacturers from '../pages/Pharmacy/PharmacyManufacturers';
import PharmacySupplier from '../pages/Pharmacy/PharmacySupplier';
import PharmacyItems from '../pages/Pharmacy/PharmacyItem';
import PharmacyRack from '../pages/Pharmacy/PharmacyRack';
import POSInvoice from '../pages/Pharmacy/POS';
import POSReceipt from '../pages/Pharmacy/POSReceipt';
import EditPOSInvoice from '../pages/Pharmacy/EditPOSInvoice';
import PharmacySales from '../pages/Pharmacy/PharmacySales';
import StockReturn from '../pages/Pharmacy/StockReturn';
import Stocks from '../pages/Pharmacy/ManageStock';
import AddNewStocks from '../pages/Pharmacy/ManageStock/AddNewStock';
import PurchaseOrders from '../pages/Pharmacy/PurchaseOrders';
import AddPurchaseOrder from '../pages/Pharmacy/PurchaseOrders/AddPurchaseOrder';
import PurchaseOrderDetails from '../pages/Pharmacy/PurchaseOrders/PurchaseOrderDetails';
import MissedSales from '../pages/Pharmacy/MissedSales';
import ConsumeStocks from '../pages/Pharmacy/PharmacyConsumptions';
import StoreClosings from '../pages/Pharmacy/StoreClosings/index';
import PharmacyReports from '../pages/Pharmacy/PharmacyReports';
import StockReturnAddPage from '../pages/Pharmacy/StockReturn/StockReturnAddPage';
import ProductDetails from '../pages/Pharmacy/PharmacyItem/ProductDetails';
import AddStaff from '../pages/users/Staff/Add_staff';
import EditStaff from '../pages/users/Staff/Edit_staff';

function Routing() {
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/auth/admin-login" />} />
        <Route path="auth">
          <Route
            path="admin-login"
            element={
              <Public>
                <PageTitle title="Holistic Care Hospital Management System" />
                <SignIn />
              </Public>
            }
          />
        </Route>

                <Route element={<Private><DefaultLayout /></Private>}>

        <Route
          path="/dashboard"
          element={
            <>
              <Private>
                <PageTitle title="Dashboard | Holistic Care Hospital Management System" />
                <ECommerce />
              </Private>
            </>
          }
        />
        
        <Route
          path="/ward"
          element={
            <>
              <PageTitle title="Signin | Holistic Care Hospital Management System" />
              <Ward />
            </>
          }
        />

        <Route
          path="/procedures"
          element={
            <>
              <PageTitle title="Signin | Holistic Care Hospital Management System" />
              <Procedure />
            </>
          }
        />

        <Route
          path="/invoice"
          element={
            <>
              <PageTitle title="Signin | Holistic Care Hospital Management System" />
              <Invoice />
            </>
          }
        />
        <Route
          path="/invoice/customer-ledger"
          element={
            <>
              <PageTitle title="Customer Ledger | Holistic Care Hospital Management System" />
              <CustomerLedger />
            </>
          }
        />

        <Route
          path="/expense-categories"
          element={
            <>
              <PageTitle title="Signin | Holistic Care Hospital Management System" />
              <ExpenseCategories />
            </>
          }
        />
        <Route
          path="/expense"
          element={
            <>
              <PageTitle title="Signin | Holistic Care Hospital Management System" />
              <ExpenseList />
            </>
          }
        />
        <Route
          path="/invoice/edit/:id/:patientId"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <InvoiceUpdate />
            </>
          }
        />

        <Route
          path="/bed-allocation"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <BedAllocation />
            </>
          }
        />
        <Route
          path="/family-history/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <FamilyHistory />
            </>
          }
        />

        <Route
          path="/bed-patient-history/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <BedPatientHistory />
            </>
          }
        />

        <Route
          path="/medical-history/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <MedicalHistory />
            </>
          }
        />

        <Route
          path="/medical-certificates/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <MedicalCertificates />
            </>
          }
        />

        <Route
          path="/invoice/patient/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PatientInvoice />
            </>
          }
        />

        <Route
          path="/patients/patients-report"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PatientReports />
            </>
          }
        />

        <Route
          path="/opd/opd-report"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <OpdReports />
            </>
          }
        />

        <Route
          path="/financial/financial-report"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <FinancialReports />
            </>
          }
        />
        <Route
          path="/financial/profit-loss-details"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <FinancialProfitLossDetails />
            </>
          }
        />

        <Route
          path="/invoice/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <InvoiceCreation />
            </>
          }
        />

        <Route
          path="/patient/invoice/new/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <CreatePatientInvoice />
            </>
          }
        />

        <Route
          path="/details-patients/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <DetailsPatients />
            </>
          }
        />

        <Route
          path="/admin/health-records"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <HealthRecords />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/categories"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PharmacyCategories />
            </>
          }
        />

         <Route
          path="/admin/pharmacy/manufacturers"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PharmacyManufacturers />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/invoices"
          element={
            <>
              <PageTitle title="Pharmacy POS | Hospital Management" />
              <POSInvoice />
            </>
          }
        />
         <Route
          path="/admin/pharmacy/invoices/new"
          element={
            <>
              <PageTitle title="Pharmacy POS | Hospital Management" />
              <POSInvoice />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/invoices/edit/:id"
          element={
            <>
              <PageTitle title="Edit POS Invoice" />
              <EditPOSInvoice />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/invoices/receipt/:id"
          element={
            <>
              <PageTitle title="Pharmacy Receipt" />
              <POSReceipt />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/customer-ledger"
          element={
            <>
              <PageTitle title="Customer Ledger | Pharmacy" />
              <CustomerLedger />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/supplier-ledger"
          element={
            <>
              <PageTitle title="Supplier Ledger | Pharmacy" />
              <SupplierLedger />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/sales"
          element={
            <>
              <PageTitle title="POS Sales History | Hospital Management" />
              <PharmacySales />
            </>
          }
        />

 <Route
          path="/admin/items/pharmacy"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PharmacyItems />
            </>
          }
        />

        <Route
          path="/admin/items/pharmacy/details/:id"
          element={
            <>
              <PageTitle title="Product Details | Hospital Management" />
              <ProductDetails />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/rack"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PharmacyRack />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/stock_returns"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <StockReturn />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/stock_returns/add"
          element={
            <>
              <PageTitle title="Add Stock Return | Hospital Management" />
              <StockReturnAddPage />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/stocks"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <Stocks />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/stocks/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddNewStocks />
            </>
          }
        />
        <Route
          path="/admin/pharmacy/stocks/edit/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddNewStocks />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/purchase-orders"
          element={
            <>
              <PageTitle title="Purchase Orders | Hospital Management" />
              <PurchaseOrders />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/purchase-orders/add"
          element={
            <>
              <PageTitle title="Add Purchase Order | Hospital Management" />
              <AddPurchaseOrder />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/purchase-orders/edit/:id"
          element={
            <>
              <PageTitle title="Edit Purchase Order | Hospital Management" />
              <AddPurchaseOrder />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/purchase-orders/view/:id"
          element={
            <>
              <PageTitle title="Purchase Order Details | Hospital Management" />
              <PurchaseOrderDetails />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/missed-sales"
          element={
            <>
              <PageTitle title="Missed Sales | Hospital Management" />
              <MissedSales />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/consumed-stocks"
          element={
            <>
              <PageTitle title="Consumed Stocks | Hospital Management" />
              <ConsumeStocks />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/store-closings"
          element={
            <>
              <PageTitle title="Store Closings | Hospital Management" />
              <StoreClosings />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/expenses"
          element={
            <>
              <PageTitle title="Pharmacy Expenses | Hospital Management" />
              <ExpenseList module="pharmacy" pageName="Pharmacy Expenses" />
            </>
          }
        />

        <Route
          path="/admin/pharmacy/reports"
          element={
            <>
              <PageTitle title="Pharmacy Reports & History | Hospital Management" />
              <PharmacyReports />
            </>
          }
        />

        
         <Route
          path="/admin/pharmacy/supplier"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PharmacySupplier />
            </>
          }
        />

        <Route
          path="/admin/health-records/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddHealthRecord />
            </>
          }
        />

        <Route
          path="/rooms"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <Rooms />
            </>
          }
        />
        <Route
          path="/Indoor-duty-roster"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <IndoorDutyRoster />
            </>
          }
        />

        <Route
          path="/room-details"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <RoomDetails />
            </>
          }
        />

        <Route
          path="/birth-reports"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <BirthCertificates />
            </>
          }
        />
        <Route
          path="/death-reports"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <DeathCertificates />
            </>
          }
        />

        <Route
          path="/birth-reports/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddBirthCertificate />
            </>
          }
        />
        <Route
          path="/death-reports/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddDeathCertificate />
            </>
          }
        />

        <Route
          path="/bed-details"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <BedDetails />
            </>
          }
        />

        <Route
          path="/appointments"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AllAppointments />
            </>
          }
        />
        <Route
          path="/appointment/patient/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PatientAppointments />
            </>
          }
        />
        <Route
          path="/tokens/patient/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <PatientTokens />
            </>
          }
        />

        <Route
          path="/discharge-patients"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <DischargedPatients />
            </>
          }
        />

        <Route
          path="/discharge-patients/:id"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <DischargedPatient />
            </>
          }
        />

        <Route
          path="/department"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <Department />
            </>
          }
        />

        <Route
          path="/admin/branches"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <Branches />
            </>
          }
        />

        <Route
          path="/bed-details/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddBedDetails />
            </>
          }
        />

        <Route
          path="/room-details/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddRoomDetails />
            </>
          }
        />

        <Route
          path="/admin/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddAdmin />
            </>
          }
        />

        <Route
          path="/admin/beds"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <AddmittedPatients />
            </>
          }
        />

        <Route
          path="/admin/beds/new"
          element={
            <>
              <PageTitle title="Signin | Hospital Management" />
              <CreateaddmittedPatients />
            </>
          }
        />

        <Route
          path="/calendar"
          element={
            <>
              <PageTitle title="Calendar | Hospital Management" />
              <Calendar />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <PageTitle title="Profile | Hospital Management" />
              <Profile />
            </>
          }
        />
        <Route
          path="#"
          element={
            <>
              <PageTitle title="Form Elements | Hospital Management" />
              <FormElements />
            </>
          }
        />
        <Route
          path="#"
          element={
            <>
              <PageTitle title="Form Layout | Hospital Management" />
              <FormLayout />
            </>
          }
        />
        <Route
          path="/tables"
          element={
            <>
              <PageTitle title="Tables | Hospital Management" />
              <Tables />
            </>
          }
        />
        <Route
          path="#"
          element={
            <>
              <PageTitle title="Settings | Hospital Management" />
              <Settings />
            </>
          }
        />
        <Route
          path="#"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <Chart />
            </>
          }
        />

        <Route
          path="/admin/general-consultations"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <GeneralConsultations />
            </>
          }
        />
        <Route
          path="/admin/users"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <Users />
            </>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <>
              <PageTitle title="Roles &amp; permissions | Holistic Care Hospital Management System" />
              <RolesAndPermissions />
            </>
          }
        />
        <Route
          path="/accountant/new_user"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <Add_accountant />
            </>
          }
        />
        <Route
          path="/nurse/new_user"
          element={
            <>
              <PageTitle title="Nurse | Hospital Management" />
              <AddNurse />
            </>
          }
        />

        <Route
          path="/doctor/new"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <AddDoctor />
            </>
          }
        />

        <Route
          path="/doctor/update/:id"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <UpdateDoctor />
            </>
          }
        />

        <Route
          path="/accountant/edit_user/:id"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <Edit_accountant />
            </>
          }
        />
        <Route
          path="/nurse/edit_user/:id"
          element={
            <>
              <PageTitle title="Nurse | Hospital Management" />
              <EditNurse />
            </>
          }
        />
        <Route
          path="/staff/new_user"
          element={
            <>
              <PageTitle title="Staff | Hospital Management" />
              <AddStaff />
            </>
          }
        />
        <Route
          path="/staff/edit_user/:id"
          element={
            <>
              <PageTitle title="Staff | Hospital Management" />
              <EditStaff />
            </>
          }
        />

        <Route
          path="/admin/edit_admin/:id"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <Edit_admin />
            </>
          }
        />

        <Route
          path="/admin/patients"
          element={
            <>
              <PageTitle title="Basic Chart | Hospital Management" />
              <Patients />
            </>
          }
        />

        <Route
          path="/ui/alerts"
          element={
            <>
              <PageTitle title="Alerts | Hospital Management" />
              <Alerts />
            </>
          }
        />
        <Route
          path="/ui/buttons"
          element={
            <>
              <PageTitle title="Buttons | Hospital Management" />
              <Buttons />
            </>
          }
        />
        
        </Route>


                
              
      </Routes>
    </>
  );
}

export default Routing;

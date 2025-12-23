import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import TodayAppointments from '../components/Tables/TodayAppointments';
import TableThree from '../components/Tables/TableThree';
import TableTwo from '../components/Tables/TableTwo';


const Tables = () => {
  return (
    <>
      <Breadcrumb pageName="Tables" />

      <div className="flex flex-col gap-10">
        <TodayAppointments />
        <TableTwo />
        <TableThree />
      </div>
    </>
  );
};

export default Tables;

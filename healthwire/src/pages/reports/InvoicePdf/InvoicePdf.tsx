import { Document, Image, Page, Text, View,StyleSheet} from "@react-pdf/renderer";
import logoDataUrl from '../../../images/logo-icon.png';
import moment from "moment";

// PDF Styles



interface InvoiceItem {
  description: string;
  rate: number;
  quantity: number;
  amount: number;
  discount: number;
}

interface Doctor {
  name: string;
}

interface Invoice {
  _id: string;
  createdAt: string;
  doctorId?: Doctor;
  item?: InvoiceItem[];
  subTotalBill?: number;
  discountBill?: number;
  totalBill?: number;
  totalPay?: number;
  duePay?: number;
}

interface Patient {
  name?: string;
  mr?: string;
}

interface InvoicePdfProps {
  invoice: Invoice;
  patient: Patient;
}

const InvoicePdf = ({ invoice, patient }: InvoicePdfProps) => {

    console.log('invoice', invoice);
    

    const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 100,
  },
  clinicInfo: {
    textAlign: 'center',
    marginBottom: 10,
    flex: 1,
  },
  clinicName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clinicAddress: {
    fontSize: 10,
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textDecoration: 'underline',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    marginBottom: 15,
  },
  patientInfo: {
    marginBottom: 15,
    fontSize: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    marginBottom: 5,
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 5,
    fontSize: 10,
  },
  descriptionColumn: {
    width: '40%',
    paddingRight: 5,
  },
  rateColumn: {
    width: '15%',
    paddingRight: 5,
    textAlign: 'right',
  },
  quantityColumn: {
    width: '10%',
    paddingRight: 5,
    textAlign: 'right',
  },
  amountColumn: {
    width: '15%',
    paddingRight: 5,
    textAlign: 'right',
  },
  discountColumn: {
    width: '15%',
    textAlign: 'right',
  },
  totalsContainer: {
    marginTop: 20,
    alignSelf: 'flex-end',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 5,
    marginTop: 5,
    fontWeight: 'bold',
  },
  notes: {
    fontSize: 9,
    color: '#666',
    marginTop: 30,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 40,
    fontSize: 9,
    textAlign: 'center',
  },
  signature: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

  return (
     <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={logoDataUrl} style={styles.logo} />
        <View style={styles.clinicInfo}>
          <Text style={styles.clinicName}>HOLISTIC CARE CLINIC</Text>
          <Text style={styles.clinicAddress}>188-Y Block Phase III, DHA, Lahore, Punjab, Pakistan</Text>
          <Text style={styles.clinicAddress}>Phone: 0342-4211888 | Email: info@holisticcare.com</Text>
        </View>
      </View>

      <Text style={styles.invoiceTitle}>INVOICE</Text>

      <View style={styles.divider} />

      <View style={styles.patientInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice #:</Text>
          <Text>{invoice._id.substring(0, 6).toUpperCase()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text>{moment(invoice.createdAt).format('DD/MM/YYYY h:mm A')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patient:</Text>
          <Text>{patient?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>MR #:</Text>
          <Text>{patient?.mr}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Doctor:</Text>
          <Text>{invoice.doctorId?.name}</Text>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.descriptionColumn}>Description</Text>
        <Text style={styles.rateColumn}>Rate</Text>
        <Text style={styles.quantityColumn}>Qty</Text>
        <Text style={styles.amountColumn}>Amount</Text>
        <Text style={styles.discountColumn}>Discount</Text>
      </View>

      {invoice.item && invoice.item.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.descriptionColumn}>{item.description}</Text>
          <Text style={styles.rateColumn}>{item.rate?.toFixed(2)}</Text>
          <Text style={styles.quantityColumn}>{item.quantity}</Text>
          <Text style={styles.amountColumn}>{item.amount?.toFixed(2)}</Text>
          <Text style={styles.discountColumn}>{item.discount?.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={{fontSize:12}}>Sub Total:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.subTotalBill?.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{fontSize:12}}>Discount:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.discountBill?.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotal]}>
          <Text style={{fontSize:12}}>Grand Total:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.totalBill?.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{fontSize:12}}>Amount Paid:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.totalPay?.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, {marginTop: 5}]}>
          <Text style={{fontSize:12}}>Balance Due:</Text>
          <Text style={{fontSize:12}}>Rs. {invoice.duePay?.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.notes}>
        <Text>* Procedures & Medicines once purchased are non-refundable.</Text>
        <Text>* Purchased Packages Are Valid for 80m (CW).</Text>
      </View>

      <View style={styles.signature}>
        <View>
          <Text>_________________________</Text>
          <Text style={{fontSize:14}}>Authorized Signature</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>Thank you for choosing Holistic Care Clinic</Text>
        <Text>For any queries, please contact: 0342-4211888</Text>
      </View>
    </Page>
  </Document>
  )
}

export default InvoicePdf
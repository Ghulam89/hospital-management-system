const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const requestIp = require("request-ip");
const connect = require("./config/db");
const bodyParser = require("body-parser");
const http = require("http");
const mongoose = require("mongoose");

const app = express();

connect();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestIp.mw());
app.use(bodyParser.json());




const invoiceRouter = require("./routes/invoiceRoutes.js");
const procedureRouter = require("./routes/procedureRoutes.js");
const tokenRouter = require("./routes/tokenRoutes.js");
const userRouter = require("./routes/userRoutes.js");
const patientRouter = require("./routes/patientRoutes.js");
const departmentRouter = require("./routes/departmentRoutes.js");
const wardRouter = require("./routes/wardRoutes.js");
const roomRouter = require("./routes/roomRoutes.js");
const bedDetailRouter = require("./routes/bedDetailRoutes.js");
const birthCertificateRouter = require("./routes/birthCertificateRoutes.js");
const deathCertificateRouter = require("./routes/deathCertificateRoutes.js");
const admitPatientRouter = require("./routes/admitPatientRoutes.js");
const dischargePatientRouter = require("./routes/dischargePatientRoutes.js");
const roomDetailRouter = require("./routes/roomDetailRoutes.js");
const loginRouter = require("./routes/loginRoutes.js");
const appointmentRouter = require("./routes/appointmentRoutes.js");
const inDoorDutyRouter = require("./routes/inDoorDutyRoutes.js");
const medicalCertificateRouter = require("./routes/medicalCertificateRoutes.js");
const familyHistoryRouter = require("./routes/familyHistoryRoutes.js");
const medicalHistoryRouter = require("./routes/medicalHistoryRoutes.js");
const expenseRouter = require("./routes/expenseRoutes.js");
const expenseCategoryRouter = require("./routes/expenseCategoryRoutes.js");
const pharmCategoryRouter = require("./routes/pharmCategoryRoutes.js");
const pharmItemRouter = require("./routes/pharmItemRoutes.js");
const pharmManufacturerRouter = require("./routes/pharmManufacturerRoutes.js");
const pharmRackRouter = require("./routes/pharmRackRoutes.js");
const pharmSupplierRouter = require("./routes/pharmSupplierRoutes.js");
const pharmAddStockRouter = require("./routes/pharmAddStockRoutes.js");
const pharmConsumedStockRouter = require("./routes/pharmConsumedStockRoutes.js");
const pharmMissedSaleRouter = require("./routes/pharmMissedSaleRoutes.js");
const pharmPosRouter = require("./routes/pharmPosRoutes.js");
const pharmReturnStockRouter = require("./routes/pharmReturnStockRoutes.js");
const pharmPurchaseOrderRouter = require("./routes/pharmPurchaseOrderRoutes.js");
const storeClosingRouter = require("./routes/storeClosingRoutes.js");




app.use("/apis/pharmReturnStock", pharmReturnStockRouter);
app.use("/apis/pharmPurchaseOrder", pharmPurchaseOrderRouter);
app.use("/apis/pharmMissedSale", pharmMissedSaleRouter);
app.use("/apis/pharmConsumedStock", pharmConsumedStockRouter);
app.use("/apis/pharmPos", pharmPosRouter);
app.use("/apis/pharmAddStock", pharmAddStockRouter);
app.use("/apis/pharmSupplier", pharmSupplierRouter);
app.use("/apis/pharmRack", pharmRackRouter);
app.use("/apis/pharmManufacturer", pharmManufacturerRouter);
app.use("/apis/pharmItem", pharmItemRouter);
app.use("/apis/pharmCategory", pharmCategoryRouter);
app.use("/apis/expense", expenseRouter);
app.use("/apis/expenseCategory", expenseCategoryRouter);
app.use("/apis/medicalHistory", medicalHistoryRouter);
app.use("/apis/familyHistory", familyHistoryRouter);
app.use("/apis/medicalCertificate", medicalCertificateRouter);
app.use("/apis/inDoorDuty", inDoorDutyRouter);
app.use("/apis/invoice", invoiceRouter);
app.use("/apis/procedure", procedureRouter);
app.use("/apis/appointment", appointmentRouter);
app.use("/apis/token", tokenRouter);
app.use("/apis/user", userRouter);
app.use("/apis/patient", patientRouter);
app.use("/apis/department", departmentRouter);
app.use("/apis/ward", wardRouter);
app.use("/apis/room", roomRouter);
app.use("/apis/bedDetail", bedDetailRouter);
app.use("/apis/birthCertificate", birthCertificateRouter);
app.use("/apis/deathCertificate", deathCertificateRouter);
app.use("/apis/admitPatient", admitPatientRouter);
app.use("/apis/dischargePatient", dischargePatientRouter);
app.use("/apis/roomDetail", roomDetailRouter);
app.use("/apis/login", loginRouter);
app.use("/apis/storeClosing", storeClosingRouter);



app.use(express.static(__dirname + "/Images"));

// testing
app.get("/", (req, res) => {
  res.json({ message: "Success" });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

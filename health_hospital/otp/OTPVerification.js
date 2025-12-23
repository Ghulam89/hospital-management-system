const dbConfig = require('../config/dbConfig.js')
const nodemailer = require('nodemailer')

const sendMail=async (req,res,cb)=>{
    
let transporter=nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth:{
        user: dbConfig.EMAIL,
        pass: dbConfig.PASS
    }
})

const mailOptions={
    from:dbConfig.EMAIL,
    to:options.to,
    subject:options.subject,
    html:options.html
}





try{
    transporter.sendMail(mailOptions,cb)
    console.log('Sending email successfully');
}
catch(error){
    console.log('Sending email failed');
    console.log(error);
    throw error
}


}


module.exports = {
    sendMail
}

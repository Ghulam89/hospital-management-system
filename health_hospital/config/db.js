const mongoose = require("mongoose");
const env = require("./env.config");

const connect = async () => {
  try {
    const response = await mongoose.connect(env.URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      writeConcern: { w: 'majority' },
   });

    console.log("server connected!");
  } catch (error) {
    console.log(error.message);
    process.exit();
  }
};

module.exports = connect;

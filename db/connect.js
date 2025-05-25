const mongoose = require("mongoose");
const connectiondb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log("Connected With MongoDb");
  } catch (error) {
    console.log(error);
  }
};
module.exports = { connectiondb };
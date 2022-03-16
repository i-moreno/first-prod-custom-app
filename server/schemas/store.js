import mongoose from "mongoose";

const { Schema } = mongoose;

const storeSchema = new Schema({
  name: String,
  productId: Number,
});

const Store = mongoose.model("Store", storeSchema);

export default Store;
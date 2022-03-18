import mongoose from "mongoose";

const { Schema } = mongoose;

const storeSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  productId: {
    type: Number,
    required: false
  }
});

const Store = mongoose.model("Store", storeSchema);

export default Store;
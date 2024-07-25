// deviceModel.js
const mongoose = require("mongoose");

const deviceSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    position: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        }
    }
});

const Device = mongoose.model("Device", deviceSchema);
module.exports = Device;

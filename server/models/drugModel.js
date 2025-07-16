const mongoose = require('mongoose')
const drugSchema = new mongoose.Schema({
    name:{
        type: String, 
        required:true
    },
    description:{
        type:String,
    },
    stock:{
        type:Number,
        default:0
    },
    expDate:{
        type: Date,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
},{timestamps:true});

module.exports = mongoose.model('Drug', drugSchema);
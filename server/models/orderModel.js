const { Transaction } = require('mongodb');
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    drug:{
        type: String,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    selers_name:{
        type:String,
        required:true
    },
    seller_name:{
        type:String,
        required:true
    },
    order_no:{
        type:Number,
        required:true
    },
    status:{
        type: String,
        enum:['pending', 'approved'],
        default: 'pending'
    },
},{timestamp: true})

module.exports = mongoose.model('Order', orderSchema)
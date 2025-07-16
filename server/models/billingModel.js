const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
    order: { 
        type: mongoose.Schema.Types.ObjectId, ref: 'Order' 
    },
    amount:{
        type: Number,
        required: true
    },
    paid:{
        type:Boolean,
        default: false
    },
    pharmacy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    }
},{timestamps:true});

module.exports = mongoose.model('Billing', billingSchema);


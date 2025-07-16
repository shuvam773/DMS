const Billing = require('../models/billingModel')

const createBill = async (req,res) =>{
    try {
        const {order, amount, paid} = req.body;
        const bill = new Billing({
            order, 
            amount, 
            paid,
            pharmacy: req.user._id
        })
        await bill.save();
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
}

const getBills = async(req,res) =>{
    try {
        const bills = await Billing.find().populate('order').populate('pharmacy');
        res.json(bills)
    } catch (err) {
        res.status(500).json({msg:err.message})
    }
}


module.exports = {
    createBill,
    getBills
}
const mongoose = require('mongoose');

const instituteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  status: {
    type: String,
    enum: ['Active', 'Pending'],
    default: 'Pending'
  },
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function(userId) {
        const user = await mongoose.model('User').findById(userId);
        return user && user.role === 'institute';
      },
      message: 'Referenced user must have admin role'
    }
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true,
});


// Middleware to delete corresponding User on UserDetails deletion
userDetailsSchema.pre('findOneAndDelete', async function (next) {
  const doc = await this.model.findOne(this.getFilter());
  if (doc && doc.user) {
    await User.findByIdAndDelete(doc.user);
  }
  next();
});

const Institute = mongoose.model('Institute', instituteSchema);

module.exports = Institute;
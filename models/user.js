const mongoose                 = require('mongoose');
const passportLocalMongoosePkg = require('passport-local-mongoose');
const passportLocalMongoose    = passportLocalMongoosePkg.default || passportLocalMongoosePkg;

const userSchema = new mongoose.Schema({

    email: {
        type:      String,
        required:  true,
        unique:    true,
        trim:      true,
        lowercase: true
    },
    username: {
        type:     String,
        required: true,
        trim:     true
    },
    fullName: {
        type:    String,
        default: '',
        trim:    true
    },
    phone: {
        type:    String,
        default: '',
        trim:    true
    },
    bio: {
        type:      String,
        default:   '',
        maxlength: 200,
        trim:      true
    },
    wishlist: [{
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'Listing',
        default: []
    }]

}, { timestamps: true });

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'email'
});

module.exports = mongoose.model('User', userSchema);
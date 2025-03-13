const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/blogspot");

const userSchema = mongoose.Schema({
    name: String,
    username: String,
    email: String,
    password: String,
    blogs: [{type: mongoose.Schema.Types.ObjectId, ref: 'blog'}]
});

module.exports = mongoose.model('user', userSchema);

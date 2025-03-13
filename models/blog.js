const mongoose = require('mongoose');

const blogSchema = mongoose.Schema({
    title: String,
    content: String,
    date: {
        type: Date,
        default: Date.now
    },
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    likes: [{type: mongoose.Schema.Types.ObjectId, ref: 'user'}]
});

module.exports = mongoose.model('blog', blogSchema);

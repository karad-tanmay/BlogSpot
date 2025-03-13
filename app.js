const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const userModel = require('./models/user');
const blogModel = require('./models/blog');
const e = require('express');
const blog = require('./models/blog');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join("public", __dirname)));

app.get('/', async (req, res) => {
    let blogs = await blogModel.find();
    let users = await Promise.all(
        blogs.map(async (blog) => {
            return await userModel.findById(blog.user);
        })
    );
    let loginflag = false;
    if (req.cookies.token != "") {
        loginflag = true;
    }
    res.render("index", { blogs: blogs, users: users, isUser: loginflag });
});

app.get('/register', (req, res) => {
    res.render("register");
});

app.post('/create/user', async (req, res) => {
    let { name, username, email, password } = req.body;
    let alreadyExists = await userModel.findOne({ email: email });
    if (alreadyExists) { res.status(500).send("User is already registered through given Email ID."); }
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            // console.log(password);
            // console.log(hash);
            let user = await userModel.create({ name, username, email, password: hash });
            // console.log(user);
            let token = jwt.sign({ email: user.email, userid: user._id }, "secretstr");
            res.cookie("token", token);
            res.redirect('/profile');
        });
    });
});

app.get('/login', (req, res) => {
    res.render("login");
});

app.post('/login', async (req, res) => {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (!user) { res.status(500).send("User Not Found!"); }
    else {
        bcrypt.compare(password, user.password, (err, result) => {
            if (!result) { res.status(500).send("Incorrect Password!"); }
            else {
                let token = jwt.sign({ email: user.email, userid: user._id }, "secretstr");
                res.cookie("token", token);
                res.redirect('/profile');
            }
        });
    }
});

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect('/');
});

app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findById(req.userinfo.userid);
    let blogs = await Promise.all(
        user.blogs.map(async (blogid) => {
            return await blogModel.findById(blogid);
        })
    );
    res.render("profile", { user: user, blogs: blogs });
});

app.get('/profile/edit', isLoggedIn, async (req, res) => {
    let { email, userid } = req.userinfo;
    let user = await userModel.findById(userid);
    res.render("editprofile", { user: user });
});

app.post('/profile/edit', isLoggedIn, async (req, res) => {
    let { email, userid } = req.userinfo;
    let { name, username } = req.body;
    let user = await userModel.findByIdAndUpdate(userid, { name, username });
    res.redirect('/profile');
});

app.post('/profile/changepasswd', isLoggedIn, async (req, res) => {
    let { oldpasswd, newpasswd, confnewpasswd } = req.body;
    let { email, userid } = req.userinfo;
    let user = await userModel.findById(userid);
    const result = await bcrypt.compare(oldpasswd, user.password);
    if (result) {
        if (newpasswd == confnewpasswd) {
            const hashedpass = await bcrypt.hash(confnewpasswd, 10);
            user.password = hashedpass;
            await user.save();
            res.redirect('/profile');
        }
        else {
            res.send("New Passwords Don't Match!");
        }
    }
    else {
        res.send("Incorrect Password!");
    }
});

app.get('/profile/delete', isLoggedIn, async (req, res) => {
    let { email, userid } = req.userinfo;
    let user = await userModel.findById(userid);
    for (i = 0; i < user.blogs.length; i++) {
        await blogModel.findByIdAndDelete(user.blogs[i]);
    }
    await userModel.findByIdAndDelete(userid);
    res.redirect('/logout');
});

app.get('/newblog', isLoggedIn, (req, res) => {
    res.render('createblog');
});

app.post('/create/blog', isLoggedIn, async (req, res) => {
    let { title, content } = req.body;
    let { email, userid } = req.userinfo;
    let blog = await blogModel.create({ title, content, user: userid });
    let user = await userModel.findById(userid);
    user.blogs.push(blog._id);
    await user.save();
    res.redirect('/profile');
});

app.get('/blog/view/:id', async (req, res) => {
    let blog = await blogModel.findById(req.params.id);
    res.render("readblog", { blog: blog });
});

app.get('/blog/edit/:id', isLoggedIn, async (req, res) => {
    let blog = await blogModel.findById(req.params.id);
    res.render("editblog", { blog: blog });
});

app.post('/blog/edit/:id', isLoggedIn, async (req, res) => {
    let { title, content } = req.body;
    let blog = await blogModel.findByIdAndUpdate(req.params.id, { title, content, date: Date.now() });
    res.redirect('/profile');
});

app.get('/blog/delete/:id', isLoggedIn, async (req, res) => {
    let { email, userid } = req.userinfo;
    let user = await userModel.findById(userid);
    let reqIndex = user.blogs.indexOf(req.params.id);
    user.blogs.splice(reqIndex, 1);
    await user.save();
    await blogModel.findByIdAndDelete(req.params.id);
    // console.log(user.blogs);
    res.redirect('/profile');
});

app.get('/blog/like/:id', isLoggedIn, async (req, res) => {
    let { email, userid } = req.userinfo;
    let blog = await blogModel.findById(req.params.id);
    if (blog.likes.indexOf(userid) == -1) {
        blog.likes.push(userid);
    }
    else {
        blog.likes.splice(userid, 1);
    }
    await blog.save();
    res.redirect(`/blog/view/${req.params.id}`);
});

// middleware
function isLoggedIn(req, res, next) {
    if (req.cookies.token != "") {
        let data = jwt.verify(req.cookies.token, "secretstr");
        req.userinfo = data;
        next();
    }
    else { res.redirect('/login'); }
    // next();
}

app.listen(3000);

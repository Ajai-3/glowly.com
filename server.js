import express from 'express';
import nocache from 'nocache';
import jwt from "jsonwebtoken"
import session from 'express-session';
import cookieParser from "cookie-parser";
import passport from './config/passport.js';
import dotenv from 'dotenv'; dotenv.config();
import userRouter from './routes/user.router.js';
import adminRouter from './routes/adminRoutes.js';
// import { verifyAdminToken } from "../Glowly.com/middlewares/admin.midleware.js"
import { startServer } from './config/connection.js';
import { errorHandler, notFoundHandler } from './middlewares/error.midleware.js';
// import path from 'path';
// import { dirname } from 'path';
// import flash from 'connect-flash';
// import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Get the current directory
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// Serve static files from the 'public' directory
// app.use(express.static(path.join(__dirname, 'public')));


app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
});


app.use(express.static('public'))
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
    }
}));

// Flash messages must come after session middleware
// app.use(flash());

app.set("view engine", "ejs");
app.use(nocache());
app.use(cookieParser()); 
app.use(express.json()); // Parse incoming requests
app.use(express.urlencoded({ extended: true })); // Parse form data




// Passport session initialization
app.use(passport.initialize());
app.use(passport.session());

app.use('/',  userRouter);
// app.use('/', adminRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter);


app.use(errorHandler);
app.use('*', notFoundHandler);

// Start Server and connect Database
startServer(app, PORT, DB_URL);

import express from 'express';
import nocache from 'nocache';
import cron from "node-cron";
import session from 'express-session';
import cookieParser from "cookie-parser";
import passport from './config/passport.js';
import dotenv from 'dotenv'; dotenv.config();
import userRouter from './routes/user.router.js';
import adminRouter from './routes/adminRoutes.js';
import { startServer } from './config/connection.js';
import { resetCategoryOffer } from './helpers/resetCategoryOffer.js';
import { errorHandler, notFoundHandler } from './middlewares/error.midleware.js';



const app = express();
const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;


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


cron.schedule("* * * * *",async () => {
    try {


      await resetCategoryOffer()
  
    } catch (error) {
      console.error("error at cron in index.js",error)
    }
  })

app.set("view engine", "ejs");
app.use(nocache());
app.use(cookieParser()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Passport session initialization
app.use(passport.initialize());
app.use(passport.session());

app.use('/', userRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter);


app.use(errorHandler);
app.use('*', notFoundHandler);

// Start Server and connect Database
startServer(app, PORT, DB_URL);

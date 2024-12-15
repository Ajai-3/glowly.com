import express from 'express';
import path from 'path';  // Make sure to import 'path' module
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nocache from "nocache";
import flash from "connect-flash";
import session from "express-session";
import userRouter from "./routes/user.router.js";
import adminRouter from "./routes/admin.router.js";
import { startServer } from './config/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.use(flash());
app.use(nocache());
app.use(express.json()); // Parse incoming requests
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

app.use('/', userRouter);
app.use('/', adminRouter);
app.use('/user', userRouter);
app.use('/admin', adminRouter);

// Start Server and connect Database
startServer(app, PORT, DB_URL);

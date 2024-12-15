import mongoose, { connect } from "mongoose"

// connect MongoDB
const connectMongoDB = async (url) => {
    try {
       await mongoose.connect(url);
       console.log("DataBase Connected");
    } catch (error) {
       console.log("Failed To Connect DataBase....", error);
       process.exit(1) // Exit Process 
    }
}

export const startServer = async (app, PORT, DB_URL) => {
     await connectMongoDB(DB_URL);
     app.listen(PORT, () => {
        console.log(`Server Starts On Port ${PORT}`);
     })
}
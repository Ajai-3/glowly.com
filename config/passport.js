import passport from "passport";
import User from "../models/user.model.js";
import dotenv from "dotenv"; dotenv.config();
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// Setting The Google OAuth Strategy
passport.use(new GoogleStrategy ({
   clientID: process.env.GOOGLE_CLIENT_ID,
   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
   callbackURL: "https://glowly.ajaiii.tech/auth/google/callback"
},
    async (accessToken, refreshTocken, profile, done) => {
        try {
          let user = await User.findOne({ googleId:profile.id })
          if (user) {
            return done(null, user);
          } else {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id
            });
            await user.save();
            return done(null, user);
          }
        } catch (error) {
          console.error('Error in Google OAuth callback:', error);
           return done(error, null) 
        }
    }
))

// Serialize The User
// It Is Used To Assign The User ID To The Session
passport.serializeUser((user, done) => {
    done(null, user.id)
})

// Deserilize The User
// It Is Used To Fetch User Data From The Session
passport.deserializeUser(async (id, done) => {
    try {
       const user = await User.findById(id);
       done(null, user); 
    } catch (error) {
        done(error, null);
    }
})

export default passport;

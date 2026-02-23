import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username : {
         type : String,
         required : true,
         unique : true,
         lowercase : true,
         trim : true,
         index : true  // index help in search process of username
    },
    email : {
         type : String,
         required : true,
         unique : true,
         lowercase : true,
         trim : true
    },
    fullName : {
         type : String,
         required : true,
         trim : true,
         index : true
    },
    avatar : {
         type : String,  // cloudinary url
         required: true
    },
    coverImage : {
        type : String, // cloudinary url
    },
    watchHistory : [
        {
            type : Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    password : {
        type : String,
        required : [true, "Password is required"]
    },
    refreshToken : {
        type : String
    }
},{timestamps : true})


// pre hook , when data save then before save data this hook and callback function run
userSchema.pre("save",async function () {
    if(!this.isModified("password"))  return // if password field not modified then it directly return outside function

    this.password = await bcrypt.hash(this.password,10)   //encrypt the password
})

userSchema.methods.isPasswordCorrct = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            // payload (data)
            _id : this._id,
            email : this.email,
            username : this.username,    
            fullName : this.fullName
        },
        // access token
        process.env.ACCESS_TOKEN_SECRET,
        {
            // access token expiry
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            // payload (data)
            _id : this._id,
        },
        // refresh token
        process.env.REFRESH_TOKEN_SECRET,
        {
            // refresh token expiry
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema)
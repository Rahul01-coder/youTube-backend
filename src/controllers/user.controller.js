import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) =>{

//get user detail from frontend
    const {username, fullName, email, password} = req.body
    console.log("email :",email)


// validation - not empty

    // is tarike se bhi kar sakte hai
    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required")
    // }

    if([fullName, username, email, password].some((field) =>
        field.trim() === "")
    ){
        throw new ApiError(400, "All field must be required :")
    }

// check if user already exists : username , email
    const existedUser = User.findOne({
        $or :[{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

// check for images , avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

// upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // check avatar is uploaded or not on cloudinary
    if(!avatar){
        throw new ApiError(400,"Avatar is required ")
    }

// create user object - create entry in db
    const user = await User.create({
        fullName,
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        username : username.toLowerCawe()
    })

    // check user is create or not in database
// remove password and refresh token field from response
    const createdUserCheck = User.findById(user._id).select(
        "-password -refreshToken"
    )

// check for user creation 
    if(!createdUserCheck){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

// return response
    return res.status(201).json(
        new ApiResponse(200,createdUserCheck,"user Register Successfully")
    )

})

export {registerUser}








// for example

// const registerUser = asyncHandler(async (req, res) =>{
//     res.status(200).json({
//         message : "ok"
//     })
// })
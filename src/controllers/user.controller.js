import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId) =>{
    try{
        const user = await User.findById(userId)

        // generate token
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // store refresh token in document
        user.refreshToken = refreshToken

        // save in db
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken}
    }catch(error){
        throw new ApiError(500, "something went wrong while generate refresh and access token ")
    }
}


// controller for register user
const registerUser = asyncHandler(async (req, res) =>{

//get user detail from frontend
    const {username, fullName, email, password} = req.body
    // console.log("email :",email)


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
    const existedUser = await User.findOne({
        $or :[{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

// check for images , avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(avatarLocalPath)

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // check avtar file path is available or not
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

// upload them to cloudinary :- avatar, coverImage
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log(avatar)
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // check avatar is uploaded or not on cloudinary
    if(!avatar){
        throw new ApiError(500, "Avatar upload failed on Cloudinary");
    }

// create user object - create entry in db
    const user = await User.create({
        fullName,
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        username : username.toLowerCase()
    })

    // check user is create or not in database
// remove password and refresh token field from response
    const createdUserCheck = await User.findById(user._id).select(
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


// controller for login use

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data fetch
    const {email, username, password} = req.body

    // username or email
    if( !(username || email) ){
        throw new ApiError(400, "username and password is required")
    }

    // find the user
    const user = await User.findOne({
        $or : [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user not found")
    }
    // password check
    const isPasswordValid = await user.isPasswordCorrct(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Password is incorrect !!")
    }
    // access and refresh token generate
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    // send cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, 
                refreshToken, 
                accessToken
            },
            "user logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true,
    }

    res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "user logged out successfully"))
})



// controller for generate (refresh ) new acess token 

const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(201)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            200,
            {accessToken, refreshToken : newRefreshToken},
            "Access token refreshed"
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res)=>{
    const {oldPassword, newPassword} = req.body

    if (!oldPassword && !newPassword){
        throw new ApiError(401, "fill all password field")
    }

    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrct(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse( 200, {}, "password change successfully" )
    )

})

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "current user fetch successfully")
    )
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400,"All filed are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                fullName,
                email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account update successfully")
    )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing ")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while avatar uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar update successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "cover Image file is missing ")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while cover Image uploading on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover Image update successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    // aggregatation pipeline
    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribedToCount :{
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscribersCount : 1,
                channelSubscribedToCount : 1,
                isSubscribed : 1,
                email : 1,
                avatar : 1,
                coverImage : 1
            }
        }
    ])

    console.log(channel)

    if(!channel?.length){
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "user channel fetched successfully")
    )
})

export {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}








// for example

// const registerUser = asyncHandler(async (req, res) =>{
//     res.status(200).json({
//         message : "ok"
//     })
// })
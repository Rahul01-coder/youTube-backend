import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

import dotenv from 'dotenv';
dotenv.config({
    path : './.env'
})

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY, 
    api_secret : process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    // console.log("Cloudinary API KEY:", process.env.CLOUDINARY_API_KEY);

    try{
        if (!localFilePath) return null 
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto",
            folder : "youtube-demo-project"
        }) 
        // file has been uploaded successfull
        // console.log("file is uploaded on cloudinary", response.url) ;

        fs.unlinkSync(localFilePath)
        return response ;

    }catch (error){
        console.error("Cloudinary Upload Error:", error);  
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null ;
    }

}

export {uploadOnCloudinary}
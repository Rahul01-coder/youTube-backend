// require('dotenv').config({path: './env'})

import connectDB from './db/index.js';
import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config({
    path : './.env'
})


connectDB()
.then(()=>{
    const server = app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`server is running at port : ${process.env.PORT}`)
    })
    server.on("error",(error)=>{
        console.log("http network error occur !!!!: ",error)
        process.exit(1)
    })
})
.catch((err)=>{
    console.log("MongoDB connection fail !!! :",err)
    process.exit(1)
})


/*
import mongoose from "mongoose";
import { DB_NAME } from "./constants";
import express from "express";
const app = express();

;(async ()=>{
        try{
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
            app.on("error", (error)=>{
                console.log("Error",error)
                throw error
            })
            app.listen(process.env.PORT, ()=>{
                console.log(`app is listening on port ${process.env.PORT}`)
            })
        }catch(error){
            console.error("Error :",error)
            throw error
        }

})()

*/
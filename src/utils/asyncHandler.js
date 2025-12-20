const asyncHandler = (requestHandler) =>{
    return (req,res,next) =>{
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((err)=> next(err))
    }
}

// sort version of this function 
/*
const asyncHandler = (requestHandler) =>
  (req, res, next) =>
    Promise.resolve(requestHandler(req, res, next)).catch(next);

export { asyncHandler };
*/

export { asyncHandler }







// one method for asyncHandler , it error handle everywhere, hard to scale, less flexible
/*
const asyncHandler = (fn) => async (req,res,next) =>{
    try{
        await fn(req, res, next)
    } catch(err) {
        res.status(err.code || 500).json({
            success : false,
            message : err.message
        })
    }
}

*/
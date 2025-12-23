const multer=require('multer')
const path= require('path')


module.exports={
    upload: multer({
        storage: multer.diskStorage({
            destination: function (req, file, callBack){
                callBack(null, 'Images/')     // './public/images/' directory name where save the file
            },
            filename: function (req, file, callBack) {
                let filename=Date.now()+path.extname(file.originalname)
                callBack(null, filename)
            },
            
        }),
        // limits:{fieldSize:'100000'},
        // filefilter: (req, file, callBack) => {
        //     const fileTypes=/jpeg|jpg|png|gif/
        //     const mimeType=fileTypes.test(file.mimetype)
        //     const extname=fileTypes.test(path.extname(file.originalname))

        //     if(mimeType && extname){
        //         return(null,true)
        //     }
        //     callBack('Give proper file type to upload')
            
        // }
    })
}
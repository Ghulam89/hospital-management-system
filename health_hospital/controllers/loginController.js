const User = require('../models/userModel');
const { compareSync, hashSync } = require('bcrypt');
const jwt = require("jsonwebtoken");



const loginuser = async (req, res) => {
    try {
        console.log(req.body);
        let info = {
            email: req.body.email,
            password: req.body.password,
        };
        
        const userData = await User.findOne({ email: info.email });
        
        if (userData) {
            if (req.body.password===userData.password) {
                // Generate JWT token for authentication

                const count = parseInt(userData?.loginCount) + 1

                const updateduser = await User.findByIdAndUpdate(
                    userData?._id,
                    { lastLogin: new Date(), loginCount: count },
                    { new: true }
                );

                console.log(updateduser);

                const token = jwt.sign({ id: userData?._id }, 'health', { expiresIn: '30d' });
 
                if (updateduser) {
                    res.status(200).json({
                        status: 'ok',
                        message: "Successfully logged in",
                        data: updateduser,
                        token
                    });
                }

            } else {
                res.status(200).json({
                    status: 'fail',
                    message: 'Wrong loginPassword',
                });
            }
        } else {
            res.status(200).json({
                status: 'fail',
                message: 'Email not found',
            });
        }
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};



const forgetuserloginPassword = async (req, res) => {
    try {
        let info = {
            email: req.body.email,
            phone: req.body.phone,
        };

        const guser = await User.findOne(info);

        if (guser) {
            res.status(200).json({
                status: 'ok',
                data: guser,
            });
        } else {
            res.status(200).json({
                status: 'fail',
                message: 'First Register yourself!',
            });
        }
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

const updateuserloginPassword = async (req, res) => {
    try {
        let info = {
            email: req.body.email,
            phone: req.body.phone,
        };

        const guser = await User.findOne(info);

        if (guser) {
            
            await User.findByIdAndUpdate(
                guser?._id,
                { password: req.body.password  },
                { new: true }
            );


            return res.status(200).json({
                status: 'ok',
                message: 'Updated Successfully',
                data: guser
            });
        } else {
            res.status(200).json({
                status: 'fail',
                message: 'First Register yourself!',
            });
        }
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

module.exports = {
    loginuser,
    forgetuserloginPassword,
    updateuserloginPassword,
};

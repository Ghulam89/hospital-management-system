const db = require('../models');


const Chat=db.chat

function chat(io) {
    // console.log(io);
    const ticketNsp = io.of("/yumhubb")
    ticketNsp.on("connection", (socket) => {
        console.log("socket connected");

        socket.on("newMessage", async (data) => {
            try {
                let info = {
                    riderId: data.riderId,
                    customerId: data.customerId,
                    businessId: data.businessId,
                    sender: data.sender,
                    message: data.message,
                    date: data.date,
                    status: true,
                    view: data.sender==='user'?false:true,
                }
        
                const chat = await Chat.create(info)
                // await message.save()
                ticketNsp.emit("getMessage",chat )

                console.log(chat);


            } catch (err) {
                console.log(err)
            }
        })
    })
}

module.exports = chat
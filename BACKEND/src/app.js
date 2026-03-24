import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

import { createServer } from "http";
import { Server } from "socket.io";

const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(bodyParser.urlencoded())



///routes import
import userRouter from "./routes/user.routes.js"


///routes delaration
app.use("/api/v1/users",userRouter)


////goals router import
import goalsTrackerRouter from "./routes/goals-tracker.routes.js"

app.use("/api/v1/goalsTracker" , goalsTrackerRouter);


/////profile router import
import profileRouter from "./routes/profile.routes.js";

app.use("/api/v1/profile", profileRouter);


/////connection router import

import connectionRouter from "./routes/connection.routes.js";
import searchRouter from "./routes/search.routes.js";

app.use("/api/v1/connections", connectionRouter);
app.use("/api/v1/search", searchRouter);




////chats routes

import messageRouter from "./routes/message.routes.js";
app.use("/api/v1/messages", messageRouter);



const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});

import { initializeChatSocket } from "./sockets/chat.socket.js";
initializeChatSocket(io);

///http://localhost:8000/api/v1/users/register
export { httpServer as app, io };

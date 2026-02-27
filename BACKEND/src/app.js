import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";

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

app.use("/api/v1/goalsTracker" , goalsTrackerRouter)


///http://localhost:8000/api/v1/users/register
export { app };

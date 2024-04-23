import { connect } from "mongoose";

export const connectToDatabase = async () => {
    try {
        await connect(`mongodb+srv://admin:${process.env.MONGODB_PASSWORD}@node-express.lgmpiki.mongodb.net/?retryWrites=true&w=majority&appName=node-express`)
    } catch (error) {
        console.log(error)
        return error;
    }
}
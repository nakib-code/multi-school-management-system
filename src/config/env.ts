import dotenv from "dotenv"
import path from "path"

dotenv.config({path: path.join(process.cwd(), ".env")})

export default {
    database_url : process.env.DATABASE_URL as string,
    port: process.env.PORT,
    jwt_secret: process.env.JWT_SECRET!,
    node_env: process.env.NODE_ENV!
}
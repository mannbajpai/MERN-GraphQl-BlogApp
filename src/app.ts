import express from "express";
import { config } from "dotenv";
import { connectToDatabase } from "./utils/connection";
import { graphqlHTTP } from "express-graphql";
import schema from "./handlers/handler";
// Dotenv configuration
config();

const app = express();

// Graphql Middleware configuration
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

connectToDatabase()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("The Server is running on port " + process.env.PORT);
    });
  })
  .catch((err) => console.log(err));

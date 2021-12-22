import app from "./App";
import * as config from "./config.json";

const port = process.env.PORT || config.server.port;

app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});

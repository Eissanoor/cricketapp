var express = require("express");


var app = express();
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

var PORT = process.env.PORT || 3001;



app.use(express.urlencoded({ extended: false }));
app.use(express.json());
require("./database/db");
var admin = require("./router/admin");
app.use(admin);
app.use((error, req, res, next) =>
{
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = null;
  const success = false;
  res
    .status(status)
    .json({ message: message, status: status, success: success, data: data });
});
var swaggerUi = require("swagger-ui-express"),
  swaggerDocument = require("./swagger.json");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.listen(PORT, function ()
{
  console.log("server is runing ".concat(PORT));
});
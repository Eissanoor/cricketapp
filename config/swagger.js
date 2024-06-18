const swaggerJSDoc = require("swagger-jsdoc");

// Define the router file name
const routerFileName = "super_admin.js"; // This could also come from process.env or another source

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Cric Media",
    version: "1.0.0",
    description: "APIs Documentation",
  },
};

const options = {
  swaggerDefinition,
  apis: [`./router/${routerFileName}`], // Use the variable in the file path
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;

const path = require("path");

const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Cric Media",
    version: "1.0.0",
    description: "APIs Documentation",
    contact: {
      name: "Wasim Zaman",
      email: "wasim@sairatec-solutions.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3002",
      description: "Development server",
    },
    {
      url: "https://backend.afghancricmedia.com",
      description: "Production server",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [path.join(__dirname, "./swaggerDef.js")],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;

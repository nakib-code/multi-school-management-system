import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Multi-School Management System API",
      version: "1.0.0",
      description:
        "API documentation for the Multi-School Management System.",
    },
    servers: [
      {
        url: "http://localhost:5001/api/v1",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
        },
      },
    },
    tags: [
      { name: "Authentication" },
      { name: "Schools" },
      { name: "Students" },
      { name: "Admissions" },
    ],
  },
  apis: ["./src/modules/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

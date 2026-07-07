import express from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/*
 * --------------------------------------------------
 * Employee Data
 * --------------------------------------------------
 */

const employees = [
  {
    id: 1,
    name: "Rahul Ghosh",
    designation: "Junior Developer",
    department: "CMO"
  },
  {
    id: 2,
    name: "Pramathesh Chatterjee",
    designation: "Senior Developer",
    department: "CMO"
  },
  {
    id: 3,
    name: "Sudipta Biswas",
    designation: "Lead Developer",
    department: "CMO"
  }
];


/*
 * --------------------------------------------------
 * Shared Employee Functions
 * --------------------------------------------------
 */

function getEmployees() {
  return employees;
}


function getEmployeeById(id) {
  return employees.find(
    employee => employee.id === Number(id)
  );
}


/*
 * --------------------------------------------------
 * REST API
 * --------------------------------------------------
 */

app.get("/", (req, res) => {
  res.send("Employee API + MCP Server is running");
});


app.get("/employees", (req, res) => {
  res.json(getEmployees());
});


app.get("/employees/:id", (req, res) => {

  const employee = getEmployeeById(req.params.id);

  if (!employee) {
    return res.status(404).json({
      message: "Employee not found"
    });
  }

  res.json(employee);
});


/*
 * --------------------------------------------------
 * MCP Server
 * --------------------------------------------------
 */

const transports = {};


function buildMcpServer() {

  const server = new McpServer({
    name: "employee-mcp-server",
    version: "1.0.0"
  });


  /*
   * MCP Tool: Get All Employees
   */

  server.tool(
    "get_employees",
    "Get all employees from the Employee API",
    {},
    async () => {

      const result = getEmployees();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );


  /*
   * MCP Tool: Get Employee By ID
   */

  server.tool(
    "get_employee_by_id",
    "Get one employee by ID",
    {
      id: z.number().describe("Employee ID")
    },
    async ({ id }) => {

      const employee = getEmployeeById(id);

      if (!employee) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                message: "Employee not found"
              })
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(employee, null, 2)
          }
        ]
      };
    }
  );


  return server;
}


/*
 * --------------------------------------------------
 * MCP POST Endpoint
 * --------------------------------------------------
 */

app.post("/mcp", async (req, res) => {

  const sessionId = req.headers["mcp-session-id"];

  let transport;


  /*
   * Existing MCP Session
   */

  if (sessionId && transports[sessionId]) {

    transport = transports[sessionId];

  }


  /*
   * New MCP Session
   */

  else if (!sessionId && isInitializeRequest(req.body)) {

    transport = new StreamableHTTPServerTransport({

      sessionIdGenerator: () => randomUUID(),

      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      }

    });


    transport.onclose = () => {

      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }

    };


    const server = buildMcpServer();

    await server.connect(transport);

  }


  /*
   * Invalid MCP Request
   */

  else {

    return res.status(400).json({

      jsonrpc: "2.0",

      error: {
        code: -32000,
        message: "Bad Request: No valid session ID"
      },

      id: null

    });

  }


  await transport.handleRequest(
    req,
    res,
    req.body
  );

});


/*
 * --------------------------------------------------
 * MCP GET / DELETE Endpoint
 * --------------------------------------------------
 */

const handleMcpSession = async (req, res) => {

  const sessionId = req.headers["mcp-session-id"];

  const transport = transports[sessionId];


  if (!transport) {

    return res
      .status(400)
      .send("Invalid or missing session ID");

  }


  await transport.handleRequest(req, res);

};


app.get("/mcp", handleMcpSession);

app.delete("/mcp", handleMcpSession);


/*
 * --------------------------------------------------
 * Start Server
 * --------------------------------------------------
 */

app.listen(PORT, () => {

  console.log(
    `Employee API + MCP Server running on port ${PORT}`
  );

  console.log(
    `REST API: http://localhost:${PORT}/employees`
  );

  console.log(
    `MCP Endpoint: http://localhost:${PORT}/mcp`
  );

});
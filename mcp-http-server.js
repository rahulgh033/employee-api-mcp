import express from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const app = express();
app.use(express.json());

const transports = {};

function buildServer() {
  const server = new McpServer({
    name: "employee-mcp-http-server",
    version: "1.0.0"
  });

  server.tool("get_employees", "Get all employees from the Employee API", {}, async () => {
    const r = await fetch("http://localhost:3000/employees");
    return { content: [{ type: "text", text: JSON.stringify(await r.json(), null, 2) }] };
  });

  server.tool("get_employee_by_id", "Get one employee by ID", {
    id: z.number().describe("Employee ID")
  }, async ({ id }) => {
    const r = await fetch(`http://localhost:3000/employees/${id}`);
    return { content: [{ type: "text", text: JSON.stringify(await r.json(), null, 2) }] };
  });

  return server;
}

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) delete transports[transport.sessionId];
    };

    const server = buildServer();
    await server.connect(transport);
  } else {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID" },
      id: null
    });
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSession = async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const transport = transports[sessionId];

  if (!transport) {
    return res.status(400).send("Invalid or missing session ID");
  }

  await transport.handleRequest(req, res);
};

app.get("/mcp", handleSession);
app.delete("/mcp", handleSession);

app.listen(3001, () => {
  console.log("MCP HTTP server running at http://localhost:3001/mcp");
});
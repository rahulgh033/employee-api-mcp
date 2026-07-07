import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "employee-mcp-server",
  version: "1.0.0"
});

server.tool(
  "get_employees",
  "Get all employees from the Employee API",
  {},
  async () => {
    const response = await fetch("http://localhost:3000/employees");
    const employees = await response.json();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(employees, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_employee_by_id",
  "Get one employee by ID",
  {
    id: z.number().describe("Employee ID")
  },
  async ({ id }) => {
    const response = await fetch(`http://localhost:3000/employees/${id}`);
    const employee = await response.json();

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

const transport = new StdioServerTransport();
await server.connect(transport);
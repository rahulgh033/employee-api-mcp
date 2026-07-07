# Employee REST API + MCP Server POC

A proof-of-concept Node.js application that exposes Employee data through:

- A traditional REST API
- An MCP (Model Context Protocol) server
- MCP Streamable HTTP transport
- A public Render deployment

The long-term goal of this project is to explore integration between Pega applications, AI agents, and MCP-based tools.

---

## Project Goal

Build a simple Employee REST API, expose Employee operations as MCP tools, deploy the application publicly, and prepare the architecture for future Pega integration.

---

## Architecture

```text
                    ┌─────────────────────┐
                    │    MCP Client       │
                    │  AI Agent / Pega    │
                    └──────────┬──────────┘
                               │
                               │ MCP
                               │ Streamable HTTP
                               ▼
                    ┌─────────────────────┐
                    │     MCP Server      │
                    │                     │
                    │       /mcp          │
                    └──────────┬──────────┘
                               │
                               │ Shared Employee
                               │ Service Functions
                               ▼
                    ┌─────────────────────┐
                    │    Employee Data    │
                    └─────────────────────┘
                               ▲
                               │
                               │ REST
                               │
                    ┌──────────┴──────────┐
                    │   REST API Client   │
                    └─────────────────────┘
```

Both the REST API and MCP tools run inside the same Node.js/Express application.

The MCP tools reuse the same Employee service functions used by the REST API.

This avoids unnecessary HTTP calls from the MCP server back into the REST API running in the same application.

---

## Technology Stack

- Node.js
- Express
- Model Context Protocol (MCP)
- MCP TypeScript SDK for JavaScript/Node.js
- Streamable HTTP transport
- Zod
- Git
- GitHub
- Render

---

## Project Structure

```text
employee-api/
│
├── server.js
├── mcp-http-server.js
├── mcp-server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

`server.js` is the current combined application entry point.

The standalone MCP server files are retained as part of the POC development history.

---

## REST API Endpoints

### Health / Root Endpoint

```text
GET /
```

Example:

```bash
curl https://employee-api-mcp.onrender.com/
```

---

### Get All Employees

```text
GET /employees
```

Example:

```bash
curl https://employee-api-mcp.onrender.com/employees
```

Example response:

```json
[
  {
    "id": 1,
    "name": "Rahul Ghosh",
    "designation": "Junior Developer",
    "department": "CMO"
  },
  {
    "id": 2,
    "name": "Pramathesh Chatterjee",
    "designation": "Senior Developer",
    "department": "CMO"
  },
  {
    "id": 3,
    "name": "Sudipta Biswas",
    "designation": "Lead Developer",
    "department": "CMO"
  }
]
```

---

### Get Employee By ID

```text
GET /employees/:id
```

Example:

```bash
curl https://employee-api-mcp.onrender.com/employees/2
```

Example response:

```json
{
  "id": 2,
  "name": "Pramathesh Chatterjee",
  "designation": "Senior Developer",
  "department": "CMO"
}
```

If the employee does not exist:

```json
{
  "message": "Employee not found"
}
```

---

## MCP Endpoint

The MCP server is available at:

```text
POST /mcp
GET /mcp
DELETE /mcp
```

Public endpoint:

```text
https://employee-api-mcp.onrender.com/mcp
```

The server uses MCP Streamable HTTP transport with session management.

A valid MCP client must initialize a session before discovering or calling tools.

---

## Available MCP Tools

### `get_employees`

Returns all Employees.

Input schema:

```json
{}
```

Conceptual call:

```text
get_employees()
```

---

### `get_employee_by_id`

Returns one Employee using the Employee ID.

Input schema:

```json
{
  "id": "number"
}
```

Conceptual call:

```text
get_employee_by_id(id: 2)
```

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/rahulgh033/employee-api-mcp.git
```

Enter the project directory:

```bash
cd employee-api-mcp
```

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

Expected output:

```text
Employee API + MCP Server running on port 3000
REST API: http://localhost:3000/employees
MCP Endpoint: http://localhost:3000/mcp
```

---

## Local REST API Testing

Test the root endpoint:

```bash
curl http://localhost:3000/
```

Get all Employees:

```bash
curl http://localhost:3000/employees
```

Get one Employee:

```bash
curl http://localhost:3000/employees/1
```

Test an Employee that does not exist:

```bash
curl http://localhost:3000/employees/999
```

---

## MCP Protocol Testing

The deployed MCP server was tested manually using `curl`.

The test flow was:

```text
initialize
    ↓
Receive MCP Session ID
    ↓
tools/list
    ↓
tools/call
    ↓
get_employees
    ↓
tools/call
    ↓
get_employee_by_id
```

---

## 1. Initialize MCP Session

```bash
curl -i -X POST https://employee-api-mcp.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test-client",
        "version": "1.0.0"
      }
    }
  }'
```

The server returns an MCP session header:

```text
mcp-session-id: <SESSION_ID>
```

Save this value for subsequent requests.

---

## 2. Discover MCP Tools

Replace `<SESSION_ID>` with the session ID returned by the initialize request.

```bash
curl -i -X POST https://employee-api-mcp.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

Expected tools:

```text
get_employees
get_employee_by_id
```

---

## 3. Call `get_employees`

```bash
curl -i -X POST https://employee-api-mcp.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_employees",
      "arguments": {}
    }
  }'
```

The MCP server returns the Employee list as MCP tool content.

---

## 4. Call `get_employee_by_id`

```bash
curl -i -X POST https://employee-api-mcp.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_employee_by_id",
      "arguments": {
        "id": 2
      }
    }
  }'
```

Expected MCP tool result:

```json
{
  "id": 2,
  "name": "Pramathesh Chatterjee",
  "designation": "Senior Developer",
  "department": "CMO"
}
```

---

## MCP Session Lifecycle

The Streamable HTTP server maintains MCP transports using the MCP session ID.

Conceptually:

```text
Client
   │
   │ initialize
   ▼
MCP Server
   │
   │ Create Transport
   │
   │ Generate Session ID
   ▼
Session Store
   │
   │
   ▼
Client receives mcp-session-id
   │
   │ tools/list
   │ tools/call
   │ GET /mcp
   │ DELETE /mcp
   ▼
Existing MCP Transport
```

Requests without a valid session ID are rejected unless the request is a valid MCP `initialize` request.

---

## Deployment

The application is deployed as a Render Web Service.

Build command:

```text
npm install
```

Start command:

```text
npm start
```

The application listens on:

```js
process.env.PORT || 3000
```

This allows Render to dynamically assign the service port while retaining port `3000` for local development.

---

## Live Application

REST API:

```text
https://employee-api-mcp.onrender.com/employees
```

MCP Endpoint:

```text
https://employee-api-mcp.onrender.com/mcp
```

GitHub Repository:

```text
https://github.com/rahulgh033/employee-api-mcp
```

---

## Verified POC Capabilities

The following functionality has been successfully tested:

- Employee REST API running locally
- Employee lookup by ID
- Employee not-found handling
- REST API and MCP server running in one Express application
- MCP Streamable HTTP transport
- MCP initialization handshake
- MCP session creation
- MCP session reuse
- MCP `tools/list`
- MCP `tools/call`
- `get_employees` MCP tool
- `get_employee_by_id` MCP tool
- Git version control
- GitHub repository deployment
- Render cloud deployment
- Public REST API access
- Public MCP endpoint access
- MCP tool execution against the deployed Render service

---

## Current POC Status

```text
Employee REST API          COMPLETE
        ↓
MCP Server                 COMPLETE
        ↓
Streamable HTTP            COMPLETE
        ↓
MCP Tool Discovery         COMPLETE
        ↓
MCP Tool Execution         COMPLETE
        ↓
GitHub Deployment          COMPLETE
        ↓
Render Deployment          COMPLETE
        ↓
Pega Integration           NEXT
```

---

## Future Improvements

Potential next steps:

- Add `create_employee`
- Add `update_employee`
- Add `delete_employee`
- Move Employee data to PostgreSQL
- Add input validation
- Add automated tests
- Add structured logging
- Add authentication and authorization
- Add rate limiting
- Add health/readiness endpoints
- Add MCP Inspector testing
- Evaluate stateless vs stateful MCP deployment architecture
- Add persistent/distributed MCP session storage if horizontally scaling
- Evaluate Pega MCP client capabilities
- Build a Pega-to-MCP bridge if required
- Integrate MCP tools with Pega cases, data pages, or agentic workflows

---

## Future Pega Integration

Target architecture:

```text
Pega Application
        ↓
Pega Agent / Integration Layer
        ↓
MCP Client
        ↓
Streamable HTTP
        ↓
Employee MCP Server
        ↓
Employee Service Layer
        ↓
Employee Data
```

The next phase of this POC is to determine the best integration pattern for Pega to discover and invoke MCP tools.

---

## Author

Rahul Ghosh

GitHub: `rahulgh033`

---

## Disclaimer

This project is a proof of concept intended for learning, experimentation, and architecture exploration.

The current Employee data is stored in memory and the public MCP endpoint does not implement production-grade authentication, authorization, persistence, or distributed session management.
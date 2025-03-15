# Solana Model Context Protocol (MCP) Demo

This repository demonstrates a simple implementation of a Model Context Protocol (MCP) server for Solana development.

## What is MCP?

The Model Context Protocol (MCP) is a standardized interface for AI models to interact with tools and resources. This demo showcases a simple MCP server implementation that provides:

1. Basic RPC methods for Solana (getBalance, getAccountInfo, getTransaction)
2. Some helpful prompts for Solana development

## Prerequisites

- Node.js (v16 or higher recommended)
- pnpm package manager (v9.10.0 or compatible)

## Installation

Clone this repository and install dependencies:

```bash
git clone https://github.com/solana-foundation/solana-dev-mcp.git
cd solana-dev-mcp
pnpm install
```

To run this server in the MCP inspector, use:

```bash
npx @modelcontextprotocol/inspector ts-node index.ts
```

## Getting Started

1. **Explore the code**: The main implementation is in `index.ts`, which sets up an MCP server with simple fetching tools and some prompts.

2. **Modify the server**: You can extend the server by adding more tools, resources, and prompts.

3. **Get ideas for extensions**: Check out the [Ideas Extending MCP for Solana Development](#ideas-extending-mcp-for-solana-development) section to get inspiration for new tools and resources to add.

## Example Usage

This section explains how to use the Solana MCP server in [Claude](https://modelcontextprotocol.io/quickstart/user).
Follow the same steps to use the Solana MCP server in [Windsurf](https://docs.codeium.com/windsurf/mcp) and [Cursor](https://docs.cursor.com/context/model-context-protocol).

### Generate the configuration file

To use this Solana MCP server, you need to generate a configuration file that Claude can use to connect to the server. Run one of the following commands to generate the configuration file:

- `pnpm generate-config` if you have `ts-node` installed globally
- `pnpm build && pnpm generate-config:js` if you don't have `ts-node` installed globally

This will print a JSON config with the following content:

If you have `ts-node`:

```json
{
  "mcpServers": {
    "solana-dev": {
      "command": "ts-node",
      "args": ["/path/to/your/solana-dev-mcp/index.ts"],
      "env": {
        "PAYER_PRIVATE_KEY": "${PAYER_PRIVATE_KEY}",
        "DUNE_API_KEY": "${DUNE_API_KEY}",
        "HELIUS_RPC_URL": "${HELIUS_RPC_URL}"
      }
    }
  }
}
```

If you don't have `ts-node` installed globally:

```json
{
  "mcpServers": {
    "solana-dev": {
      "command": "node",
      "args": ["/path/to/your/solana-dev-mcp/index.ts"],
      "env": {
        "PAYER_PRIVATE_KEY": "${PAYER_PRIVATE_KEY}",
        "DUNE_API_KEY": "${DUNE_API_KEY}",
        "HELIUS_RPC_URL": "${HELIUS_RPC_URL}"
      }
    }
  }
}
```

## Project Structure

- `index.ts` - Main server implementation
- `package.json` - Project dependencies and metadata
- `tsconfig.json` - TypeScript configuration

## Ideas Extending MCP for Solana Development

This MCP server implementation provides a foundation that you can extend or fork for your own Solana development needs. Here are some ideas to get you started:

### Ideas for Extension

1. **Priority Fee Estimator**: Add a tool that estimates optimal priority fees for Solana transactions based on recent network activity. This could help users optimize transaction costs while ensuring timely processing.

2. **Solana Verify Debugger**: Create a tool that helps debug issues with `solana-verify` by providing more detailed information about the verification process.

3. **Solana Security.txt Inspector**: Build a tool that extracts and displays the security.txt file information for a given Solana program, making it easier to contact the program's maintainers with security concerns.

4. **Squads Helper for Program Deployment**: Create a tool that automates the process of deploying and upgrading Solana programs, making it easier to manage program state across multiple environments.

5. **Anchor-Error Explainer**: Develop a tool that takes an error code and looks up the corresponding human-readable error message from the Anchor error code database.

6. **Enhanced Prompts**: Expand the server's prompt capabilities to provide more context-aware suggestions for Solana development tasks. For example, add prompts for common transaction patterns, account creation, or token operations.

7. **Transaction Builder**: Create tools that help construct complex transactions with multiple instructions, making it easier to interact with various Solana programs.

8. **Custom RPC Endpoints**: Allow configuration of custom RPC endpoints, including support for private RPC providers or local validators.

9. **Program Deployment Helpers**: Create tools that simplify the process of deploying and upgrading Solana programs.

10. **Account & Transaction Explorer**: Add a tool that takes an account or transaction ID and displays the contents in a human-readable format, similar to an explorer view. This could be useful for inspecting transaction data or account state without needing to manually decode the data.

11. **Solana, Anchor, and Protocol Documentation**: Add resources that load the Solana, Anchor, and Protocol documentation directly into the MCP editor, providing easy access to relevant information without needing to leave the editor. This could be implemented by fetching the documentation from the respective repositories and serving it as resources from the MCP server.

### How to Contribute

If you've built an extension that might be useful to others, consider submitting a pull request to this repository. Make sure to follow these guidelines:

1. Keep your code well-documented
2. Include tests for new functionality
3. Follow the existing code style
4. Update the README with information about your addition

# Security

This is a simple example and should not be used in production.
MCP is a new standard, and lacks proper security measures.

Please be extremely careful when installing & trying out MCP servers
from unknown developers.

Please use a sandboxed environment when trying out MCP servers, with no crucial information in it to prevent potential damage.


## Tools
### 1. getPriorityFee
- **Description**: Look up priority fee for a transaction.
- **Input**: 
  - `serealizedTransaction`: Serialized transaction.
- **Output**: Priority fee estimate.

### 2. generateSecurityTxt
- **Description**: Generate security.txt content for Solana programs.
- **Input**: Various fields including `name`, `project_url`, `contacts`, `policy`, etc.
- **Output**: Generated security.txt content and macro.

### 3. getProgramIdl
- **Description**: Fetch the IDL for a Solana program.
- **Input**: 
  - `programId`: Program ID.
- **Output**: IDL in JSON format.

### 4. createGPAFilters
- **Description**: Create getProgramAccounts filters based on a program's IDL.
- **Input**: 
  - `programId`: Program ID.
- **Output**: GPA filters and account types.

### 5. testProgramIdl
- **Description**: Test a Solana program IDL with input JSON and simulate the transaction onchain.
- **Input**: 
  - `programId`: Program ID.
  - `inputJson`: JSON input for the instruction.
  - `instructionName`: Name of the instruction to test.
- **Output**: Simulation result.

### 6. lookupProgramAuth
- **Description**: Check the program authority for a given program ID.
- **Input**: 
  - `programId`: Program ID.
- **Output**: Program authority public key.

### 7. checkupProgram
- **Description**: Check if a program has verified build and security.txt.
- **Input**: 
  - `programId`: Program ID.
- **Output**: Verification status and security.txt content.

### 8. checkProgramDeployment
- **Description**: Check various aspects of a Solana program deployment.
- **Input**: 
  - `programId`: Program ID.
- **Output**: Detailed report on program deployment.

### 9. createCPI
- **Description**: Generate an example CPI statement for a given Solana program.
- **Input**: 
  - `programId`: Program ID.
  - `instructionName`: Name of the instruction.
- **Output**: CPI example, program IDL, and cluster information.

### 10. getDuneSolanaData
- **Description**: Fetch Solana program data from Dune Analytics. Instruction count, program calls, and CPI program calls data, and top 1000 signers.
- **Input**: 
  - `programId`: Program ID.
  - `days`: Number of days to look back (default: 10).
- **Output**: Top 1000 signers, program calls, and CPI program calls data.

### 11. buildTransaction
- **Description**: Build a transaction from a list of instructions.
- **Input**: 
  - `instructions`: An array of instruction objects, each containing:
    - `programId`: The program ID (as a string)
    - `keys`: An array of account key objects, each containing:
      - `pubkey`: The public key (as a string)
      - `isSigner`: Boolean indicating if the account is a signer
      - `isWritable`: Boolean indicating if the account is writable
    - `data`: Base58 encoded instruction data
  - `recentBlockhash` (optional): Recent blockhash to use for the transaction
  
- **Output**: 
  - Serialized transaction (base64 encoded)
  - Transaction details in JSON format

### 12. checkTransaction
- **Description**: Fetch and analyze transaction details using the Helius API.
- **Input**: 
  - `signature`: The transaction signature (a 64-byte base58 encoded string).
- **Output**: 
  - Transaction analysis including signature, timestamp, success status, fee, number of instructions, and involved accounts.
  - Full transaction data as returned by the Helius API.

**Note**: This tool requires the `HELIUS_API_KEY` to be set in the environment variables.



To use these tools, you need to set up the necessary environment variables and dependencies. Each tool can be called with the required input parameters, and it will return the specified output.

For tools that require API keys or specific setup (like Dune Analytics or Helius RPC), make sure to configure those properly in your environment.
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BN } from "@project-serum/anchor";
import { QueryParameter, DuneClient } from "@duneanalytics/client-sdk";

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Transaction,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import * as fs from "fs";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { bs58, utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { BorshAccountsCoder } from "@project-serum/anchor";
import { createCPI } from "./solanaprogram";

// Create an MCP server
const server = new McpServer({
  name: "Solana RPC Tools",
  version: "1.0.0",
});
function logToFile(message: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;

  fs.appendFile("app.log", logMessage, (err) => {
    //   if (err) {
    //     console.error('Error writing to log file:', err);
    //   }
  });
}
// Initialize Solana connection
const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

// Solana RPC Methods as Tools

// Get Account Info
server.tool(
  "getAccountInfo",
  "Used to look up account info by public key (32 byte base58 encoded address)",
  { publicKey: z.string() },
  async ({ publicKey }) => {
    try {
      const pubkey = new PublicKey(publicKey);
      const accountInfo = await connection.getAccountInfo(pubkey);
      return {
        content: [{ type: "text", text: JSON.stringify(accountInfo, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

// Get Balance
server.tool(
  "getBalance",
  "Used to look up balance by public key (32 byte base58 encoded address)",
  { publicKey: z.string() },
  async ({ publicKey }) => {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await connection.getBalance(pubkey);
      return {
        content: [
          {
            type: "text",
            text: `${balance / LAMPORTS_PER_SOL} SOL (${balance} lamports)`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

// Get Minimum Balance For Rent Exemption
server.tool(
  "getMinimumBalanceForRentExemption",
  "Used to look up minimum balance required for rent exemption by data size",
  { dataSize: z.number() },
  async ({ dataSize }) => {
    try {
      const minBalance = await connection.getMinimumBalanceForRentExemption(
        dataSize
      );
      return {
        content: [
          {
            type: "text",
            text: `${
              minBalance / LAMPORTS_PER_SOL
            } SOL (${minBalance} lamports)`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

// Get Transaction
server.tool(
  "getTransaction",
  "Used to look up transaction by signature (64 byte base58 encoded string)",
  { signature: z.string() },
  async ({ signature }) => {
    try {
      const transaction = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

// Get Priority Fee
server.tool(
  "getPriorityFee",
  "Used to look up priority fee Transaction Info",
  { serealizedTransaction: z.string() },
  async ({ serealizedTransaction }) => {
    try {
      const HeliusURL = process.env.HELIUS_RPC_URL;
      if (!HeliusURL) {
        throw new Error("HELIUS_RPC_URL environment variable is not set");
      }

      const response = await fetch(HeliusURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getPriorityFeeEstimate",
          params: [
            {
              transaction: serealizedTransaction,
              options: { includeAllPriorityFeeLevels: true },
            },
          ],
        }),
      });

      const result = await response.json();
      const priorityFee = result.result;
      return {
        content: [{ type: "text", text: JSON.stringify(priorityFee, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);
server.tool(
    "generateSecurityTxt",
    "Generate security.txt content for Solana programs",
    {
      name: z.string(),
      project_url: z.string().url(),
      contacts: z.string(),
      policy: z.string(),
      preferred_languages: z.string().optional(),
      encryption: z.string().optional(),
      source_code: z.string().url().optional(),
      source_release: z.string().optional(),
      source_revision: z.string().optional(),
      auditors: z.string().optional(),
      acknowledgements: z.string().optional(),
      expiry: z.string().optional(),
    },
    async (input) => {
      const content = Object.entries(input)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}\0${value}\0`)
        .join('');
  
      const securityTxt = `"=======BEGIN SECURITY.TXT V1=======\\0${content}=======END SECURITY.TXT V1=======\\0"`;
  
      const macro = `#[macro_export]
  macro_rules! security_txt {
      () => {
          #[cfg_attr(target_arch = "bpf", link_section = ".security.txt")]
          #[allow(dead_code)]
          #[no_mangle]
          pub static security_txt: &str = ${securityTxt};
      };
  }
  
  security_txt!();`;
  
      return {
        content: [
          { type: "text", text: "Generated security.txt content:" },
          { type: "text", text: securityTxt },
          { type: "text", text: "Generated macro:" },
          { type: "text", text: macro },
        ],
      };
    }
  );
server.tool(
  "getProgramIdl",
  "Used to fetch the IDL for a Solana program",
  { programId: z.string() },
  async ({ programId }) => {
    try {
      const programPublicKey = new PublicKey(programId);

      // Try multiple methods to fetch the IDL
      let idl;

      // Method 1: Using Anchor's fetchIdl
      try {
        const provider = new anchor.AnchorProvider(connection, {} as any, {});
        idl = await anchor.Program.fetchIdl(programPublicKey, provider);
        if (idl) {
          logToFile("IDL fetched using Anchor's fetchIdl");
          return {
            content: [{ type: "text", text: JSON.stringify(idl, null, 2) }],
          };
        }
      } catch (e) {
        logToFile(`Error fetching IDL with Anchor: ${e}`);
      }

      // Method 2: Manual account fetching
      const [idlAddress] = await PublicKey.findProgramAddress(
        [Buffer.from("anchor:idl"), programPublicKey.toBuffer()],
        programPublicKey
      );

      logToFile(`Trying IDL address: ${idlAddress.toString()}`);

      const idlAccount = await connection.getAccountInfo(idlAddress);

      if (idlAccount) {
        const idlData = idlAccount.data.slice(8); // Skip discriminator
        idl = JSON.parse(idlData.toString());
        logToFile("IDL fetched manually from account");
        return {
          content: [{ type: "text", text: JSON.stringify(idl, null, 2) }],
        };
      }

      // Method 3: Try fetching from a known IDL registry (example: Shank IDL account)
      const [shankIdlAddress] = await PublicKey.findProgramAddress(
        [Buffer.from("shank:idl"), programPublicKey.toBuffer()],
        new PublicKey("SHANKxjhDKxhCjgSEhUvZy5uW8Xb4VuKLyAXJVZbDGr")
      );

      logToFile(`Trying Shank IDL address: ${shankIdlAddress.toString()}`);

      const shankIdlAccount = await connection.getAccountInfo(shankIdlAddress);

      if (shankIdlAccount) {
        idl = JSON.parse(shankIdlAccount.data.toString());
        logToFile("IDL fetched from Shank IDL account");
        return {
          content: [{ type: "text", text: JSON.stringify(idl, null, 2) }],
        };
      }

      logToFile("No IDL found using any method");
      return {
        content: [
          { type: "text", text: "No IDL found for the given program ID." },
        ],
      };
    } catch (error) {
      logToFile(`Error: ${(error as Error).message}`);
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);
server.tool(
  "createGPAFilters",
  "Used to create get Program Accounts filters for a Solana program based on its IDL",
  { programId: z.string() },
  async ({ programId }) => {
    try {
      const programPublicKey = new PublicKey(programId);

      // Fetch the IDL
      const provider = new anchor.AnchorProvider(connection, {} as any, {});
      const idl = await anchor.Program.fetchIdl(programPublicKey, provider);

      if (!idl) {
        throw new Error("IDL not found for the given program ID");
      }

      // Extract account types from the IDL
      const accountTypes = idl.accounts || [];

      // Create filters for each account type
      const filters = accountTypes.map((account) => {
        const discriminator = BorshAccountsCoder.accountDiscriminator(
          account.name
        );
        const discBase58 = bs58.encode(discriminator);
        return {
          memcmp: {
            offset: 0,
            bytes: discBase58,
          },
        };
      });

      logToFile(
        `Generated ${filters.length} GPA filters for program ${programId}`
      );

      return {
        content: [
          { type: "text", text: "GPA Filters:" },
          { type: "text", text: JSON.stringify(filters, null, 2) },
          { type: "text", text: "\nAccount Types:" },
          {
            type: "text",
            text: JSON.stringify(
              accountTypes.map((a) => a.name),
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logToFile(`Error: ${(error as Error).message}`);
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "testProgramIdl",
  "Test a Solana program IDL with input JSON",
  {
    programId: z.string(),
    inputJson: z.string(),
    instructionName: z.string(),
  },
  async ({ programId, inputJson, instructionName }) => {
    try {
      logToFile(JSON.stringify({ programId, inputJson, instructionName }));
      const payerPrivateKey = process.env.PAYER_PRIVATE_KEY;
      if (!payerPrivateKey) {
        throw new Error("PAYER_PRIVATE_KEY not found in environment variables");
      }

      const secretKey = bs58.decode(payerPrivateKey);
      const payer = Keypair.fromSecretKey(secretKey);

      const programPublicKey = new PublicKey(programId);

      // Fetch the IDL
      const provider = new anchor.AnchorProvider(connection, {} as any, {});
      const idl = await anchor.Program.fetchIdl(programPublicKey, provider);

      if (!idl) {
        return {
          content: [
            { type: "text", text: "No IDL found for the given program ID." },
          ],
        };
      }

      // Parse the input JSON
      const inputData = JSON.parse(inputJson);
      // Create a Program instance
      const program = new Program(idl, programPublicKey, provider);

      // Find the instruction in the IDL
      const ix = idl.instructions.find((ix) => ix.name === instructionName);
      if (!ix) {
        return {
          content: [
            {
              type: "text",
              text: `Instruction '${instructionName}' not found in IDL.`,
            },
          ],
        };
      }

      // Create a transaction instruction
      const keys = ix.accounts.map((acc) => {
        const accountInfo = inputData.accounts.find(
          (a: any) => a.name === acc.name
        );
        return {
          pubkey: new PublicKey(accountInfo?.pubkey || payer.publicKey),
          isSigner: "isSigner" in acc ? acc.isSigner : false,
          isWritable: "isMut" in acc ? acc.isMut : false,
        };
      });

      const args = ix.args.map((arg) => {
        const inputArg = inputData.args.find((a: any) => a.name === arg.name);
        const value = inputArg?.value;
        logToFile(
          `Processing arg: ${arg.name}, type: ${arg.type}, value: ${value}`
        );

        switch (arg.type) {
          case "u64":
          case "i64":
            const bnValue = new BN(value);
            logToFile(`Created BN: ${bnValue.toString()}`);
            return bnValue;
          case "publicKey":
            return new PublicKey(value);
          default:
            return value;
        }
      });
      logToFile("args" + JSON.stringify(args));

      const instructionDiscriminator = program.coder.instruction
        .encode(instructionName, [])
        .slice(0, 8);
      const expirationSlotBuffer = (args[0] as BN).toArrayLike(Buffer, "le", 8);
      const data = Buffer.concat([
        Buffer.from(instructionDiscriminator),
        expirationSlotBuffer,
      ]);

      const instruction = new TransactionInstruction({
        keys,
        programId: programPublicKey,
        data,
      });
      logToFile("instruction" + JSON.stringify(instruction));

      // Create a transaction
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = payer.publicKey;

      // Simulate the transaction
      const simulation = await provider.connection.simulateTransaction(
        transaction
      );

      return {
        content: [
          { type: "text", text: "Simulation result:" },
          { type: "text", text: JSON.stringify(simulation, null, 2) },
        ],
      };
    } catch (error) {
      logToFile(`Error: ${(error as Error).message}`);
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);
server.tool(
  "lookupProgramAuth",
  "Checks the program authority for a given program ID",
  { programId: z.string() },
  async ({ programId }) => {
    try {
      const programPubkey = new PublicKey(programId);
      const programInfo = await connection.getAccountInfo(programPubkey);
      if (!programInfo) throw new Error("Program not found");

      const programData = await connection.getAccountInfo(
        new PublicKey(programInfo.data.slice(4, 36))
      );
      if (!programData) throw new Error("Program data not found");

      const programAuthority = new PublicKey(programData.data.slice(0, 32));
      return {
        content: [
          {
            type: "text",
            text: `Program Authority: ${programAuthority.toBase58()}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "checkupProgram",
  "Checks if a program has verified build, security.txt",
  { programId: z.string() },
  async ({ programId }) => {
    try {
      // Fetch the security.txt content from verify.osec.io
      const response = await fetch(
        `https://verify.osec.io/status/${programId}`
      );
      const programPubkey = new PublicKey(programId);

      // Fetch the program account info
      const programInfo = await connection.getAccountInfo(programPubkey);
      if (!programInfo) {
        throw new Error("Program not found");
      }

      // The upgrade authority is stored in the first 32 bytes after the first 4 bytes
      const upgradeAuthorityPubkey = new PublicKey(
        programInfo.data.slice(4, 36)
      );

      // Fetch the upgrade authority account info
      const upgradeAuthorityInfo = await connection.getAccountInfo(
        upgradeAuthorityPubkey
      );
      if (!upgradeAuthorityInfo) {
        throw new Error("Upgrade authority account not found");
      }

      // Check if the upgrade authority is the BPFLoaderUpgradeableProgram
      const isVerified = upgradeAuthorityInfo.owner.equals(
        new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
      );

      const data = await response.json();
      // Extract the security.txt content
      const securityTxtContent = data;

      // Decode the account data

      return {
        content: [
          { type: "text", text: `Verified Build: ${isVerified}` },
          {
            type: "text",
            text: `Security.txt: ${JSON.stringify(
              securityTxtContent,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error) {
      logToFile(`Error: ${(error as Error).message}`);
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

server.resource(
  "solanaDocsInstallation",
  new ResourceTemplate("solana://docs/intro/installation", { list: undefined }),
  async (uri) => {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/solana-foundation/solana-com/main/content/docs/intro/installation.mdx`
      );
      const fileContent = await response.text();
      return {
        contents: [
          {
            uri: uri.href,
            text: fileContent,
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);
server.tool(
  "checkProgramDeployment",
  "Checks various aspects of a Solana program deployment",
  { programId: z.string() },
  async ({ programId }) => {
    try {
      const programPubkey = new PublicKey(programId);
      const provider = new anchor.AnchorProvider(connection, {} as any, {});
      let report = [];

      // 1. Check if program exists
      const programInfo = await connection.getAccountInfo(programPubkey);
      if (!programInfo) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Program with ID ${programId} not found.`,
            },
          ],
        };
      }
      report.push(`Program found: ${programId}`);

      // 2. Check for IDL
      let idl;
      try {
        idl = await Program.fetchIdl(programPubkey, provider);
        report.push("IDL: Found");
      } catch (error) {
        report.push("IDL: Not found or not accessible");
      }

      // Get program data account address
      const programDataAddress = new PublicKey(programInfo.data.slice(4, 36));

      // Fetch program data account
      const programData = await connection.getAccountInfo(programDataAddress);
      if (!programData) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Program data not found for ${programId}.`,
            },
          ],
        };
      }
      // Extract information safely
      const upgradeAuthorityAddress = new PublicKey(
        programData.data.slice(13, 45)
      );

      const upgradeAuthorityInfo = await connection.getAccountInfo(
        upgradeAuthorityAddress
      );

      const isVerified = upgradeAuthorityInfo?.owner.equals(
        new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
      );
      report.push(`upgradeAuthorityPubkey: ${upgradeAuthorityAddress}`);

      // 4. Check for multisig program authority
      const isOnCurve = PublicKey.isOnCurve(upgradeAuthorityAddress);
      const isMultisig = !isOnCurve;
      report.push(`Multisig: ${isMultisig ? "Yes" : "No"}`);

      // 5. Check for security.txt
      try {
        const response = await fetch(
          `https://verify.osec.io/status/${programId}`
        );
        const data = await response.json();
        if (data.is_verified) {
          report.push(`Security info: ${JSON.stringify(data, null, 2)}`);
        } else {
          report.push("Security info: Not found on verify.osec.io");
        }
      } catch (error) {
        report.push("Security info: Error checking verify.osec.io");
      }

      // 6. Check for potentially logged personal data
      if (idl) {
        const sensitiveFields = idl.instructions.flatMap((ix) =>
          ix.args.filter((arg) =>
            ["key", "secret", "password", "private"].some((keyword) =>
              arg.name.toLowerCase().includes(keyword)
            )
          )
        );
        if (sensitiveFields.length > 0) {
          report.push(
            "Warning: Potentially sensitive data in instruction arguments:"
          );
          sensitiveFields.forEach((field) => {
            report.push(`  - ${field.name} (${field.type})`);
          });
        } else {
          report.push(
            "No obvious sensitive data found in instruction arguments"
          );
        }
      }

      // 7. Check for program size
      const programSize = programInfo.data.length;
      report.push(`Program size: ${programSize} bytes`);

      // 8. Check for recent deployments or upgrades
      const signatures = await connection.getSignaturesForAddress(
        programPubkey,
        { limit: 10 }
      );
      const latestActivity =
        signatures.length > 0 && signatures[0].blockTime
          ? new Date(signatures[0].blockTime * 1000).toISOString()
          : "No recent activity";
      report.push(`Latest activity: ${latestActivity}`);

      return {
        content: [
          { type: "text", text: "Program Deployment Check Report:" },
          { type: "text", text: report.join("\n") },
        ],
      };
    } catch (error) {
      logToFile(`Error: ${(error as Error).message}`);
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "createCPI",
  "Generate an example CPI statement for a given Solana program",
  { programId: z.string(), instructionName: z.string() },
  async ({ programId, instructionName }) => {
    try {
      const result = await createCPI(programId, instructionName);

      if ("error" in result) {
        return {
          content: [{ type: "text", text: result.error || "Unknown error" }],
        };
      }

      return {
        content: [
          { type: "text", text: "CPI Example:" },
          {
            type: "text",
            text: result.cpiExample || "// No example generated",
            language: "rust",
          },
          { type: "text", text: "Program IDL:" },
          {
            type: "text",
            text: JSON.stringify(result.programIdl || {}, null, 2),
            language: "json",
          },
          { type: "text", text: `Cluster: ${result.cluster || "unknown"}` },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);
server.tool(
  "getDuneSolanaData",
  "Fetch Solana program data from Dune Analytics",
  { programId: z.string(), days: z.number().optional().default(10) },
  async ({ programId, days }) => {
    try {
      const DUNE_API_KEY = process.env.DUNE_API_KEY;
      if (!DUNE_API_KEY) {
        throw new Error("DUNE_API_KEY is not set in the environment variables");
      }

      const client = new DuneClient(DUNE_API_KEY);

      const [top1000signersResult, programCallsResult, cpiProgramCallsResult] = await Promise.all([
        client.runQuery({
          queryId: 2611952,
          query_parameters: [
            QueryParameter.text("program id", programId),
            QueryParameter.number("days", days),
          ],
        }),
        client.runQuery({
          queryId: 2611885,
          query_parameters: [
            QueryParameter.text("program id", programId),
            QueryParameter.number("days", days),
          ],
        }),
        client.runQuery({
          queryId: 2611938,
          query_parameters: [
            QueryParameter.text("program id", programId),
          ],
        })
      ]);

      const top1000signersdata = top1000signersResult.result?.rows;
      const programCallsdata = programCallsResult.result?.rows;
      const cpiProgramCallsdata = cpiProgramCallsResult.result?.rows;

      if (!top1000signersdata || !programCallsdata || !cpiProgramCallsdata) {
        return {
          content: [
            { type: "text", text: "No data returned from Dune Analytics." },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Dune Analytics data for Solana program ${programId} over the last ${days} days:`,
          },
          { type: "text", text: "Top 1000 Signers:" },
          { type: "text", text: JSON.stringify(top1000signersdata, null, 2) },
          { type: "text", text: "Program Calls:" },
          { type: "text", text: JSON.stringify(programCallsdata, null, 2) },
          { type: "text", text: "CPI Program Calls:" },
          { type: "text", text: JSON.stringify(cpiProgramCallsdata, null, 2) },
        ],
      };
    } catch (error) {
      logToFile(`Error fetching Dune data: ${(error as Error).message}`);
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
      };
    }
  }
);
server.resource(
  "solanaDocsClusters",
  new ResourceTemplate("solana://docs/references/clusters", {
    list: undefined,
  }),
  async (uri) => {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/solana-foundation/solana-com/main/content/docs/references/clusters.mdx`
      );
      const fileContent = await response.text();
      return {
        contents: [
          {
            uri: uri.href,
            text: fileContent,
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            text: `Error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.prompt(
  "calculate-storage-deposit",
  "Calculate storage deposit for a specified number of bytes",
  { bytes: z.string() },
  ({ bytes }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Calculate the SOL amount needed to store ${bytes} bytes of data on Solana using getMinimumBalanceForRentExemption.`,
        },
      },
    ],
  })
);

server.prompt(
  "minimum-amount-of-sol-for-storage",
  "Calculate the minimum amount of SOL needed for storing 0 bytes on-chain",
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Calculate the amount of SOL needed to store 0 bytes of data on Solana using getMinimumBalanceForRentExemption & present it to the user as the minimum cost for storing any data on Solana.`,
        },
      },
    ],
  })
);

server.prompt(
  "why-did-my-transaction-fail",
  "Look up the given transaction and inspect its logs to figure out why it failed",
  { signature: z.string() },
  ({ signature }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Look up the transaction with signature ${signature} and inspect its logs to figure out why it failed.`,
        },
      },
    ],
  })
);

server.prompt(
  "how-much-did-this-transaction-cost",
  "Fetch the transaction by signature, and break down cost & priority fees",
  { signature: z.string() },
  ({ signature }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Calculate the network fee for the transaction with signature ${signature} by fetching it and inspecting the 'fee' field in 'meta'. Base fee is 0.000005 sol per signature (also provided as array at the end). So priority fee is fee - (numSignatures * 0.000005). Please provide the base fee and the priority fee.`,
        },
      },
    ],
  })
);

server.prompt(
  "what-happened-in-transaction",
  "Look up the given transaction and inspect its logs & instructions to figure out what happened",
  { signature: z.string() },
  ({ signature }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Look up the transaction with signature ${signature} and inspect its logs & instructions to figure out what happened.`,
        },
      },
    ],
  })
);

// server.tool(
//   "uploadAndDeploySolanaProgram",
//   "Upload and deploy a Solana program (.so file)",
//   {
//     programData: z.string(), // Base64 encoded .so file
//     fileName: z.string().optional()
//   },
//   async ({ programData, fileName }) => {
//     try {
//       const payerPrivateKey = process.env.PAYER_PRIVATE_KEY;
//       if (!payerPrivateKey) {
//         return {
//           content: [{ type: "text", text: "Error: PAYER_PRIVATE_KEY not found in environment variables" }],
//         };
//       }

//       // Validate file extension
//       if (fileName && !fileName.endsWith('.so')) {
//         return {
//           content: [{ type: "text", text: "Error: File must be a Solana program (.so file)" }],
//         };
//       }

//       // Decode base64 program data
//       const buffer = Buffer.from(programData, 'base64');

//       // Basic validation of the binary
//       if (buffer.length < 32) {
//         return {
//           content: [{ type: "text", text: "Error: Invalid program file (too small)" }],
//         };
//       }

//       logToFile(`Deploying Solana program${fileName ? ` (${fileName})` : ''} with size ${buffer.length} bytes`);

//       const result = await uploadAndDeployProgram(
//         connection,
//         payerPrivateKey,
//         buffer
//       );

//       return {
//         content: [
//           { type: "text", text: "Program Deployment Status:" },
//           ...result.steps.map(step => ({ type: "text", text: step })),
//           { type: "text", text: `✅ Program deployed successfully!` },
//           { type: "text", text: `Program ID: ${result.programId.toBase58()}` }
//         ],
//       };
//     } catch (error) {
//       logToFile(`Error deploying program: ${(error as Error).message}`);
//       return {
//         content: [
//           { type: "text", text: "❌ Program deployment failed:" },
//           { type: "text", text: `Error: ${(error as Error).message}` }
//         ],
//       };
//     }
//   }
// );

// Keep the existing file-based tool for backward compatibility
// server.tool(
//   "uploadAndDeploySolanaProgramFromFile",
//   "Upload and deploy a Solana program from a local file path",
//   { programFilePath: z.string() },
//   async ({ programFilePath }) => {
//     try {
//       const payerPrivateKey = process.env.PAYER_PRIVATE_KEY;
//       if (!payerPrivateKey) {
//         throw new Error("PAYER_PRIVATE_KEY not found in environment variables");
//       }

//       const result = await uploadAndDeployProgram(
//         connection,
//         payerPrivateKey,
//         programFilePath
//       );

//       return {
//         content: [
//           ...result.steps.map(step => ({ type: "text", text: step })),
//           { type: "text", text: `Program deployed successfully! Program ID: ${result.programId.toBase58()}` }
//         ],
//       };
//     } catch (error) {
//       logToFile(`Error: ${(error as Error).message}`);
//       return {
//         content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
//       };
//     }
//   }
// );

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
server.connect(transport);

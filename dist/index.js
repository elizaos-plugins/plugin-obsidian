// src/actions/search.ts
import {
  elizaLogger as elizaLogger3
} from "@elizaos/core";

// src/helper.ts
import { ModelClass, MemoryManager } from "@elizaos/core";
import { elizaLogger as elizaLogger2, composeContext, generateObject, stringToUuid as stringToUuid2 } from "@elizaos/core";
import { lookup } from "mrmime";

// src/providers/obsidianClient.ts
import { createHash } from "node:crypto";
import {
  elizaLogger,
  knowledge,
  stringToUuid
} from "@elizaos/core";
var ObsidianProvider = class _ObsidianProvider {
  constructor(port = 27123, token, host_url) {
    this.port = port;
    this.token = token;
    this.host_url = host_url;
  }
  connected = false;
  runtime;
  static instance = null;
  /**
   * Creates an instance of the ObsidianProvider class.
   * @param runtime - The agent runtime.
   * @param port - The port number to use for the Obsidian server.
   * @param token - The authentication token for the Obsidian server.
   * @param host_url - The URL of the Obsidian server.
   * @returns An instance of the ObsidianProvider class.
   */
  static async create(runtime, port, token, host_url = `http://127.0.0.1:${port}`) {
    if (!this.instance) {
      this.instance = new _ObsidianProvider(port, token, host_url);
      await this.instance.connect();
      this.instance.runtime = runtime;
    }
    return this.instance;
  }
  /**
   * Opens a file in Obsidian by its path.
   * @param filePath - The path to the file within the vault.
   * @returns A promise that resolves when the file is successfully opened.
   */
  async connect() {
    if (this.connected) return;
    try {
      const response = await fetch(`${this.host_url}/`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const serverInfo = await response.json();
      if (!serverInfo.authenticated) {
        throw new Error("Failed to authenticate with Obsidian API");
      }
      this.connected = true;
    } catch (error) {
      elizaLogger.error("Failed to connect to Obsidian:", error.message);
      this.connected = false;
      throw error;
    }
  }
  /**
   * Retrieves a list of all notes within the vault.
   * @returns A promise that resolves to an array of note paths.
   */
  async listNotes() {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(`${this.host_url}/vault/`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const notes = await response.json();
      return notes;
    } catch (error) {
      elizaLogger.error("Failed to list notes:", error.message);
      throw error;
    }
  }
  /**
   * Retrieves the content of a specific note.
   * @param path - The path to the note within the vault.
   * @returns A promise that resolves to the content of the note.
   */
  async getNote(path) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/vault/${encodeURIComponent(
          path
        )}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            accept: "application/vnd.olrapi.note+json"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const noteContent = await response.json();
      return noteContent;
    } catch (error) {
      elizaLogger.error("Failed to fetch note content:", error);
      throw error;
    }
  }
  /**
   * Retrieves the content of the currently active note.
   * @returns A promise that resolves to the content of the active note.
   */
  async getActiveNote() {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/active/`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            accept: "application/vnd.olrapi.note+json"
          }
        }
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No active file found in Obsidian");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const noteContent = await response.json();
      return noteContent;
    } catch (error) {
      elizaLogger.error("Failed to fetch active note content:", error.message);
      throw error;
    }
  }
  /**
   * Saves the content of a note to the vault.
   * @param path - The path to the note within the vault.
   * @param content - The content to save to the note.
   * @param createDirectories - Whether to create directories if they don't exist.
   * @returns A promise that resolves when the note is successfully saved.
   */
  async saveNote(path, content, createDirectories = true) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const createDirsString = createDirectories.toString();
      const response = await fetch(
        `${this.host_url}/vault/${encodeURIComponent(path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "text/markdown",
            "X-Create-Directories": createDirsString
          },
          body: content
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      elizaLogger.error("Failed to save note:", error.message);
      throw error;
    }
  }
  /**
   * Retrieves a list of all files within the vault.
   * @returns A promise that resolves to an array of file paths.
   */
  async listFiles() {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(`${this.host_url}/vault/`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const vault = await response.json();
      return vault.files;
    } catch (error) {
      elizaLogger.error("Failed to list files:", error.message);
      throw error;
    }
  }
  /**
   * Retrieves a list of all files within a specific directory.
   * @param directoryPath - The path to the directory within the vault.
   * @returns A promise that resolves to an array of file paths.
   */
  async listDirectoryFiles(directoryPath) {
    if (!this.connected) {
      await this.connect();
    }
    if (directoryPath.match(/\/$/)) {
      directoryPath = `${directoryPath.replace(/\/$/, "")}`;
    }
    try {
      const response = await fetch(
        `${this.host_url}/vault/${encodeURIComponent(directoryPath)}/`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            accept: "application/json"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const vaultDirectory = await response.json();
      return vaultDirectory.files;
    } catch (error) {
      elizaLogger.error("Failed to list directory contents:", error.message);
      throw error;
    }
  }
  /**
   * Retrieves the content of a specific file from the vault.
   * @param path - The path to the file within the vault.
   * @returns A promise that resolves to the content of the file.
   */
  async readFile(path) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/vault/${encodeURIComponent(path)}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            accept: "text/markdown",
            "Content-Type": "text/markdown"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.text();
      return content;
    } catch (error) {
      elizaLogger.error("Failed to read file content:", error.message);
      throw error;
    }
  }
  /**
   * Opens a file in Obsidian by its path.
   * @param filePath - The path to the file within the vault.
   * @returns A promise that resolves when the file is successfully opened.
   */
  async openFile(filePath) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/open/${encodeURIComponent(filePath)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      elizaLogger.success(`Successfully opened file: ${filePath}`);
    } catch (error) {
      elizaLogger.error(`Failed to open file '${filePath}':`, error.message);
      throw error;
    }
  }
  /**
   * Saves the content of a file to the vault.
   * Note: Obsidian will create a new document at the path you have specified if such a document did not already exist
   * @param path - The path to the file within the vault.
   * @param content - The content to save to the file.
   * @param createDirectories - Whether to create directories if they don't exist.
   * @returns A promise that resolves when the file is successfully saved.
   */
  async saveFile(path, content, createDirectories = true) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const createDirsString = createDirectories.toString();
      const response = await fetch(
        `${this.host_url}/vault/${encodeURIComponent(path)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "text/markdown",
            "X-Create-Directories": createDirsString
          },
          body: content
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      elizaLogger.error("Failed to save file:", error.message);
      throw error;
    }
  }
  /**
   * Inserts content into a specific section of a file.
   * @param path - The path to the file within the vault.
   * @param content - The content to insert into the file.
   * @param lineNumber - The line number to insert the content at.
   * @returns A promise that resolves when the file is successfully patched.
   */
  async patchFile(path, content, lineNumber = 0) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/vault/${encodeURIComponent(path)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ content, line: lineNumber })
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      elizaLogger.error("Failed to patch file content:", error.message);
      throw error;
    }
  }
  /**
   * Retrieves a list of all available Obsidian commands.
   * @returns A promise that resolves to an array of command objects, each containing an ID and name.
   */
  async listCommands() {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/commands/`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            accept: "application/json"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const commands = await response.json();
      return commands;
    } catch (error) {
      elizaLogger.error("Failed to list commands:", error.message);
      throw error;
    }
  }
  /**
   * Executes an Obsidian command by its command ID.
   * @param commandId - The ID of the command to execute.
   * @returns A promise that resolves when the command is successfully executed.
   */
  async executeCommand(commandId) {
    if (!this.connected) {
      await this.connect();
    }
    try {
      const response = await fetch(
        `${this.host_url}/commands/execute`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ commandId })
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      elizaLogger.error("Failed to execute command:", error.message);
      throw error;
    }
  }
  /**
   * Searches for notes in the vault based on the provided query and options.
   * @param query - The query to search for. Can be a string or an object.
   * @param queryFormat - The format of the query (plaintext, dataview, or jsonlogic).
   * @param options - Additional options for the search.
   * @returns A promise that resolves to an array of search results.
   */
  async search(query, queryFormat = "plaintext", options = {}) {
    if (!this.connected) {
      await this.connect();
    }
    const { contextLength = 100 } = options;
    let contentType;
    let body;
    switch (queryFormat) {
      case "dataview":
        contentType = "application/vnd.olrapi.dataview.dql+txt";
        if (typeof query !== "string") {
          throw new Error("Dataview query must be a string.");
        }
        body = query;
        break;
      case "jsonlogic":
        contentType = "application/vnd.olrapi.jsonlogic+json";
        if (typeof query !== "object") {
          throw new Error("JsonLogic query must be an object.");
        }
        body = JSON.stringify(query);
        break;
      default:
        contentType = "application/json";
        if (typeof query !== "string") {
          throw new Error("Plaintext query must be a string.");
        }
        body = query;
        break;
    }
    try {
      elizaLogger.log(
        `Processing search query with format ${queryFormat}:`,
        body
      );
      if (queryFormat === "dataview" || queryFormat === "jsonlogic") {
        const response2 = await fetch(`${this.host_url}/search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": contentType,
            Accept: "application/json"
          },
          body
        });
        if (!response2.ok) {
          throw new Error(`HTTP error! status: ${response2.status}`);
        }
        const results2 = await response2.json();
        return results2;
      }
      const response = await fetch(`${this.host_url}/search/simple?query=${encodeURIComponent(body)}&contextLength=${contextLength}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": contentType,
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const results = await response.json();
      return results;
    } catch (error) {
      elizaLogger.error("Search failed:", error.message);
      throw error;
    }
  }
  /**
   * Searches for notes in the vault based on the provided query and options.
   * @param query - The query to search for. Can be a string or an object.
   * @param queryFormat - The format of the query (plaintext, dataview, or jsonlogic).
   * @param options - Additional options for the search.
   * @returns A promise that resolves to an array of search results.
   */
  async searchKeywords(query, contextLength = 100) {
    if (!this.connected) {
      await this.connect();
    }
    const orQueries = query.split(/\s+OR\s+/).map((q) => q.trim());
    elizaLogger.log(
      "Processing search query with OR operator:",
      orQueries
    );
    try {
      const allResults = [];
      for (const orQuery of orQueries) {
        const response = await fetch(
          `${this.host_url}/search/simple/?query=${encodeURIComponent(orQuery)}&contextLength=${contextLength}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.token}`,
              accept: "application/json"
            }
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const results = await response.json();
        allResults.push(...results);
      }
      const uniqueResults = Array.from(
        new Map(
          allResults.map((item) => [item.filename, item])
        ).values()
      );
      elizaLogger.success(`Found ${uniqueResults.length} unique results`);
      elizaLogger.debug("Search results:", uniqueResults);
      return uniqueResults;
    } catch (error) {
      elizaLogger.error("Obsidian search failed:", error.message);
      throw error;
    }
  }
  /**
   * Recursively scans directories and builds a list of all files
   * @param directory - The directory to scan, empty string for root
   * @returns Array of file paths in format 'directory/file.md'
   */
  async scanDirectoryRecursively(directory = "") {
    const allFiles = [];
    const dirsToProcess = [directory];
    const processedDirs = /* @__PURE__ */ new Set();
    while (dirsToProcess.length > 0) {
      const currentDir = dirsToProcess.shift();
      if (currentDir === void 0) continue;
      if (processedDirs.has(currentDir)) {
        continue;
      }
      try {
        elizaLogger.debug("Scanning directory:", currentDir);
        const items = await this.listDirectoryFiles(currentDir);
        for (const item of items) {
          if (item.endsWith("/")) {
            const fullPath = currentDir ? `${currentDir}${item}` : item;
            if (!processedDirs.has(fullPath)) {
              dirsToProcess.push(fullPath);
            }
          } else if (item.endsWith(".md")) {
            const filePath = currentDir ? `${currentDir}${item}` : item;
            allFiles.push(filePath);
          }
        }
        processedDirs.add(currentDir);
      } catch (error) {
        elizaLogger.error(`Error scanning directory ${currentDir}:`, error);
      }
    }
    return allFiles;
  }
  /**
   * Retrieves all files in the vault.
   * @returns A promise that resolves to an array of file paths.
   */
  async getAllFiles() {
    if (!this.connected) {
      await this.connect();
    }
    try {
      elizaLogger.debug("Starting file scanning process");
      const rootItems = await this.listFiles();
      const allFiles = [];
      const rootMdFiles = rootItems.filter((item) => item.endsWith(".md"));
      allFiles.push(...rootMdFiles);
      const directories = rootItems.filter((item) => item.endsWith("/"));
      for (const dir of directories) {
        const dirFiles = await this.scanDirectoryRecursively(dir);
        allFiles.push(...dirFiles);
      }
      elizaLogger.info(`Completed scanning. Found ${allFiles.length} files in vault`);
      const uniqueFiles = Array.from(new Set(allFiles));
      return uniqueFiles;
    } catch (error) {
      elizaLogger.error("Error in getAllFiles:", error);
      throw error;
    }
  }
  /**
   * Creates memories from all files in the vault.
   * @returns A promise that resolves to the number of memories created.
   */
  async createMemoriesFromFiles() {
    try {
      elizaLogger.info("Starting to create memories from vault files");
      const allFiles = await this.getAllFiles();
      elizaLogger.debug("All files:", allFiles);
      elizaLogger.success(`Found ${allFiles.length} files in vault`);
      for (const file of allFiles) {
        try {
          if (file.endsWith(".md")) {
            const content = await this.getNote(file);
            if (!content) {
              elizaLogger.warn(`No content found for file: ${file}`);
              continue;
            }
            const contentHash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
            const knowledgeId = stringToUuid(
              `obsidian-${file}`
            );
            const existingDocument = await this.runtime.documentsManager.getMemoryById(knowledgeId);
            if (existingDocument && existingDocument.content.hash === contentHash) {
              elizaLogger.debug(`Skipping unchanged file: ${file}`);
              continue;
            }
            elizaLogger.info(
              `Processing knowledge for ${this.runtime.character.name} - ${file}`
            );
            await knowledge.set(this.runtime, {
              id: knowledgeId,
              content: {
                text: content.content,
                hash: contentHash,
                source: "obsidian",
                attachments: [],
                metadata: {
                  path: file,
                  tags: content.tags,
                  frontmatter: content.frontmatter,
                  stats: content.stat
                }
              }
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          elizaLogger.error(`Error processing file ${file}:`, error);
        }
      }
      elizaLogger.success("Finished creating memories from vault notes");
      return allFiles.length;
    } catch (error) {
      elizaLogger.error("Error in createMemoriesFromFiles:", error);
      return 0;
    }
  }
  /**
   * Checks if the client is connected to Obsidian.
   * @returns `true` if the client is connected, `false` otherwise.
   */
  isConnected() {
    return this.connected;
  }
  /**
   * Closes the connection to Obsidian.
   */
  close() {
    this.connected = false;
    _ObsidianProvider.instance = null;
  }
};

// src/enviroment.ts
import { z } from "zod";
var obsidianEnvSchema = z.object({
  OBSIDIAN_API_URL: z.string().nullable().optional(),
  OBSIDIAN_API_PORT: z.string().default("27123"),
  OBSIDIAN_API_TOKEN: z.string()
}).refine((data) => !!data.OBSIDIAN_API_TOKEN, {
  message: "OBSIDIAN_API_TOKEN is required"
});
async function validateObsidianConfig(runtime) {
  try {
    const config = {
      OBSIDIAN_API_URL: runtime.getSetting("OBSIDIAN_API_URL") || process.env.OBSIDIAN_API_URL || null,
      OBSIDIAN_API_PORT: runtime.getSetting("OBSIDIAN_API_PORT") || process.env.OBSIDIAN_API_PORT || "27123",
      OBSIDIAN_API_TOKEN: runtime.getSetting("OBSIDIAN_API_TOKEN") || process.env.OBSIDIAN_API_TOKEN
    };
    return obsidianEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `Obsidian configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/types/index.ts
import { z as z2 } from "zod";
var noteSchema = z2.object({
  tags: z2.array(z2.string()).optional(),
  frontmatter: z2.record(z2.unknown()).optional(),
  stat: z2.object({
    ctime: z2.number(),
    mtime: z2.number(),
    size: z2.number()
  }).nullable().optional(),
  path: z2.string(),
  content: z2.string().nullable().optional()
});
var isValidNote = (note) => {
  return noteSchema.safeParse(note).success;
};
var fileSchema = z2.object({
  path: z2.string(),
  content: z2.string().nullable().optional(),
  stat: z2.object({
    ctime: z2.number(),
    mtime: z2.number(),
    size: z2.number()
  }).nullable().optional()
});
var isValidFile = (file) => {
  return fileSchema.safeParse(file).success;
};
var noteHierarchySchema = z2.object({
  path: z2.string(),
  content: z2.string().nullable().optional(),
  links: z2.lazy(() => z2.array(noteHierarchySchema)).nullable().optional()
});
var isValidNoteHierarchy = (hierarchy) => {
  return noteHierarchySchema.safeParse(hierarchy).success;
};
var searchKeywordSchema = z2.object({
  query: z2.string().min(1).describe("The keywords to search for"),
  options: z2.object({
    vault: z2.string().optional(),
    includeExcerpt: z2.boolean().optional(),
    limit: z2.number().optional()
  }).optional()
});
var searchOptionsSchema = z2.object({
  contextLength: z2.number().optional(),
  ignoreCase: z2.boolean().nullable().optional().default(true),
  searchIn: z2.array(z2.string()).nullable().optional().default([])
});
var searchQuerySchema = z2.object({
  query: z2.union([z2.string(), z2.record(z2.unknown())]).describe("The query to search for"),
  queryFormat: z2.enum(["plaintext", "dataview", "jsonlogic"]).describe("The format of the query"),
  options: searchOptionsSchema.optional().describe("Search options")
});
var isSearchQuery = (obj) => {
  return searchQuerySchema.safeParse(obj).success;
};

// src/helper.ts
var obsidianInstance;
async function getObsidian(runtime) {
  if (!obsidianInstance) {
    elizaLogger2.debug("Creating new ObsidianProvider instance");
    const config = await validateObsidianConfig(runtime);
    obsidianInstance = await ObsidianProvider.create(
      runtime,
      Number.parseInt(config.OBSIDIAN_API_PORT),
      config.OBSIDIAN_API_TOKEN,
      config.OBSIDIAN_API_URL
    );
  }
  return obsidianInstance;
}
function extractLinks(noteContent) {
  const linkRegex = /\[\[(.*?)\]\]/g;
  const links = [];
  let match;
  while (true) {
    match = linkRegex.exec(noteContent.content);
    if (match === null) break;
    if (match[1] && !lookup(match[1])) {
      links.push(`${noteContent.path.split("/")[0]}/${match[1]}.md`);
    } else {
      links.push(match[1]);
    }
  }
  return links;
}
async function storeHierarchyInMemory(runtime, message, hierarchy) {
  const memory = {
    id: stringToUuid2(hierarchy.path),
    roomId: message.roomId,
    userId: message.userId,
    agentId: runtime.agentId,
    content: {
      text: JSON.stringify(hierarchy),
      type: "note_traversal",
      metadata: {
        path: hierarchy.path,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  };
  const memoryManager = new MemoryManager({
    runtime,
    tableName: "obsidian"
  });
  await memoryManager.createMemory(memory);
  elizaLogger2.info(`Stored hierarchy for note ${hierarchy.path} in memory`);
}
async function retrieveHierarchyFromMemory(runtime, message, notePath) {
  const memoryManager = new MemoryManager({
    runtime,
    tableName: "obsidian"
  });
  try {
    const memories = await memoryManager.getMemories({
      roomId: message.roomId,
      count: 10,
      start: 0,
      end: Date.now()
    });
    if (memories && memories.length > 0) {
      const memory = memories[0];
      const hierarchy = JSON.parse(memory.content.text);
      elizaLogger2.info(`Retrieved hierarchy for note ${notePath} from memory`);
      return hierarchy;
    }
    return null;
  } catch (error) {
    elizaLogger2.error(`Failed to retrieve hierarchy from memory: ${error.message}`);
    return null;
  }
}
function markdownToPlaintext(markdown) {
  if (!markdown || typeof markdown !== "string") {
    return "";
  }
  let text = markdown;
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.slice(3, -3).trim();
  });
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^#{1,6}\s+(.*)$/gm, "$1");
  text = text.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1");
  text = text.replace(/^[\s-*_]{3,}$/gm, "\n");
  text = text.replace(/^>\s+/gm, "");
  text = text.replace(/\[([^\]]+)\]\([)]+\)/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([)]+\)/g, "");
  text = text.replace(/^[\s-]*[-+*]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/\n\s*\n\n/g, "\n\n");
  text = text.trim();
  return text;
}
var EXAMPLE_SEARCH_PROMPTS = [
  {
    input: "Search typescript in the notes",
    output: {
      query: "typescript",
      queryFormat: "plaintext",
      options: { contextLength: 150 }
    }
  },
  {
    input: "Find wisdom or mastering in all files",
    output: {
      query: "wisdom OR mastering",
      queryFormat: "plaintext",
      options: { contextLength: 150 }
    }
  },
  {
    input: "Find markdown files containing 'react' or 'typescript'",
    output: {
      query: {
        and: [
          { or: [{ in: ["react", { var: "content" }] }, { in: ["typescript", { var: "content" }] }] }
        ]
      },
      queryFormat: "jsonlogic",
      options: { contextLength: 200 }
    }
  },
  {
    input: "Search for files with regex pattern 'def.*main'",
    output: {
      query: {
        and: [
          { or: [{ regexp: ["def.*main", { var: "content" }] }] }
        ]
      },
      queryFormat: "jsonlogic",
      options: { contextLength: 200 }
    }
  },
  {
    input: "Search for markdown files with regex pattern '<div[^>]*>'",
    output: {
      query: {
        and: [
          { or: [{ regexp: ["<div[^>]*>", { var: "content" }] }] }
        ]
      },
      queryFormat: "jsonlogic",
      options: { contextLength: 200 }
    }
  },
  {
    input: "Find markdown files with filenames containing 'project'",
    output: {
      query: {
        and: [
          { in: ["project", { var: "path" }] }
        ]
      },
      queryFormat: "jsonlogic",
      options: { contextLength: 200 }
    }
  },
  {
    input: "Search for markdown files with filenames matching regex pattern '^notes_.*\\.md$'",
    output: {
      query: {
        and: [
          { regexp: ["^notes_.*\\.md$", { var: "path" }] }
        ]
      },
      queryFormat: "jsonlogic",
      options: { contextLength: 200 }
    }
  },
  {
    input: "Find markdown files with filenames containing 'summary' or 'report'",
    output: {
      query: {
        and: [
          { or: [{ in: ["summary", { var: "path" }] }, { in: ["report", { var: "path" }] }] }
        ]
      },
      queryFormat: "jsonlogic",
      options: { contextLength: 200 }
    }
  },
  {
    input: "Select TABLE file.mtime FROM #Projects IN Projects/ AND Archive/Projects",
    output: {
      query: "TABLE file.mtime FROM #Projects",
      queryFormat: "dataview",
      options: {
        searchIn: ["Projects/", "Archive/Projects/"]
      }
    }
  }
];
function constructSearchPrompt(userInput) {
  const examplePrompts = EXAMPLE_SEARCH_PROMPTS.map(
    (example) => `Input: "${example.input}"
Output: ${JSON.stringify(example.output, null, 2)}`
  ).join("\n\n");
  return `Respond with a JSON block containing only the extracted values. Use null for any values that cannot be determined.

Follow these rules:
1. Use the exact structure shown in the examples
2. The query is relevant to the user's request
3. Use space-separated terms for combined search (default: 'plaintext')
4. Use OR operator when searching for alternatives (default: 'plaintext')
5. Always include query.and and query.or as an array (default: "jsonlogic")
6. Use appropriate glob patterns for file types when appropriate (default: "jsonlogic")
7. Choose between contains and regexp based on the search requirements (default: "jsonlogic")
8. The format of the query - queryFormat (string): Must be one of: 'plaintext', 'dataview', or 'jsonlogic'. (default: 'plaintext')
9. When the prompt have "containing" or "contains", use "in" operator. DO NOT use "contains" operator (this is a strictly requirement) (default: "jsonlogic")
10. When the prompt have "matching" or "match", use "regexp" operator (default: "jsonlogic")
11. Maintain contextLength at 150

Examples:
${examplePrompts}

Now, convert this request:
"${userInput}"

Respond ONLY with a JSON block containing only the extracted values.`;
}
async function genereteSearchParameters(prompt, state, runtime) {
  try {
    const context = composeContext({
      state,
      template: prompt
    });
    const searchContext = await generateObject({
      runtime,
      context,
      modelClass: ModelClass.MEDIUM,
      schema: searchQuerySchema,
      stop: ["\n\n"]
    });
    const parsedCompletion = searchContext.object;
    elizaLogger2.info("Parsed completion:", JSON.stringify(parsedCompletion, null, 2));
    return JSON.stringify(parsedCompletion);
  } catch (error) {
    console.error("Error calling LLM API:", error);
    return "**No matching notes found**";
  }
}
async function processUserInput(userInput, state, runtime) {
  const searchState = {
    ...state,
    query: userInput
    // Add the query from userInput
  };
  const prompt = constructSearchPrompt(userInput);
  const llmResponse = await genereteSearchParameters(prompt, searchState, runtime);
  try {
    const parsedResponse = JSON.parse(llmResponse);
    const validatedResponse = searchQuerySchema.parse(parsedResponse);
    return validatedResponse;
  } catch (error) {
    console.error("Failed to parse or validate LLM response:", error);
    return null;
  }
}

// src/actions/search.ts
var searchAction = {
  name: "SEARCH",
  similes: [
    "FIND",
    "QUERY",
    "LOOKUP",
    "QUICK_SEARCH",
    "BASIC_SEARCH",
    "FAST_SEARCH",
    "SEARCH_KEYWORD",
    "OR_SEARCH",
    "FIND_KEYWORDS",
    "SEARCH_KEYWORDS",
    "FULL_SEARCH",
    "FULL_SEARCH_VAULT",
    "FULL_SEARCH_NOTES",
    "FULL_SEARCH_FILES",
    "SEARCH_ALL",
    "SEARCH_ALL_NOTES",
    "SEARCH_ALL_FILES",
    "SEARCH_VAULT",
    "SEARCH_NOTES",
    "FIND_NOTES",
    "FIND_FILES",
    "FIND_ALL",
    "FIND_ALL_NOTES",
    "FIND_ALL_FILES",
    "QUERY_VAULT",
    "QUERY_ALL",
    "QUERY_ALL_NOTES",
    "QUERY_ALL_FILES",
    "DATAVIEW_QUERY",
    "DQL"
  ],
  description: "Search the Obsidian vault using plain text, Dataview queries, or JSONLogic. Format: 'Search QUERY' or 'Query TABLE field FROM folder'",
  validate: async (runtime) => {
    try {
      elizaLogger3.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger3.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger3.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger3.info("Starting search handler");
    const obsidian = await getObsidian(runtime);
    try {
      let query = "";
      let queryFormat = "plaintext";
      let searchOptions = {
        contextLength: 150,
        ignoreCase: true
      };
      if (!state) {
        state = await runtime.composeState(message);
      } else {
        state = await runtime.updateRecentMessageState(state);
      }
      const searchContext = await processUserInput(message.content.text, state, runtime);
      elizaLogger3.debug("Search context:", JSON.stringify(searchContext.query, null, 2));
      if (!isSearchQuery(searchContext)) {
        elizaLogger3.error(
          "Invalid search query:",
          searchContext
        );
        return null;
      }
      if (searchContext.queryFormat === "dataview") {
        query = searchContext.query;
        queryFormat = "dataview";
        if (searchContext.options) {
          searchOptions = {
            ...searchOptions,
            ...searchContext.options
          };
        }
      } else if (searchContext.queryFormat === "jsonlogic") {
        queryFormat = "jsonlogic";
        query = searchContext.query;
        if (searchContext.options) {
          searchOptions = {
            ...searchOptions,
            ...searchContext.options
          };
        }
      } else {
        query = searchContext.query;
        if (searchContext.options) {
          searchOptions = {
            ...searchOptions,
            ...searchContext.options
          };
        }
      }
      if (!query) {
        throw new Error(
          "Search query is required. Use format: 'Search QUERY' or 'Query TABLE field FROM folder'"
        );
      }
      elizaLogger3.info(`Searching vault with ${queryFormat} query: ${typeof query === "string" ? query : JSON.stringify(query)}`);
      if (queryFormat === "plaintext") {
        const results = await obsidian.search(
          query,
          queryFormat,
          searchOptions
        );
        elizaLogger3.info(`Found ${results.length} matching notes`);
        const formattedResults = results.length > 0 ? results.map((result) => {
          const matches = result.matches.map((item) => `${markdownToPlaintext(item.context.substring(item.match.start, searchOptions.contextLength || 150)).trim()}...`).join("\n");
          return `
#### \u2705 ${result.filename} (**Score:** ${result.score})
${matches}`;
        }).join("\n\n") : "**No matching notes found**";
        elizaLogger3.info("Formatted results:", formattedResults);
        if (callback) {
          callback({
            text: `Found **${results.length}** matches:

${formattedResults}`,
            metadata: {
              count: results.length,
              results,
              query,
              queryFormat,
              searchOptions
            }
          });
        }
      } else {
        const results = await obsidian.search(
          query,
          queryFormat,
          searchOptions
        );
        elizaLogger3.info(`Found ${results.length} matching notes`);
        const formattedResults = results.length > 0 ? results.map((result) => {
          return `
#### \u2705 ${result.filename}`;
        }).join("\n\n") : "**No matching notes found**";
        elizaLogger3.info("Formatted results:", formattedResults);
        if (callback) {
          callback({
            text: `Found **${results.length}** matches:

${formattedResults}`,
            metadata: {
              count: results.length,
              results,
              query,
              queryFormat,
              searchOptions
            }
          });
        }
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error searching vault:", error);
      if (callback) {
        callback({
          text: `Error searching vault: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Search project management"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Search <keyword>"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Find <keyword>"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Search project OR management"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Find meeting notes OR agenda"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Quick search todo OR task OR deadline"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: 'TABLE file.name FROM "Notes"'
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: 'DQL FROM "Daily Notes" WHERE date = today'
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SEARCH"
        }
      }
    ]
  ]
};

// src/actions/listNotes.ts
import {
  elizaLogger as elizaLogger4
} from "@elizaos/core";
var listNotesAction = {
  name: "LIST_NOTES",
  similes: [
    "LIST_NOTES",
    "SHOW_NOTES",
    "GET_NOTES",
    "FETCH_NOTES",
    "VIEW_NOTES",
    "DISPLAY_NOTES",
    "ENUMERATE_NOTES"
  ],
  description: "List all markdown notes in the Obsidian vault. Use format: 'List notes' or 'Show all notes'",
  validate: async (runtime) => {
    try {
      elizaLogger4.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger4.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger4.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    elizaLogger4.info("Starting list notes handler");
    const obsidian = await getObsidian(runtime);
    try {
      elizaLogger4.info("Fetching list of notes from vault");
      const notes = await obsidian.listNotes();
      elizaLogger4.info(`Successfully retrieved ${notes.length} notes`);
      const formattedNotes = notes.length > 0 ? notes.map((note) => `- ${note}`).join("\n") : "No notes found in the vault";
      if (callback) {
        callback({
          text: `Found ${notes.length} notes in the vault:

${formattedNotes}`,
          metadata: {
            count: notes.length,
            notes
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger4.error("Error listing notes:", error);
      if (callback) {
        callback({
          text: `Error listing notes: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "List notes"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_NOTES"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show all notes in vault"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_NOTES"
        }
      }
    ]
  ]
};

// src/actions/vault.ts
import {
  elizaLogger as elizaLogger5
} from "@elizaos/core";
var listAllFilesAction = {
  name: "LIST_ALL",
  similes: [
    "LIST_VAULT_FILES",
    "LIST_ALL_VAULT_FILES",
    "LIST_ALL_FILES",
    "SHOW_ALL_FILES",
    "GET_ALL_FILES",
    "FETCH_ALL_FILES",
    "VIEW_ALL_FILES",
    "DISPLAY_ALL_FILES",
    "ENUMERATE_ALL_FILES",
    "LIST_EVERYTHING",
    "SHOW_EVERYTHING"
  ],
  description: "List all files in the entire Obsidian vault. Use format: 'List all files' or 'Show all files'",
  validate: async (runtime) => {
    try {
      elizaLogger5.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger5.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger5.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    elizaLogger5.info("Starting list all files handler");
    const obsidian = await getObsidian(runtime);
    try {
      elizaLogger5.info("Fetching list of all files from vault");
      const files = await obsidian.listFiles();
      elizaLogger5.info(`Successfully retrieved ${files.length} files`);
      const filesByDirectory = {};
      for (const file of files) {
        const directory = file.split("/").slice(0, -1).join("/") || "/";
        if (!filesByDirectory[directory]) {
          filesByDirectory[directory] = [];
        }
        filesByDirectory[directory].push(file.split("/").pop() || file);
      }
      const formattedFiles = files.length > 0 ? Object.entries(filesByDirectory).map(([directory, files2]) => `${directory === "/" ? "Root" : directory}:
${files2.map((file) => `  - ${file}`).join("\n")}`).join("\n\n") : "No files found in the vault";
      if (callback) {
        callback({
          text: `Found ${files.length} files in the vault:

${formattedFiles}`,
          metadata: {
            count: files.length,
            files,
            filesByDirectory
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger5.error("Error listing files:", error);
      if (callback) {
        callback({
          text: `Error listing files: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "List all files"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_ALL"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show everything in the vault"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_ALL"
        }
      }
    ]
  ]
};

// src/actions/vaultDirectory.ts
import {
  elizaLogger as elizaLogger6
} from "@elizaos/core";
var listDirectoryAction = {
  name: "LIST_DIRECTORY",
  similes: [
    "SHOW_DIRECTORY",
    "LIST_FOLDER",
    "SHOW_FOLDER",
    "VIEW_DIRECTORY",
    "VIEW_FOLDER",
    "LIST_DIR",
    "SHOW_DIR",
    "DIR",
    "LS"
  ],
  description: "List all files in a specific directory of the Obsidian vault. Use format: 'List directory PATH' or 'Show files in PATH'",
  validate: async (runtime) => {
    try {
      elizaLogger6.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger6.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger6.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, _state, _options, callback) => {
    elizaLogger6.info("Starting list directory handler");
    const obsidian = await getObsidian(runtime);
    try {
      let directoryPath = "";
      const text = message.content.text;
      if (text) {
        const patterns = [
          /^(?:List|Show|View)\s+(?:directory|folder|files in|dir)\s+(.+)$/i,
          /^(?:List|Show|View)\s+(.+)\s+(?:directory|folder|files)$/i,
          /^(?:ls|dir)\s+(.+)$/i
        ];
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            directoryPath = match[1].trim();
            break;
          }
        }
      }
      if (!directoryPath && message.content.path) {
        directoryPath = message.content.path;
      }
      if (!directoryPath) {
        throw new Error(
          "Directory path is required. Use format: 'List directory PATH' or 'Show files in PATH'"
        );
      }
      elizaLogger6.info(`Listing files in directory: ${directoryPath}`);
      const files = await obsidian.listDirectoryFiles(directoryPath);
      elizaLogger6.info(`Successfully retrieved ${files.length} files`);
      const formattedFiles = files.length > 0 ? files.map((file) => `- ${file}`).join("\n") : "No files found in the directory";
      if (callback) {
        callback({
          text: `Found ${files.length} files in ${directoryPath}:

${formattedFiles}`,
          metadata: {
            directory: directoryPath,
            count: files.length,
            files
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger6.error("Error listing directory:", error);
      if (callback) {
        callback({
          text: `Error listing directory: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "List directory BLOG POSTS"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_DIRECTORY"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show files in PROJECTS/src"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_DIRECTORY"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "ls DOCUMENTS/research"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "LIST_DIRECTORY"
        }
      }
    ]
  ]
};

// src/actions/createKnowledge.ts
import {
  elizaLogger as elizaLogger7
} from "@elizaos/core";
var createKnowledgeAction = {
  name: "CREATE_KNOWLEDGE",
  similes: [
    "BUILD_KNOWLEDGE",
    "CREATE_KNOWLEDGE_BASE",
    "CREATE_KNOWLEDGE_BASE",
    "BUILD_KNOWLEDGE_BASE"
  ],
  description: "Scan all markdown notes hierarchically in the Obsidian vault and build a memoryknowledge base. Use format: 'Create knowledge' or 'Build knowledge base'",
  validate: async (runtime) => {
    try {
      elizaLogger7.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger7.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger7.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    elizaLogger7.info("Starting create knowledge handler");
    const obsidian = await getObsidian(runtime);
    try {
      elizaLogger7.info("Fetching all notes from vault and creating knowledge base");
      elizaLogger7.log("Be patient, this might take a while, depending on the size of your vault...");
      if (callback) {
        callback({
          text: "This might take a while, depending on the size of your vault...",
          error: false
        });
      }
      try {
        const notesMemorized = await obsidian.createMemoriesFromFiles();
        if (callback) {
          callback({
            text: `Finished creating knowledge base for ${notesMemorized ?? 0} notes in the vault`,
            metadata: {
              count: notesMemorized ?? 0
            }
          });
        }
      } catch (error) {
        elizaLogger7.error("Error creating knowledge memories from notes:", error);
        if (callback) {
          callback({
            text: `Error creating knowledge memories from notes: ${error.message}`,
            error: true
          });
        }
        return false;
      }
      return true;
    } catch (error) {
      elizaLogger7.error("Error creating knowledge base:", error);
      if (callback) {
        callback({
          text: `Error creating knowledge base: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create knowledge"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "CREATE_KNOWLEDGE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Build knowledge base"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "CREATE_KNOWLEDGE"
        }
      }
    ]
  ]
};

// src/actions/noteTraversal.ts
import {
  elizaLogger as elizaLogger8,
  composeContext as composeContext2,
  generateObject as generateObject2,
  ModelClass as ModelClass2
} from "@elizaos/core";

// src/templates/file.ts
var fileTemplate = (userRequest) => `
Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Ensure that:
1. The path is properly formatted with correct folder structure
2. The operation matches one of the supported actions (Default: READ)
3. Content is provided when required for write operations
4. Path uses forward slashes (/) as separators
5. Make sure to remove \`\`\`json and \`\`\` from the response

Provide the details in the following JSON format:

\`\`\`json
{
    "path": "<folder>/<subfolder>/<filename>",
    "operation": "<READ|WRITE>",
    "content": "<file_content_to_write>"
}
\`\`\`

Here are the recent user messages for context:
${userRequest}

Respond ONLY with a JSON markdown block containing only the extracted values.`;

// src/actions/noteTraversal.ts
var noteTraversalAction = {
  name: "TRAVERSE_NOTE",
  similes: [
    "MAP_NOTE_LINKS",
    "MAP_LINKS_IN",
    "GET_NOTE_HIERARCHY",
    "SHOW_NOTE_LINKS",
    "LIST_NOTE_CONNECTIONS",
    "DISPLAY_NOTE_NETWORK",
    "EXPLORE_NOTE_LINKS",
    "VIEW_NOTE_CONNECTIONS",
    "ANALYZE_NOTE_LINKS"
  ],
  description: "Generate a hierarchical list of all outgoing links from a specific note, including nested links. Use format: 'Map links in FOLDER/Note.md'",
  validate: async (runtime) => {
    try {
      elizaLogger8.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger8.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger8.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger8.info("Starting note traversal handler");
    const obsidian = await getObsidian(runtime);
    try {
      let formatHierarchy = function(node, level = 0) {
        const indent = "  ".repeat(level);
        let result = `${indent}- ${node.path}
`;
        elizaLogger8.info(`Node hierarchy links for note: ${node.links}`);
        for (const link of node.links) {
          result += formatHierarchy(link, level + 1);
        }
        return result;
      };
      let path = "";
      let currentState;
      if (!state) {
        currentState = await runtime.composeState(message);
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }
      const context = composeContext2({
        state: currentState,
        template: fileTemplate(message.content.text)
      });
      const noteContext = await generateObject2({
        runtime,
        context,
        modelClass: ModelClass2.MEDIUM,
        schema: noteHierarchySchema,
        stop: ["\n"]
      });
      if (!isValidNoteHierarchy(noteContext.object)) {
        elizaLogger8.error(
          "Note path is required. Use format: 'Map links in FOLDER/Note.md' - ",
          noteContext.object
        );
        if (callback) {
          callback({
            text: `Note path is required. Use format: 'Map links in FOLDER/Note.md' - ${noteContext.object}`,
            error: true
          });
        }
        return false;
      }
      path = noteContext.object.path;
      if (!path && message.content.path) {
        path = message.content.path;
      }
      if (!path) {
        throw new Error(
          "Note path is required. Use format: 'Map links in FOLDER/Note.md'"
        );
      }
      const cachedHierarchy = await retrieveHierarchyFromMemory(runtime, message, path);
      if (cachedHierarchy) {
        elizaLogger8.info(`Using cached hierarchy for note: ${path}`);
        if (callback) {
          callback({
            text: formatHierarchy(cachedHierarchy),
            metadata: {
              path,
              hierarchy: cachedHierarchy,
              source: "cache"
            }
          });
        }
        return true;
      }
      async function buildLinkHierarchy(notePath, depth = 0, visited = /* @__PURE__ */ new Set()) {
        if (visited.has(notePath)) {
          return null;
        }
        visited.add(notePath);
        try {
          const noteContent = await obsidian.getNote(notePath);
          const links = extractLinks(noteContent);
          const hierarchy2 = {
            path: notePath,
            content: noteContent.content,
            links: []
          };
          if (depth < 7) {
            for (const link of links) {
              const childHierarchy = await buildLinkHierarchy(link, depth + 1, visited);
              if (childHierarchy) {
                hierarchy2.links.push(childHierarchy);
              }
            }
          }
          return hierarchy2;
        } catch (error) {
          elizaLogger8.error(`Failed to process note ${notePath}: ${error.message}`);
          return null;
        }
      }
      elizaLogger8.info(`Building link hierarchy for note: ${path}`);
      const hierarchy = await buildLinkHierarchy(path);
      if (!hierarchy) {
        throw new Error(`Failed to build hierarchy for note: ${path}`);
      }
      await storeHierarchyInMemory(runtime, message, hierarchy);
      const formattedHierarchy = formatHierarchy(hierarchy);
      elizaLogger8.info(`Successfully built hierarchy for note: ${path}`);
      if (callback) {
        callback({
          text: formattedHierarchy,
          metadata: {
            path,
            hierarchy,
            source: "obsidian"
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error in note traversal:", error);
      if (callback) {
        callback({
          text: `Error in note traversal: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show outgoing links in Knowledge Base/Main Index.md"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "TRAVERSE_NOTE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Map links in Knowledge Base/Main Index.md"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "TRAVERSE_NOTE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show note connections in Projects/Project Overview.md"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "TRAVERSE_NOTE"
        }
      }
    ]
  ]
};

// src/actions/activeNote.ts
import {
  elizaLogger as elizaLogger9,
  composeContext as composeContext3,
  ModelClass as ModelClass3,
  splitChunks,
  trimTokens,
  generateText
} from "@elizaos/core";

// src/templates/summary.ts
var baseSummaryTemplate = `# Summarized so far (we are adding to this)
{{currentSummary}}

# Current note chunk we are summarizing (includes metadata)
{{currentChunk}}

Summarization objective: {{objective}}

# Instructions: Summarize the note content so far. Return the summary. Do not acknowledge this request, just summarize and continue the existing summary if there is one. Capture any important details to the objective. Only respond with the new summary text.
Your response should be extremely detailed and include any and all relevant information.`;

// src/actions/activeNote.ts
var getActiveNoteAction = {
  name: "GET_ACTIVE_NOTE",
  similes: [
    "FETCH_ACTIVE_NOTE",
    "READ_ACTIVE_NOTE",
    "CURRENT_NOTE",
    "ACTIVE_NOTE",
    "OPENED_NOTE",
    "CURRENT_FILE"
  ],
  description: "Retrieve and display the content of the currently active note in Obsidian",
  validate: async (runtime) => {
    try {
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      return true;
    } catch (error) {
      elizaLogger9.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    elizaLogger9.info("Starting get active note handler");
    const obsidian = await getObsidian(runtime);
    try {
      elizaLogger9.info("Fetching active note content");
      const noteContent = await obsidian.getActiveNote();
      elizaLogger9.info(
        `Successfully retrieved active note: ${noteContent.path}`
      );
      if (callback) {
        callback({
          text: noteContent.content,
          metadata: {
            path: noteContent.path
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger9.error("Error getting active note:", error);
      if (callback) {
        callback({
          text: `Error retrieving active note: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's in my current note?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "GET_ACTIVE_NOTE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the active note"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "GET_ACTIVE_NOTE"
        }
      }
    ]
  ]
};
var summarizeActiveNoteAction = {
  name: "SUMMARIZE_ACTIVE_NOTE",
  similes: [
    "SUMMARIZE_ACTIVE_NOTE",
    "SUMMARIZE_CURRENT_NOTE",
    "SUMMARIZE_OPEN_NOTE"
  ],
  description: "Generate a focused summary of the currently active note in Obsidian",
  validate: async (runtime) => {
    try {
      elizaLogger9.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger9.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger9.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger9.info("Starting summarize active note handler");
    const obsidian = await getObsidian(runtime);
    try {
      elizaLogger9.info("Fetching active note content");
      const noteContent = await obsidian.getActiveNote();
      if (!state) {
        state = await runtime.composeState(message);
      } else {
        state = await runtime.updateRecentMessageState(state);
      }
      const chunkSize = 6500;
      const chunks = await splitChunks(noteContent.content, chunkSize, 0);
      let currentSummary = "";
      elizaLogger9.info("Composing summary context");
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        state.currentSummary = currentSummary;
        state.currentChunk = chunk;
        const activeNoteTemplate = await trimTokens(
          baseSummaryTemplate,
          chunkSize,
          runtime
        );
        const context = composeContext3({
          state,
          template: activeNoteTemplate
        });
        const summary = await generateText({
          runtime,
          context,
          modelClass: ModelClass3.MEDIUM
        });
        currentSummary = `${currentSummary}
${summary}`;
      }
      if (!currentSummary) {
        elizaLogger9.error("Error: No summary found");
        return false;
      }
      if (callback) {
        if (currentSummary.trim()?.split("\n").length < 4 || currentSummary.trim()?.split(" ").length < 100) {
          callback({
            text: `Here is the summary:
\`\`\`md
${currentSummary.trim()}
\`\`\``,
            metadata: {
              path: noteContent.path
            }
          });
        } else {
          callback({
            text: currentSummary.trim(),
            metadata: {
              path: noteContent.path
            }
          });
        }
      }
      return true;
    } catch (error) {
      elizaLogger9.error("Error summarizing active note:", error);
      if (callback) {
        callback({
          text: `Error summarizing active note: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Summarize my current note"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SUMMARIZE_ACTIVE_NOTE"
        }
      }
    ]
  ]
};

// src/actions/note.ts
import {
  elizaLogger as elizaLogger10,
  composeContext as composeContext4,
  generateObject as generateObject3,
  ModelClass as ModelClass4
} from "@elizaos/core";
var getNoteAction = {
  name: "GET_NOTE",
  similes: [
    "DISPLAY_NOTE",
    "GRAB_NOTE",
    "FETCH_NOTE",
    "READ_NOTE",
    "RETRIEVE_NOTE",
    "LOAD_NOTE",
    "OPEN_NOTE",
    "ACCESS_NOTE",
    "VIEW_NOTE",
    "SHOW_NOTE"
  ],
  description: "Retrieve and display the content of a specific note from Obsidian vault by path. Use format: 'Get FOLDER/SUBFOLDER/Note Name.md'",
  validate: async (runtime) => {
    try {
      elizaLogger10.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger10.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger10.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger10.info("Starting get note handler");
    const obsidian = await getObsidian(runtime);
    try {
      let path = "";
      let currentState;
      if (!state) {
        currentState = await runtime.composeState(message);
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }
      const context = composeContext4({
        state: currentState,
        template: fileTemplate(message.content.text)
      });
      const noteContext = await generateObject3({
        runtime,
        context,
        modelClass: ModelClass4.MEDIUM,
        schema: noteSchema,
        stop: ["\n"]
      });
      if (!isValidNote(noteContext.object)) {
        elizaLogger10.error(
          "A Note path is required. Use format: 'Get FOLDER/SUBFOLDER/Note Name.md' - ",
          noteContext.object
        );
        if (callback) {
          callback({
            text: `A Note path is required. Use format: 'Get FOLDER/SUBFOLDER/Note Name.md - ${noteContext.object}`,
            error: true
          });
        }
        return false;
      }
      path = noteContext.object.path;
      elizaLogger10.info(`Fetching note at path: ${path}`);
      const noteContent = await obsidian.getNote(path);
      elizaLogger10.info(`Successfully retrieved note: ${path}`);
      if (callback) {
        callback({
          text: noteContent.content,
          metadata: {
            path: noteContent.path
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger10.error("Error retrieving note:", error);
      if (callback) {
        callback({
          text: `Error retrieving note: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get BLOG POSTS/How to Angel Invest, Part 1.md"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "GET_NOTE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Fetch BLOG POSTS/How to Angel Invest, Part 2.md"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "GET_NOTE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Read BLOG POSTS/STARTUPS/Build a Team that Ships.md"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "GET_NOTE"
        }
      }
    ]
  ]
};

// src/actions/file.ts
import {
  elizaLogger as elizaLogger11,
  composeContext as composeContext5,
  generateObject as generateObject4,
  ModelClass as ModelClass5
} from "@elizaos/core";
var readFileAction = {
  name: "READ_FILE",
  similes: [
    "GET_FILE",
    "FETCH_FILE",
    "READ_FILE",
    "RETRIEVE_FILE",
    "LOAD_FILE",
    "OPEN_FILE",
    "ACCESS_FILE",
    "VIEW_FILE",
    "SHOW_FILE",
    "READ"
  ],
  description: "Retrieve and display the content of any file from Obsidian vault by path. Use format: 'Read FOLDER/SUBFOLDER/filename'",
  validate: async (runtime) => {
    try {
      elizaLogger11.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger11.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger11.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger11.info("Starting read file handler");
    const obsidian = await getObsidian(runtime);
    try {
      let path = "";
      if (!state) {
        state = await runtime.composeState(message);
      } else {
        state = await runtime.updateRecentMessageState(state);
      }
      const context = composeContext5({
        state,
        template: fileTemplate(message.content.text)
      });
      const fileContext = await generateObject4({
        runtime,
        context,
        modelClass: ModelClass5.MEDIUM,
        schema: fileSchema,
        stop: ["\n"]
      });
      if (!isValidFile(fileContext.object)) {
        elizaLogger11.error(
          "A file path is required. Use format: 'Read FOLDER/SUBFOLDER/filename' - ",
          fileContext.object
        );
        if (callback) {
          callback({
            text: `A file path is required. Use format: 'Read FOLDER/SUBFOLDER/filename' - ${fileContext.object}`,
            error: true
          });
        }
        return false;
      }
      path = fileContext.object.path;
      elizaLogger11.info(`Reading file at path: ${path}`);
      const fileContent = await obsidian.readFile(path);
      elizaLogger11.info(`Successfully read file: ${path}`);
      if (callback) {
        callback({
          text: fileContent,
          metadata: {
            path
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger11.error("Error reading file:", error);
      if (callback) {
        callback({
          text: `Error reading file: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get DOCUMENTS/report.pdf"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "READ_FILE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Read PROJECTS/src/main.ts"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "READ_FILE"
        }
      }
    ]
  ]
};

// src/actions/saveFile.ts
import {
  elizaLogger as elizaLogger12,
  composeContext as composeContext6,
  generateObject as generateObject5,
  ModelClass as ModelClass6
} from "@elizaos/core";
var saveFileAction = {
  name: "SAVE_FILE",
  similes: [
    "WRITE_FILE",
    "CREATE_FILE",
    "SAVE",
    "STORE_FILE",
    "PUT_FILE",
    "WRITE_TO_FILE",
    "CREATE_NEW_FILE"
  ],
  description: "Create or update a file in the Obsidian vault. Use format: 'Save FOLDER/SUBFOLDER/filename with content: your_content'",
  validate: async (runtime) => {
    try {
      elizaLogger12.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger12.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger12.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger12.info("Starting save file handler");
    const obsidian = await getObsidian(runtime);
    try {
      let currentState;
      if (!state) {
        currentState = await runtime.composeState(message);
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }
      const context = composeContext6({
        state: currentState,
        template: fileTemplate(message.content.text)
      });
      const fileContext = await generateObject5({
        runtime,
        context,
        modelClass: ModelClass6.MEDIUM,
        schema: fileSchema,
        stop: ["\n"]
      });
      if (!isValidFile(fileContext.object)) {
        elizaLogger12.error(
          "Invalid file information. Required: path and content. Format: 'Save FOLDER/SUBFOLDER/filename with content: your_content' - ",
          fileContext.object
        );
        if (callback) {
          callback({
            text: `Invalid file information. Required: path and content. Format: 'Save FOLDER/SUBFOLDER/filename with content: your_content' - ${fileContext.object}`,
            error: true
          });
        }
        return false;
      }
      const { path, content } = fileContext.object;
      if (!content) {
        elizaLogger12.error("File content is required for saving");
        if (callback) {
          callback({
            text: "File content is required for saving",
            error: true
          });
        }
        return false;
      }
      elizaLogger12.info(`Saving file at path: ${path}`);
      await obsidian.saveFile(path, content, true);
      elizaLogger12.info(`Successfully saved file: ${path}`);
      if (callback) {
        callback({
          text: `Successfully saved file: ${path}`,
          metadata: {
            path,
            operation: "SAVE",
            success: true
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger12.error("Error saving file:", error);
      if (callback) {
        callback({
          text: `Error saving file: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Save DOCUMENTS/report.txt with content: This is a test report"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SAVE_FILE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: 'Create PROJECTS/src/config.json with content: { "version": "1.0.0" }'
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "SAVE_FILE"
        }
      }
    ]
  ]
};

// src/actions/openFile.ts
import {
  elizaLogger as elizaLogger13,
  composeContext as composeContext7,
  generateObject as generateObject6,
  ModelClass as ModelClass7
} from "@elizaos/core";
var openFileAction = {
  name: "OPEN_FILE",
  similes: [
    "OPEN",
    "LAUNCH_FILE",
    "DISPLAY_FILE",
    "SHOW_FILE",
    "VIEW_FILE"
  ],
  description: "Open a file in the Obsidian interface. Use format: 'Open FOLDER/SUBFOLDER/filename'",
  validate: async (runtime) => {
    try {
      elizaLogger13.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger13.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger13.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger13.info("Starting open file handler");
    const obsidian = await getObsidian(runtime);
    try {
      let currentState;
      if (!state) {
        currentState = await runtime.composeState(message);
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }
      const context = composeContext7({
        state: currentState,
        template: fileTemplate(message.content.text)
      });
      const fileContext = await generateObject6({
        runtime,
        context,
        modelClass: ModelClass7.MEDIUM,
        schema: fileSchema,
        stop: ["\n"]
      });
      if (!isValidFile(fileContext.object)) {
        elizaLogger13.error(
          "Invalid file path. Format: 'Open FOLDER/SUBFOLDER/filename' - ",
          fileContext.object
        );
        if (callback) {
          callback({
            text: `Invalid file path. Format: 'Open FOLDER/SUBFOLDER/filename' - ${fileContext.object}`,
            error: true
          });
        }
        return false;
      }
      const { path } = fileContext.object;
      elizaLogger13.info(`Opening file at path: ${path}`);
      await obsidian.openFile(path);
      elizaLogger13.info(`Successfully opened file: ${path}`);
      if (callback) {
        callback({
          text: `Successfully opened file: ${path}`,
          metadata: {
            path,
            operation: "OPEN",
            success: true
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger13.error("Error opening file:", error);
      if (callback) {
        callback({
          text: `Error opening file: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Open DOCUMENTS/report.txt"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "OPEN_FILE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show PROJECTS/src/config.json"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "OPEN_FILE"
        }
      }
    ]
  ]
};

// src/actions/updateFile.ts
import {
  elizaLogger as elizaLogger14,
  composeContext as composeContext8,
  generateObject as generateObject7,
  ModelClass as ModelClass8
} from "@elizaos/core";
var updateFileAction = {
  name: "UPDATE_FILE",
  similes: [
    "PATCH_FILE",
    "MODIFY_FILE",
    "UPDATE",
    "PATCH",
    "EDIT_FILE",
    "CHANGE_FILE"
  ],
  description: "Update an existing file in the Obsidian vault. Use format: 'Update FOLDER/SUBFOLDER/filename with content: your_content'",
  validate: async (runtime) => {
    try {
      elizaLogger14.debug("Validating Obsidian connection");
      const obsidian = await getObsidian(runtime);
      await obsidian.connect();
      elizaLogger14.debug("Obsidian connection validated successfully");
      return true;
    } catch (error) {
      elizaLogger14.error("Failed to validate Obsidian connection:", error);
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger14.info("Starting update file handler");
    const obsidian = await getObsidian(runtime);
    try {
      let currentState;
      if (!state) {
        currentState = await runtime.composeState(message);
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }
      const context = composeContext8({
        state: currentState,
        template: fileTemplate(message.content.text)
      });
      const fileContext = await generateObject7({
        runtime,
        context,
        modelClass: ModelClass8.MEDIUM,
        schema: fileSchema,
        stop: ["\n"]
      });
      if (!isValidFile(fileContext.object)) {
        elizaLogger14.error(
          "Invalid file information. Required: path and content. Format: 'Update FOLDER/SUBFOLDER/filename with content: your_content' - ",
          fileContext.object
        );
        if (callback) {
          callback({
            text: `Invalid file information. Required: path and content. Format: 'Update FOLDER/SUBFOLDER/filename with content: your_content' - ${fileContext.object}`,
            error: true
          });
        }
        return false;
      }
      const { path, content } = fileContext.object;
      if (!content) {
        elizaLogger14.error("File content is required for updating");
        if (callback) {
          callback({
            text: "File content is required for updating",
            error: true
          });
        }
        return false;
      }
      elizaLogger14.info(`Updating file at path: ${path}`);
      await obsidian.patchFile(path, content);
      elizaLogger14.info(`Successfully updated file: ${path}`);
      if (callback) {
        callback({
          text: `Successfully updated file: ${path}`,
          metadata: {
            path,
            operation: "UPDATE",
            success: true
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger14.error("Error updating file:", error);
      if (callback) {
        callback({
          text: `Error updating file: ${error.message}`,
          error: true
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Update DOCUMENTS/report.txt with content: This is an updated report"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "UPDATE_FILE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: 'Patch PROJECTS/src/config.json with content: { "version": "2.0.0" }'
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "{{responseData}}",
          action: "UPDATE_FILE"
        }
      }
    ]
  ]
};

// src/index.ts
var obsidianPlugin = {
  name: "obsidian",
  description: "Integration with Obsidian vault using Omnisearch / Deep traversal search and memoryknowledge base",
  actions: [
    searchAction,
    listNotesAction,
    listAllFilesAction,
    listDirectoryAction,
    summarizeActiveNoteAction,
    getActiveNoteAction,
    getNoteAction,
    readFileAction,
    createKnowledgeAction,
    noteTraversalAction,
    saveFileAction,
    openFileAction,
    updateFileAction
  ],
  evaluators: [],
  services: [],
  providers: []
};
var index_default = obsidianPlugin;
export {
  index_default as default,
  obsidianPlugin
};
//# sourceMappingURL=index.js.map
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabaseAdapter, DatabaseAdapter } from '../../../src/database/database-adapter';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Adapter Functionality', () => {
  let adapter: DatabaseAdapter;
  let tempDbPath: string;

  beforeEach(() => {
    // Create temporary database path for each test
    tempDbPath = path.join(__dirname, `test-db-${Date.now()}.db`);
  });

  afterEach(async () => {
    if (adapter) {
      adapter.close();
    }
    // Clean up test database file
    try {
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Database Adapter Selection', () => {
    it('should successfully create a database adapter regardless of engine', async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      expect(adapter).toBeDefined();
      expect(typeof adapter.prepare).toBe('function');
      expect(typeof adapter.exec).toBe('function');
      expect(typeof adapter.close).toBe('function');
    });

    it('should provide consistent interface for both better-sqlite3 and sql.js', async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      
      // Test basic table creation
      adapter.exec(`
        CREATE TABLE IF NOT EXISTS test_nodes (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          is_ai_tool INTEGER DEFAULT 0
        )
      `);

      // Test prepared statement interface
      const insertStmt = adapter.prepare('INSERT INTO test_nodes (name, description, is_ai_tool) VALUES (?, ?, ?)');
      expect(insertStmt).toBeDefined();
      expect(typeof insertStmt.run).toBe('function');
      expect(typeof insertStmt.get).toBe('function');
      expect(typeof insertStmt.all).toBe('function');
    });
  });

  describe('Core Database Operations', () => {
    beforeEach(async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      
      // Create test schema similar to n8n-mcp schema
      adapter.exec(`
        CREATE TABLE IF NOT EXISTS nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          node_type TEXT NOT NULL UNIQUE,
          display_name TEXT,
          description TEXT,
          properties TEXT,
          operations TEXT,
          documentation TEXT,
          is_ai_tool INTEGER DEFAULT 0,
          is_trigger INTEGER DEFAULT 0,
          is_webhook INTEGER DEFAULT 0,
          package_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    it('should handle CRUD operations correctly', async () => {
      // Insert test data
      const insertStmt = adapter.prepare(`
        INSERT INTO nodes (node_type, display_name, description, is_ai_tool) 
        VALUES (?, ?, ?, ?)
      `);
      
      const result = insertStmt.run('test.node', 'Test Node', 'A test node for SQLite functionality', 1);
      expect(result.changes).toBeGreaterThan(0);

      // Read data
      const selectStmt = adapter.prepare('SELECT * FROM nodes WHERE node_type = ?');
      const node = selectStmt.get('test.node');
      
      expect(node).toBeDefined();
      expect(node.node_type).toBe('test.node');
      expect(node.display_name).toBe('Test Node');
      expect(node.is_ai_tool).toBe(1); // Should be converted to number
    });

    it('should handle multiple records and complex queries', async () => {
      // Insert multiple records
      const insertStmt = adapter.prepare(`
        INSERT INTO nodes (node_type, display_name, description, is_ai_tool, is_trigger) 
        VALUES (?, ?, ?, ?, ?)
      `);

      const testNodes = [
        ['http.request', 'HTTP Request', 'Make HTTP requests', 0, 0],
        ['webhook.trigger', 'Webhook', 'Receive webhooks', 0, 1],
        ['openai.chat', 'OpenAI Chat', 'AI conversation', 1, 0],
        ['slack.message', 'Slack Message', 'Send Slack messages', 0, 0]
      ];

      testNodes.forEach(([nodeType, displayName, description, isAiTool, isTrigger]) => {
        insertStmt.run(nodeType, displayName, description, isAiTool, isTrigger);
      });

      // Test complex queries
      const aiNodesStmt = adapter.prepare('SELECT * FROM nodes WHERE is_ai_tool = 1');
      const aiNodes = aiNodesStmt.all();
      expect(aiNodes).toHaveLength(1);
      expect(aiNodes[0].node_type).toBe('openai.chat');

      const triggerNodesStmt = adapter.prepare('SELECT * FROM nodes WHERE is_trigger = 1');
      const triggerNodes = triggerNodesStmt.all();
      expect(triggerNodes).toHaveLength(1);
      expect(triggerNodes[0].node_type).toBe('webhook.trigger');

      // Test count query
      const countStmt = adapter.prepare('SELECT COUNT(*) as total FROM nodes');
      const count = countStmt.get();
      expect(count.total).toBe(4);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      
      // Create test schema with search-friendly structure
      adapter.exec(`
        CREATE TABLE IF NOT EXISTS nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          node_type TEXT NOT NULL,
          display_name TEXT,
          description TEXT,
          tags TEXT
        )
      `);

      // Insert searchable test data
      const insertStmt = adapter.prepare(`
        INSERT INTO nodes (node_type, display_name, description, tags) 
        VALUES (?, ?, ?, ?)
      `);

      const searchTestData = [
        ['gmail.send', 'Gmail Send', 'Send emails via Gmail API', 'email,google,communication'],
        ['slack.message', 'Slack Message', 'Send messages to Slack channels', 'chat,communication,team'],
        ['http.request', 'HTTP Request', 'Make HTTP requests to any API', 'api,web,integration'],
        ['openai.chat', 'OpenAI Chat', 'Chat with OpenAI models', 'ai,chat,gpt,language']
      ];

      searchTestData.forEach(([nodeType, displayName, description, tags]) => {
        insertStmt.run(nodeType, displayName, description, tags);
      });
    });

    it('should provide search functionality with LIKE queries (works in both engines)', async () => {
      // Test case-insensitive search
      const searchStmt = adapter.prepare(`
        SELECT * FROM nodes 
        WHERE LOWER(display_name) LIKE LOWER(?) 
           OR LOWER(description) LIKE LOWER(?)
           OR LOWER(tags) LIKE LOWER(?)
      `);

      const emailSearch = searchStmt.all('%email%', '%email%', '%email%');
      expect(emailSearch).toHaveLength(1);
      expect(emailSearch[0].node_type).toBe('gmail.send');

      const chatSearch = searchStmt.all('%chat%', '%chat%', '%chat%');
      expect(chatSearch.length).toBeGreaterThanOrEqual(2); // Both slack and openai should match

      const apiSearch = searchStmt.all('%api%', '%api%', '%api%');
      expect(apiSearch.length).toBeGreaterThanOrEqual(2); // HTTP and Gmail should match
    });

    it('should handle FTS search gracefully when available', async () => {
      const hasFTS5 = adapter.checkFTS5Support();
      
      if (hasFTS5) {
        // If FTS5 is available, test it
        adapter.exec(`
          CREATE VIRTUAL TABLE nodes_fts USING fts5(
            node_type, display_name, description, tags,
            content=nodes, content_rowid=id
          )
        `);

        // Verify FTS5 table was created
        const tables = adapter.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type = 'table' AND name = 'nodes_fts'
        `).all();
        
        expect(tables).toHaveLength(1);
      } else {
        // If FTS5 is not available, verify fallback search still works
        const fallbackSearchStmt = adapter.prepare(`
          SELECT * FROM nodes 
          WHERE node_type LIKE ? OR display_name LIKE ? OR description LIKE ?
        `);
        
        const results = fallbackSearchStmt.all('%gmail%', '%gmail%', '%gmail%');
        expect(results).toHaveLength(1);
      }
    });
  });

  describe('Transaction Support', () => {
    beforeEach(async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      
      adapter.exec(`
        CREATE TABLE IF NOT EXISTS test_transactions (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);
    });

    it('should support transaction operations', async () => {
      const insertStmt = adapter.prepare('INSERT INTO test_transactions (value) VALUES (?)');
      
      // Test successful transaction
      const result = adapter.transaction(() => {
        insertStmt.run('value1');
        insertStmt.run('value2');
        return 'success';
      });

      expect(result).toBe('success');
      
      const countStmt = adapter.prepare('SELECT COUNT(*) as count FROM test_transactions');
      const count = countStmt.get();
      expect(count.count).toBe(2);
    });

    it('should rollback failed transactions', async () => {
      const insertStmt = adapter.prepare('INSERT INTO test_transactions (value) VALUES (?)');
      
      // Test transaction rollback
      try {
        adapter.transaction(() => {
          insertStmt.run('value1');
          insertStmt.run('value2');
          throw new Error('Test error');
        });
      } catch (error) {
        expect(error.message).toBe('Test error');
      }

      // Verify no data was inserted due to rollback
      const countStmt = adapter.prepare('SELECT COUNT(*) as count FROM test_transactions');
      const count = countStmt.get();
      expect(count.count).toBe(0);
    });
  });

  describe('Data Type Handling', () => {
    beforeEach(async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      
      adapter.exec(`
        CREATE TABLE IF NOT EXISTS type_test (
          id INTEGER PRIMARY KEY,
          text_col TEXT,
          int_col INTEGER,
          real_col REAL,
          blob_col BLOB,
          bool_col INTEGER
        )
      `);
    });

    it('should handle different SQLite data types correctly', async () => {
      const insertStmt = adapter.prepare(`
        INSERT INTO type_test (text_col, int_col, real_col, bool_col) 
        VALUES (?, ?, ?, ?)
      `);

      insertStmt.run('test string', 42, 3.14, 1);

      const selectStmt = adapter.prepare('SELECT * FROM type_test WHERE id = ?');
      const row = selectStmt.get(1);

      expect(row.text_col).toBe('test string');
      expect(row.int_col).toBe(42);
      expect(row.real_col).toBeCloseTo(3.14, 2);
      expect(row.bool_col).toBe(1);
    });

    it('should handle NULL values properly', async () => {
      const insertStmt = adapter.prepare(`
        INSERT INTO type_test (text_col, int_col) VALUES (?, ?)
      `);

      insertStmt.run('test', null);

      const selectStmt = adapter.prepare('SELECT * FROM type_test WHERE text_col = ?');
      const row = selectStmt.get('test');

      expect(row.text_col).toBe('test');
      expect(row.int_col).toBeNull();
    });
  });

  describe('n8n-MCP Specific Features', () => {
    beforeEach(async () => {
      adapter = await createDatabaseAdapter(tempDbPath);
      
      // Create schema similar to actual n8n-mcp
      adapter.exec(`
        CREATE TABLE IF NOT EXISTS nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          node_type TEXT NOT NULL UNIQUE,
          display_name TEXT,
          description TEXT,
          properties TEXT,
          operations TEXT,
          documentation TEXT,
          is_ai_tool INTEGER DEFAULT 0,
          is_trigger INTEGER DEFAULT 0,
          is_webhook INTEGER DEFAULT 0,
          package_name TEXT,
          version TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    it('should handle n8n node data structure correctly', async () => {
      const nodeData = {
        nodeType: 'nodes-base.httpRequest',
        displayName: 'HTTP Request',
        description: 'Makes an HTTP request and returns the response data',
        properties: JSON.stringify([
          { name: 'url', type: 'string', required: true },
          { name: 'method', type: 'options', options: ['GET', 'POST', 'PUT', 'DELETE'] }
        ]),
        operations: JSON.stringify([
          { name: 'get', displayName: 'GET Request' },
          { name: 'post', displayName: 'POST Request' }
        ]),
        isAiTool: 0,
        isTrigger: 0,
        packageName: 'n8n-nodes-base'
      };

      const insertStmt = adapter.prepare(`
        INSERT INTO nodes (
          node_type, display_name, description, properties, 
          operations, is_ai_tool, is_trigger, package_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        nodeData.nodeType,
        nodeData.displayName,
        nodeData.description,
        nodeData.properties,
        nodeData.operations,
        nodeData.isAiTool,
        nodeData.isTrigger,
        nodeData.packageName
      );

      expect(result.changes).toBeGreaterThan(0);

      // Verify data can be retrieved and parsed
      const selectStmt = adapter.prepare('SELECT * FROM nodes WHERE node_type = ?');
      const node = selectStmt.get(nodeData.nodeType);

      expect(node).toBeDefined();
      expect(node.node_type).toBe(nodeData.nodeType);
      expect(node.display_name).toBe(nodeData.displayName);
      
      // Test JSON parsing
      const properties = JSON.parse(node.properties);
      expect(properties).toHaveLength(2);
      expect(properties[0].name).toBe('url');
      expect(properties[0].required).toBe(true);

      const operations = JSON.parse(node.operations);
      expect(operations).toHaveLength(2);
      expect(operations[0].name).toBe('get');
    });

    it('should support querying by different node characteristics', async () => {
      // Insert test nodes with different characteristics
      const insertStmt = adapter.prepare(`
        INSERT INTO nodes (node_type, display_name, is_ai_tool, is_trigger, is_webhook, package_name) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const testNodes = [
        ['openai.chat', 'OpenAI Chat', 1, 0, 0, '@n8n/n8n-nodes-langchain'],
        ['webhook.trigger', 'Webhook', 0, 1, 1, 'n8n-nodes-base'],
        ['http.request', 'HTTP Request', 0, 0, 0, 'n8n-nodes-base'],
        ['claude.chat', 'Claude Chat', 1, 0, 0, '@n8n/n8n-nodes-langchain']
      ];

      testNodes.forEach(([nodeType, displayName, isAiTool, isTrigger, isWebhook, packageName]) => {
        insertStmt.run(nodeType, displayName, isAiTool, isTrigger, isWebhook, packageName);
      });

      // Query AI tools
      const aiToolsStmt = adapter.prepare('SELECT * FROM nodes WHERE is_ai_tool = 1');
      const aiTools = aiToolsStmt.all();
      expect(aiTools).toHaveLength(2);

      // Query triggers
      const triggersStmt = adapter.prepare('SELECT * FROM nodes WHERE is_trigger = 1');
      const triggers = triggersStmt.all();
      expect(triggers).toHaveLength(1);

      // Query by package
      const langchainStmt = adapter.prepare('SELECT * FROM nodes WHERE package_name = ?');
      const langchainNodes = langchainStmt.all('@n8n/n8n-nodes-langchain');
      expect(langchainNodes).toHaveLength(2);
    });
  });
});
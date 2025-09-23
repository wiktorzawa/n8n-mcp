# SQLite in n8n-MCP - Full Functionality and Installation Methods

## Answer: Do we have access to full n8n-MCP and n8n capabilities when using SQLite?

**Short answer:** YES - regardless of the installation method used (better-sqlite3 or sql.js), n8n-MCP provides access to full n8n functionality and all MCP capabilities.

## Database Architecture in n8n-MCP

n8n-MCP uses an advanced database adapter architecture (`DatabaseAdapter`) that automatically selects the best available SQLite engine:

### 1. better-sqlite3 (Preferred)
- **Native C++ module** optimized for performance
- **Full FTS5 support** (Full-Text Search)
- **WAL transactions** for better performance
- **Faster queries** thanks to native implementation

### 2. sql.js (Fallback)
- **Pure JavaScript** - no native compilation required
- **Compatibility with npx** and various Node.js environments
- **Automatic persistence** to file
- **Limited FTS support** (no FTS5)

## Functionality Comparison

| Functionality | better-sqlite3 | sql.js | User Impact |
|---|---|---|---|
| **Access to all 535+ n8n nodes** | ✅ | ✅ | **No differences** |
| **Node properties (99% coverage)** | ✅ | ✅ | **No differences** |
| **Node operations (63.6% coverage)** | ✅ | ✅ | **No differences** |
| **Documentation (90% coverage)** | ✅ | ✅ | **No differences** |
| **All 39 MCP tools** | ✅ | ✅ | **No differences** |
| **n8n workflow management** | ✅ | ✅ | **No differences** |
| **Configuration validation** | ✅ | ✅ | **No differences** |
| **Workflow templates** | ✅ | ✅ | **No differences** |
| **FTS5 search** | ✅ | ❌ | **Minimal** - fallback to regular LIKE |
| **Query performance** | ⚡ Fast | 🐌 Slower | **Noticeable only with large queries** |
| **WAL transactions** | ✅ | ❌ | **Invisible to user** |

## Installation Methods and Their Impact

### 1. npx n8n-mcp (Recommended)
```bash
npx n8n-mcp
```
**Characteristics:**
- ✅ **Full functionality** - automatic fallback better-sqlite3 → sql.js
- ✅ **Zero installation** - works immediately
- ✅ **Pre-built database** with all node data
- ✅ **Environment compatibility** - works everywhere Node.js runs

### 2. Local Installation
```bash
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
npm install
npm run build
npm run rebuild
```
**Characteristics:**
- ✅ **Full functionality** with better-sqlite3
- ✅ **Highest performance** FTS5 + native database
- ⚠️ **Requires compilation** of native modules

### 3. Docker
```bash
docker run -d ghcr.io/czlonkowski/n8n-mcp:latest
```
**Characteristics:**
- ✅ **Full functionality** - image contains compiled better-sqlite3
- ✅ **Environment isolation** - no dependency conflicts
- ✅ **Multi-arch support** (amd64, arm64)

### 4. HTTP Deployment (Railway, VPS)
**Characteristics:**
- ✅ **Full functionality** including n8n management
- ✅ **16 additional tools** when N8N_API_URL is configured
- ✅ **Multi-tenant support** for multiple n8n instances

## Automatic Fallback Mechanism

n8n-MCP implements an intelligent database engine selection system:

```typescript
// Fallback mechanism pseudocode
try {
  // 1. Try better-sqlite3 (preferred)
  const adapter = await createBetterSQLiteAdapter(dbPath);
  logger.info('Using better-sqlite3 - full performance');
  return adapter;
} catch (error) {
  // 2. Detect Node.js version error
  if (errorMessage.includes('NODE_MODULE_VERSION')) {
    logger.warn('Node.js version mismatch detected');
  }
  
  // 3. Fallback to sql.js
  const adapter = await createSQLJSAdapter(dbPath);
  logger.info('Using sql.js - full compatibility, reduced FTS');
  return adapter;
}
```

## When is sql.js Used?

sql.js is automatically used when:
- **npx execution** - most common case
- **Node.js version mismatch** - better-sqlite3 compiled for different version
- **Missing build tools** - environment without Python/C++ compiler
- **ARM64 compatibility issues** - older systems
- **Docker without native dependencies** - some lightweight images

## Impact on End Functionality

### ✅ **NO limitations in:**
- Access to n8n node documentation
- Configuration validation
- Example generation
- Workflow management (when API configured)
- All 23 basic MCP tools
- All 16 n8n management tools

### ⚠️ **Minimal differences:**
- **FTS5 search** - sql.js uses simpler LIKE instead of FTS5
- **Performance** - sql.js ~2-3x slower on large queries
- **Memory** - sql.js may use more RAM for large operations

### 🎯 **Practical impact:**
- **99% of users** won't notice the difference
- **Node search** works identically (may be 100-200ms slower)
- **Claude Desktop** receives the same responses and capabilities

## Recommendations

### For most users:
```bash
# Simplest - run immediately!
npx n8n-mcp
```

### For power users/production:
```bash
# Docker with full performance
docker run -d \
  -e MCP_MODE=http \
  -e N8N_API_URL=https://your-n8n.com \
  -e N8N_API_KEY=your-key \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

### For developers:
```bash
# Local installation with full debugging
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
npm install
npm run dev
```

## Summary

**n8n-MCP provides full functionality regardless of installation method.** The differences between better-sqlite3 and sql.js are minimal and invisible for 99% of use cases. The automatic fallback system guarantees that the application will always work with full access to:

- ✅ All 535+ n8n nodes
- ✅ Complete documentation and properties
- ✅ All MCP tools
- ✅ n8n workflow management (when configured)
- ✅ Validation and examples

**There are no installation methods that limit functionality** - only minor performance differences that are automatically managed by the database adapter.
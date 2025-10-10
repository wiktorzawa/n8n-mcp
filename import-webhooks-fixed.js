const fs = require('fs');
const path = require('path');

// Read webhook workflow files
const workflowDir = './workflows-for-import';
const files = ['webhook-get.json', 'webhook-post.json', 'webhook-put.json', 'webhook-delete.json'];

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYWQxMGMxOS00OGMyLTQ4ODMtODc3YS0zYTJmYWVlMTdkOGYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwMDgzNDQ0fQ.3TtqpDpdR31YiyCSi9qnXyQRoE3pZ92QUr516WquQAg';
const N8N_URL = 'https://n8nmcp.duckdns.org';

async function importWorkflows() {
  for (const file of files) {
    try {
      const workflow = JSON.parse(fs.readFileSync(path.join(workflowDir, file), 'utf8'));
      
      // Remove read-only fields
      delete workflow.active;
      delete workflow.id;
      delete workflow.createdAt;
      delete workflow.updatedAt;
      
      const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': API_KEY
        },
        body: JSON.stringify(workflow)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Imported: ${workflow.name} (ID: ${result.id})`);
        
        // Try to activate the workflow
        const activateResponse = await fetch(`${N8N_URL}/api/v1/workflows/${result.id}/activate`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': API_KEY
          }
        });
        
        if (activateResponse.ok) {
          console.log(`✅ Activated: ${workflow.name}`);
        } else {
          console.log(`⚠️ Failed to activate: ${workflow.name}`);
        }
      } else {
        console.log(`❌ Failed to import: ${workflow.name}`);
        console.log(await response.text());
      }
    } catch (error) {
      console.log(`❌ Error importing ${file}:`, error.message);
    }
  }
}

importWorkflows();

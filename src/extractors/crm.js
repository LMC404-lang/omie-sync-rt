const { fetchAll } = require('../omieClient');

/**
 * Extract CRM opportunities and activities from Omie.
 */
async function extractOpportunities(since = null) {
  return fetchAll(
    'crm/oportunidades',
    'ListarOportunidades',
    {},
    'cadastros',
    since,
    'data_alteracao_inicial'
  );
}

async function extractActivities(since = null) {
  return fetchAll(
    'crm/tarefas',
    'ListarTarefas',
    {},
    'cadastros',
    since,
    'data_inicial',
    'data_final'
  );
}

module.exports = { extractOpportunities, extractActivities };

const { fetchAll } = require('../omieClient');

/**
 * Extract accounts receivable and payable from Omie.
 */
async function extractReceivable(since = null) {
  return fetchAll(
    'financas/contareceber',
    'ListarContasReceber',
    {},
    'conta_receber_cadastro',
    since
  );
}

async function extractPayable(since = null) {
  return fetchAll(
    'financas/contapagar',
    'ListarContasPagar',
    {},
    'conta_pagar_cadastro',
    since
  );
}

module.exports = { extractReceivable, extractPayable };

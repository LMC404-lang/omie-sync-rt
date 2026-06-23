const { fetchAll } = require('../omieClient');

/**
 * Extract all clients (CRM) from Omie.
 */
module.exports = async (since = null) =>
  fetchAll(
    'geral/clientes',
    'ListarClientes',
    { apenas_importado_api: 'N' },
    'clientes_cadastro',
    since
  );

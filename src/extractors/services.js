const { fetchAll } = require('../omieClient');

/**
 * Extract service orders (OS) from Omie.
 */
module.exports = async (since = null) =>
  fetchAll(
    'servicos/os',
    'ListarOS',
    {},
    'osCadastro',
    since
  );

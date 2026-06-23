const { fetchAll } = require('../omieClient');

/**
 * Extract products catalog from Omie.
 */
module.exports = async (since = null) =>
  fetchAll(
    'geral/produtos',
    'ListarProdutos',
    { filtrar_apenas_omiepdv: 'N' },
    'produto_servico_cadastro',
    since
  );

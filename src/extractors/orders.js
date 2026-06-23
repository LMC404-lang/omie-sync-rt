const { fetchAll } = require('../omieClient');

/**
 * Extract all sales orders from Omie.
 */
module.exports = async (since = null) =>
  fetchAll(
    'produtos/pedido',
    'ListarPedidos',
    { etapa: '' },
    'pedido_venda_produto',
    since
  );

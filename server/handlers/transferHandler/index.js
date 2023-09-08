const TransferService = require('../../services/TransferService');
const {
  transferGetQuerySchema,
  transferLimitOffsetQuerySchema,
  transferIdFulfillSchema,
  transferIdParamSchema,
  transferPostSchema,
} = require('./schemas');

const transferPost = async (req, res) => {
  const validatedBody = await transferPostSchema.validateAsync(req.body, { abortEarly: false });
  const transferService = new TransferService();

  const {wallet_id} = req
  const { result, status } = await transferService.initiateTransfer(
    validatedBody,
    wallet_id,
  );

  const modifiedTransfer = {
    ...result,
    token_count:
        +result.parameters?.bundle?.bundleSize || +result.parameters?.tokens?.length,
  }

  res.status(status).send(modifiedTransfer);
};

const transferIdAcceptPost = async (req, res) => {
  const validatedParams = await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const {transfer_id} = validatedParams
  const {wallet_id} = req
  const transferService = new TransferService();
  const result = await transferService.acceptTransfer(
    transfer_id,
    wallet_id,
  );

  res.json(result);
};

const transferIdDeclinePost = async (req, res) => {
  const validatedParams = await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const {transfer_id} = validatedParams
  const {wallet_id} = req
  const transferService = new TransferService();
  const result = await transferService.declineTransfer(
    transfer_id,
    wallet_id,
  );

  res.json(result);
};

const transferIdDelete = async (req, res) => {
  const validatedParams = await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const {transfer_id} = validatedParams
  const {wallet_id} = req
  const transferService = new TransferService();
  const result = await transferService.cancelTransfer(
    transfer_id,
    wallet_id,
  );

  res.json(result);
};

const transferIdFulfill = async (req, res) => {
  const validatedParams = await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  const validatedBody = await transferIdFulfillSchema.validateAsync(req.body, { abortEarly: false });

  const {transfer_id} = validatedParams
  const {wallet_id} = req
  const transferService = new TransferService();
  const result = await transferService.fulfillTransfer(
    wallet_id,
    transfer_id,
    validatedBody,
  );
  res.json(result);
};

const transferGet = async (req, res) => {
  const validatedQuery = await transferGetQuerySchema.validateAsync(req.query, { abortEarly: false });

  const { limit, offset, ...params } = validatedQuery;
  const {wallet_id} = req

  const transferService = new TransferService();

  const {transfers, count} = await transferService.getByFilter({...params, limit, offset}, wallet_id);

  const modifiedTransfers = transfers.map((t) => ({
    ...t,
    token_count:
      +t.parameters?.bundle?.bundleSize || +t.parameters?.tokens?.length,
  }));

  res.status(200).json({ transfers: modifiedTransfers, query: {...params, limit, offset}, total:count });
};

const transferIdGet = async (req, res) => {
  const validatedParams = await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const {transfer_id} = validatedParams
  const {wallet_id} = req
  const transferService = new TransferService();
  const result = await transferService.getTransferById(
    transfer_id,
    wallet_id,
  );

  const modifiedTransfer = {
    ...result,
    token_count:
        +result.parameters?.bundle?.bundleSize || +result.parameters?.tokens?.length,
  }

  res.json(modifiedTransfer);
};

const transferIdTokenGet = async (req, res) => {
  const validatedParams = await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  const validatedQuery = await transferLimitOffsetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const { limit, offset } = validatedQuery;
  const {transfer_id} = validatedParams
  const {wallet_id} = req
  const transferService = new TransferService();
  const tokens = await transferService.getTokensByTransferId(
    transfer_id,
    wallet_id,
    limit,
    offset,
  );

  res.json({ tokens });
};

module.exports = {
  transferGet,
  transferIdAcceptPost,
  transferIdDeclinePost,
  transferIdDelete,
  transferIdFulfill,
  transferIdGet,
  transferIdTokenGet,
  transferPost,
};

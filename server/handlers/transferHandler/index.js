const TransferService = require('../../services/TransferService');
const {
  transferGetQuerySchema,
  transferLimitOffsetQuerySchema,
  transferIdFulfillSchema,
  transferIdParamSchema,
  transferPostSchema,
} = require('./schemas');

const transferPost = async (req, res) => {
  // need to add to the events table
  await transferPostSchema.validateAsync(req.body, { abortEarly: false });
  const transferService = new TransferService();

  const { result, status } = await transferService.initiateTransfer(
    req.body,
    req.wallet_id,
  );

  res.status(status).send(result);
};

const transferIdAcceptPost = async (req, res) => {
  // need to add to the events table
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.acceptTransfer(
    req.params.transfer_id,
    req.wallet_id,
  );

  res.json(result);
};

const transferIdDeclinePost = async (req, res) => {
  // need to add to the events table
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.declineTransfer(
    req.params.transfer_id,
    req.wallet_id,
  );

  res.json(result);
};

const transferIdDelete = async (req, res) => {
  // need to add to the events table
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.cancelTransfer(
    req.params.transfer_id,
    req.wallet_id,
  );

  res.json(result);
};

const transferIdFulfill = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await transferIdFulfillSchema.validateAsync(req.body, { abortEarly: false });

  const transferService = new TransferService();

  const result = await transferService.fulfillTransfer(
    req.wallet_id,
    req.params.transfer_id,
    req.body,
  );
  res.json(result);
};

const transferGet = async (req, res) => {
  await transferGetQuerySchema.validateAsync(req.query, { abortEarly: false });

  const transferService = new TransferService();
  const transfers = await transferService.getByFilter(req.query, req.wallet_id);

  res.status(200).json({ transfers });
};

const transferIdGet = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });

  const transferService = new TransferService();
  const result = await transferService.getTransferById(
    req.params.transfer_id,
    req.wallet_id,
  );
  res.json(result);
};

const transferIdTokenGet = async (req, res) => {
  await transferIdParamSchema.validateAsync(req.params, { abortEarly: false });
  await transferLimitOffsetQuerySchema.validateAsync(req.query, {
    abortEarly: false,
  });

  const { limit, offset } = req.query;

  const transferService = new TransferService();
  const tokens = await transferService.getTokensByTransferId(
    req.params.transfer_id,
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

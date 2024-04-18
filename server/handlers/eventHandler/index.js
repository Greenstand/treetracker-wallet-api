const EventService = require('../../services/EventService');

const { eventsGetQuerySchema } = require('./schemas');

const eventsGet = async (req, res) => {
  await eventsGetQuerySchema.validateAsync(req.query, { abortEarly: false });

  const { limit, since, wallet } = req.query;

  const accessToken = req.user;
  const { wallet_id } = accessToken;

  const eventService = new EventService();

  const events = await eventService.getAllEvents({
    limit,
    since,
    wallet,
    walletLoginId: wallet_id,
  });

  res.status(200).json({ events });
};

module.exports = { eventsGet };

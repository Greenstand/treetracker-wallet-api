
const ActionTokenService = require('../../services/ActionTokenService')

const { actiontokenGenerateSchema , actionTokenTransferSchema } = require('./schemas');

const generate = async (req, res) => {
  const validatedQuery = await actiontokenGenerateSchema.validateAsync(req.query, { abortEarly: false });
  const { email_id,limit} = validatedQuery;
  const { wallet_id } = req
  // send payload and this will return us the accessToken

  const actionTokenService = new ActionTokenService();
  const actionToken = await actionTokenService.generate(
    email_id,
    wallet_id,
    limit
  )

  res.json({actionToken})
};


const transfer = async ( req,res ) => {
  const validatedBody = await actionTokenTransferSchema.validateAsync(req.body, { abortEarly: false });
  const { actionToken } = validatedBody
  const { wallet_id } = req;

  const actionTokenService = new ActionTokenService();

  // verfiy actionToken 
  const tokens =  await ActionTokenService.verify(actionToken);
  

  const result = await actionTokenService.transferTokens( tokens , wallet_id  )
  // then do the transfer using the payload , if possibel 
  res.status(200).json(result)
 
}

module.exports = {generate,transfer}

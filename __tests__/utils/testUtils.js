const uuid = require('uuid');
const log = require('loglevel');
const Crypto = require('crypto');
const generator = require('generate-password');
const {expect} = require('chai');
const JWTService = require('../../server/services/JWTService');
const TransferEnum = require('../../server/utils/transfer-enum');
const knex = require('../../server/infra/database/knex');
const TrustRelationshipEnums = require('../../server/utils/trust-enums')

/*
 * register the user, create password hash, and apiKey
 */
async function register(user) {
    const sha512 = function (password, salt) {
        const hash = Crypto.createHmac(
            'sha512',
            salt,
        );
        /** Hashing algorithm sha512 */
        hash.update(password);
        const value = hash.digest('hex');
        return value;
    };

    const salt = Crypto.randomBytes(32).toString('base64'); // create a secure salt
    const passwordHash = sha512(user.password, salt);

    const apiKey = generator.generate({
        length: 32,
        numbers: true,
    });

    await knex('api_key').insert({
        key: apiKey,
        tree_token_api_access: true,
        hash: 'test',
        salt: 'test',
        name: 'test',
    });

    // wallet
    const result = await knex('wallet')
        .insert({
            id: uuid.v4(),
            name: user.name,
            password: passwordHash,
            salt,
        })
        .returning('*');
    log.info('registered wallet:', result);
    return {
        ...result[0],
        apiKey,
        // restore password
        password: user.password,

    };
}

/*
 * create the user, apiKey, then login, return
 * token
 */
async function registerAndLogin(user) {
    const userRegistered = await register(user);
    const token = JWTService.sign(userRegistered);
    userRegistered.token = token;
    expect(userRegistered).property('apiKey').a('string');
    return userRegistered;
}

function getRandomToken() {
    return {id: uuid.v4(), capture_id: uuid.v4()}
}

async function feedSubWallets(id, subWallets) {
    // todo: use transaction here
    // eslint-disable-next-line no-restricted-syntax
    for (const subWallet of subWallets) {
        const wallet = (await knex('wallet')
            .insert({
                id: uuid.v4(),
                name: subWallet.name,
            }).returning('*'))[0];

        await knex('wallet_trust')
            .insert({
                id: uuid.v4(),
                actor_wallet_id: id,
                target_wallet_id: wallet.id,
                type: TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage,
                originator_wallet_id: id,
                request_type: TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage,
                state: TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE.trusted,
                active: true
            })
    }
}

async function clear() {
    log.debug('clear tables');
    await knex('api_key').del();
    await knex('transaction').del();
    await knex('token').del();
    await knex('wallet').del();
    await knex('wallet_trust').del();
    await knex('transfer').del();
}

/*
 * Add a token to a wallet
 */
async function addToken(wallet, token) {
    const result = await knex('token')
        .insert({
            ...token,
            wallet_id: wallet.id,
        })
        .returning('*');
    expect(result[0]).property('id').eq(token.id);
    expect(result[0]).property('wallet_id').eq(wallet.id);
    return result[0];
}

async function feedTokens(wallet, tokenSize) {
    const tokens = [];

    if (tokenSize <= 0 || tokenSize > 20) {
        throw new Error('Too many tokens for test environment, tokenSize has to <= 20 and > 0');
    }

    for (let i = 0; i < tokenSize; i += 1) {
        const token = getRandomToken();
        token.wallet_id = wallet.id
        tokens.push(token)
    }

    const result = await knex('token')
        .insert(tokens)
        .returning('*');

    expect(result.length).to.eq(tokenSize)
    return result;
}

async function sendBundleTransfer(walletSender, walletReceiver, bundleSize, transferState) {
    const result = await knex('transfer')
        .insert({
            id: uuid.v4(),
            originator_wallet_id: walletSender.id,
            source_wallet_id: walletSender.id,
            destination_wallet_id: walletReceiver.id,
            type: TransferEnum.TYPE.send,
            parameters: {
                bundle: {
                    bundleSize
                }
            },
            state: transferState,
            active: true,
        })
        .returning('*');
    expect(result[0]).property('id').a('string');
    return result[0];
}

async function sendTokensTransfer(walletSender, walletReceiver, tokens, transferState) {
    const trx = await knex.transaction();
    const transferId = uuid.v4();
    try {
        await trx('transfer').insert({
            id: transferId,
            originator_wallet_id: walletSender.id,
            source_wallet_id: walletSender.id,
            destination_wallet_id: walletReceiver.id,
            type: TransferEnum.TYPE.send,
            parameters: {
                tokens
            },
            state: transferState,
            active: true,
        })

        await trx('token').whereIn('id', tokens)
            .update(
                {
                    transfer_pending: true,
                    transfer_pending_id: transferId
                }
            )
        trx.commit()
    } catch (error) {
        trx.rollback();
        throw error;
    }

    return {id: transferId};
}

async function getTransfer(transfer) {
    const result = await knex('transfer')
        .where({id: transfer.id})

    expect(result[0]).property('id').a('string');
    expect(result[0]).property('parameters').a('object');
    expect(result[0]).property('state').a('string');
    return result[0];
}

async function getToken(wallet) {
    const result = await knex('token')
        .where({wallet_id: wallet.id})
        .select('*')
    return result;
}

async function pendingCanceled(transfer) {
    const result = await knex('transfer')
        .where({id: transfer.id, state: TransferEnum.STATE.pending})
        .update({
            id: transfer.id,
            state: TransferEnum.STATE.cancelled
        }).returning('*');

    expect(result[0].id).to.eq(transfer.id);
    expect(result[0].state).to.eq(TransferEnum.STATE.cancelled);

    return result[0];
}

async function pendingCompleted(transfer) {
    const result = await knex('transfer')
        .where({id: transfer.id, state: TransferEnum.STATE.pending})
        .update({
            id: transfer.id,
            state: TransferEnum.STATE.completed
        }).returning('*');

    expect(result[0].id).to.eq(transfer.id);
    expect(result[0].state).to.eq(TransferEnum.STATE.completed);
    return result[0];
}

async function deleteToken(token) {
    const result = await knex('token').where({id: token.id}).delete();
    expect(result).to.gte(0);
    return result;
}

module.exports = {
    register,
    registerAndLogin,
    clear,
    sendBundleTransfer,
    sendTokensTransfer,
    addToken,
    feedSubWallets,
    feedTokens,
    getRandomToken,
    pendingCanceled,
    pendingCompleted,
    getTransfer,
    getToken,
    deleteToken
};

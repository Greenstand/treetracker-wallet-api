(async () => {

    const Knex = require('knex');
    const Config = require('../../config/config');
    const knex = Knex({
        client: 'pg',
        connection: Config.connectionString,
    });

    const trx = await knex.transaction();

    // get wallet with name 'free'
    const walletId = await trx('public.wallet').select(
        'id'
    ).where({
        name: 'free'
    }).first();


    const tokenArr = [];
    const https = require('https');
    let url = 'https://prod-k8s.treetracker.org/query/trees?limit=1000';
    await new Promise((resolve, reject) => https.get(url, async (res) => {
        let body = "";

        res.on("data", (chunk) => {
            body += chunk;
        });

        await res.on("end", async () => {
            try {
                const treesJson = JSON.parse(body)
                for (const t of treesJson.trees) {
                    tokenArr.push({
                        capture_id: t.uuid,
                        wallet_id: walletId.id
                    });
                }
                resolve()
            } catch (error) {
                console.error(error.message);
                reject(error)
            }
        });


    }).on("error", (error) => {
        console.error(error.message);
        reject(error)
    }));

    for (const t of tokenArr) {
        await trx('public.token').insert({
            capture_id: t.capture_id,
            wallet_id: t.wallet_id
        }).returning('*');
    }

    await trx.commit();

})().catch(e => console.error(e.stack));

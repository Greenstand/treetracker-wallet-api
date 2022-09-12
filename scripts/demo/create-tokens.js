(async () => {
    // configure Knex for making requests to the DB
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

    const https = require('https');
    let url = 'https://prod-k8s.treetracker.org/query/trees?limit=1000';
    await new Promise((resolve, reject) => https.get(url, async (res) => {
        let body = "";

        res.on("data", (chunk) => {
            body += chunk;
        });

        await res.on("end", async () => {
            try {
                const treesJson = JSON.parse(body);
                // for each tree, insert a token into the DB
                for (const t of treesJson.trees) {
                    await trx('public.token').insert({
                        capture_id: t.capture_id,
                        wallet_id: t.wallet_id
                    }).returning('*');
                }
                resolve()
            } catch (error) {
                console.error(error.message);
                reject(error)
            }
        });

        console.log("press ctrl+C to end script");

    }).on("error", (error) => {
        console.error(error.message);
        reject(error)
    })).then( () => {
        trx.commit();
        knex.destroy();
        console.log("Done!")
        console.log("Press CTRL+C to finish execution.")
    });
})()
    .catch(e => console.error(e.stack))
    .finally(() => process.exit(0)) // tell script to quit when done

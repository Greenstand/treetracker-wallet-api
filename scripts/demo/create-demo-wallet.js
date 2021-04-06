function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

(async () => {
  const Knex = require('knex');
  const faker = require('faker');
  const { v4: uuidv4 } = require('uuid');

  const Config = require('./config/config');
  const knex = Knex({
    client: 'pg',
    connection: Config.connectionString[process.env.NODE_ENV],
  });

  const Crypto = require('crypto');
  const sha512 = function (password, salt) {
    const hash = Crypto.createHmac(
      'sha512',
      salt,
    ); /** Hashing algorithm sha512 */
    hash.update(password);
    const value = hash.digest('hex');
    return value;
  };

  const username = faker.internet.userName();
  const password = faker.internet.password(); // not a secure password
  const apiKey = faker.internet.password();

  const salt = faker.internet.password(); // not a secure salt
  const passwordHash = sha512(password, salt);

  const trx = await knex.transaction();

  try {
    // create API key
    const apiKeyData = {
      key: apiKey,
      tree_token_api_access: true,
      name: username,
    };
    const result0 = await trx('wallet.api_key')
      .insert(apiKeyData)
      .returning('*');
    console.log(result0);

    // create wallet and password, salt

    const result = await trx('wallet.wallet')
      .insert({
        name: username,
        password: passwordHash,
        salt,
      })
      .returning('*');
    const wallet = result[0];
    console.log(wallet);

    // insert fake planters
    const planterData = {
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
    };
    const result2 = await trx('public.planter')
      .insert(planterData)
      .returning('*');
    const planter = result2[0];
    console.log(planter);

    const images = [
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.14.19.59.24_ddb1452b-fec8-42df-aa67-5bf0b1337ffc_IMG_20180614_142511_234466904.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.14.19.59.26_d82c45e1-83c5-457c-b213-cafd9f10dfd9_IMG_20180614_142542_71473033.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.14.19.59.27_20a1b12c-1fcf-4888-9807-85aac5bad2bc_IMG_20180614_142613_1907612684.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.14.19.59.35_799c8537-bce9-4997-96ca-9a0401e06fa2_IMG_20180614_142639_-714535546.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.14.19.59.38_3bd88781-ecc9-4178-8884-66447dae1722_IMG_20180614_142705_1916331319.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.14.19.59.40_14a8d4db-c1dd-449b-8534-a6b28a906e11_IMG_20180614_142737_-662610853.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.07.23.16.01.35_6319320a-4082-4db8-b2aa-38f9ade86566_IMG_20180723_131343_-895124767.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.07.23.16.30.00_229f166d-91f4-43fa-9332-f27a1d001473_IMG_20180723_135005_1449884218.jpg',
      'https://treetracker-dev.nyc3.digitaloceanspaces.com/2018.06.19.18.20.59_5559d3ad-9090-4456-a81e-00a7653483c0_IMG_20180619_142743_1430885612.jpg',
    ];

    // insert fake tree captures
    const trees = [];
    for (let i = 0; i < 5000; i++) {
      const captureData = {
        time_created: new Date(),
        time_updated: new Date(),
        planter_id: planter.id,
        lat: getRandomArbitrary(-15, 0),
        lon: getRandomArbitrary(15, 35),
        image_url: images[Math.floor(getRandomArbitrary(1, 9.99))],
        uuid: uuidv4(),
        approved: true,
      };
      const result3 = await trx('public.trees')
        .insert(captureData)
        .returning('*');
      const capture = result3[0];
      trees.push(capture.uuid);
      console.log(capture.uuid);
      await trx.raw(
        'UPDATE trees SET estimated_geometric_location = ST_SetSRID(ST_MakePoint(lon, lat), 4326) WHERE id = ?',
        capture.id,
      );
    }

    // create fake tokens
    for (const treeId of trees) {
      const tokenData = {
        capture_id: treeId,
        wallet_id: wallet.id,
      };
      const result4 = await trx('wallet.token')
        .insert(tokenData)
        .returning('*');
      const token = result4[0];
      console.log(token.id);
    }

    await trx.commit();

    knex.destroy();

    console.log(`wallet ${username}`);
    console.log(`password ${password}`);
    console.log(`apiKey ${apiKey}`);
  } catch (error) {
    console.log(error);
    await trx.rollback();
    knex.destroy();
  }
})().catch((e) => console.error(e.stack));

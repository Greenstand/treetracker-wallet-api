as
#API Documentation

To view the specs for the new API visit https://editor.swagger.io and load the YAML file from https://github.com/Greenstand/treetracker-wallet-api/docs/api/spec/treetracker-wallet-api-v1-10.yaml

# Getting Started

## Project Setup

Fork this repository to your account and clone from this forked copy.

Open terminal, navigate to a folder to install this project, and run the below commands:

```
git clone https://github.com/[YOUR GITHUB USERNAME]/treetracker-wallet-api.git

```

Install all necessary dependencies:

```
npm install

```

While in the terminal, navigate to the config folder directory and run the keygen script below to generate your own public and private JWT keys:

```
ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
# Don't add passphrase
openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
cat jwtRS256.key
cat jwtRS256.key.pub
```

### Database Setup

You can use docker-compose, to start a database. To do that:

1. download and install docker
2. set your /database/database.json file to be:

```
{
  "dev": {
    "driver": "pg",
    "user" : "wallet_user",
    "password" : "secret",
    "database" : "wallet_user",
    "host" : "localhost",
    "port" : "5432",
    "schema" : "wallet",
    "ssl" : {
      "rejectUnauthorized": false
    }
  }
}
```

3. Create an .env.development file in the root "/" directory and copy the contents of .env.example. Then update the DATABASE_URL environment variable

```
DATABASE_URL=postgresql://wallet_user:secret@localhost:5432/wallet_user?false

//Use ssl=no-verify instead for local development if the database is not locally hosted
```

4. run `docker-compose up` in the terminal to set up the postgres database (or `docker-compose up -d` to run detached)

5. while running docker in the background, navigate to the root "/" directory and connect to postgres by running the following command in the terminal:

```
docker exec -it treetracker-wallet-api-db-1 psql -U wallet_user -d wallet_user
```

6. proceed to create a "wallet" schema in the database:

```
CREATE SCHEMA wallet;
GRANT ALL PRIVILEGES ON SCHEMA wallet TO wallet_user;
```

7. Quit the database connection by typing "\q" or in a separate terminal, navigate to /database and run migrations using the following:

```
../node_modules/db-migrate/bin/db-migrate --env dev up
```

8. that's it, your db should be running and set up

Don't forget to set PUBLIC_KEY and PRIVATE_KEY as described below.

#### If you want to run db without docker:

To connect to the database, we need a user and a database. We can either use the default `postgres` user, or create a new user. We then need to create a database associated with that user.

To create a new user (role):

`CREATE ROLE "username" WITH LOGIN SUPERUSER CREATEDB CREATEROLE INHERIT NOREPLICATION CONNECTION LIMIT -1;`

To set the password:

`ALTER USER username WITH PASSWORD 'password';`

To create a new database:

`CREATE DATABASE dbname WITH OWNER = username ENCODING = 'UTF8';`

We recommend setting up your Postgres server/database locally and assigning setting up your environment variables in an .env file in your root repository:

.env file should look like this:

```
DATABASE_URL=postgresql://[your_username]:[password]@localhost:5432/[database_name]?ssl=no-verify
DATABASE_SCHEMA=wallet
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nXXXXXXXXXXXXXXXX\n-----END PUBLIC KEY-----"
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nXXXXXXXXXXXXXXXXXXXXX\n-----END RSA PRIVATE KEY-----"
NODE_LOG_LEVEL=trace
```

If you are using the postgres user:

```
DATABASE_URL="postgresql://postgres@localhost:5432/[database_name]";
```

See the .env.example file for the format and structure.

Here are some resources to get started on local database set up and migration:

- https://postgresapp.com
- pgAdmin and DBeaver are great GUI options to use for navigating your local db
- https://www.postgresql.org/docs/9.1/app-pgdump.html

Next, create a new wallets schema in your local database. Navigate to the database folder and create a database.json file populated with the credentials for your local server:

```
{
  "dev": {
    "driver": "pg",
    "user" : "[your_username]",
    "password" : "[your_pw]",
    "database" : "[your_dbname]",
    "host" : "localhost",
    "port" : "5432",
    "schema" : "wallet",
    "ssl" : {
      "rejectUnauthorized": false
    }
  }
}
```

To quickly build the necessary tables for your wallets schema, run:

```
db-migrate --env dev up
```

If you have not installed db-migrate globally, while in the database folder, you can run:

```
../node_modules/db-migrate/bin/db-migrate --env dev up
```

See here to learn more about db-migrate: https://db-migrate.readthedocs.io/en/latest/

### Setting up env variables

in your .env.development file you have (you can look at env.example)

```
...
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nXXXXXXXXXXXXXXXX\n-----END PUBLIC KEY-----"
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nXXXXXXXXXXXXXXXXXXXXX\n-----END RSA PRIVATE KEY-----"
...
```

Copy and paste the PUBLIC_KEY and PRIVATE_KEY strings above exactly as is. Then, go to your jwtRS256.key.pub and jwtRS256.key files generated earlier in your config folder and remove all the new lines. Replace the "XXXXX.." with the key codes between the BEGIN PUBLIC KEY and END PUBLIC KEY sections (pasted as a single line) from your respective jwtRS256.key.pub and jwtRS256.key files. \*\*Don't just copy and paste the whole block from these files into these sections since we need to preserve this format with the "\n" injected into the strings here. To find out more, read the dotenv documentation on Multiline Values https://www.npmjs.com/package/dotenv

### We are using linter to keep the project in shape

if you are using VScode as your IDE, you can set up linter to run on save, which is very handy
you can set it up by going to Preferences > Settings > Workspace > Formatting > Format on Save

## Troubleshooting

If you run into issue:

```
 ifError got unwanted exception: function uuid_generate_v4() does not exist
```

Delete and recreate your wallets schema and then inside your postgres connection in terminal, run to install the required extension

```
\c <db name>
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Now re-run the "db-migrate --env dev up" command in your normal terminal in the database directory.

Now you should be all set up and ready to go!

# Architecture of this project

This project use multiple layer structure to build the whole system. Similar with MVC structure:

![layers](/layers.png 'layers')

- **Protocol layer**

Wallet API offers RESTFul API interace based on HTTP protocol. We use Express to handle all HTTP requests.

The Express-routers work like the controller role in MVC, they receive the requests and parameters from client, and translate it and dispatch tasks to appropriate business objects. Then receive the result from them, translate to the 'view', the JSON response, to client.

- **Service layer**

Both service layer and model layer are where all the business logic is located. Comparing to the Model , `service` object don't have state (stateless).

Please put business logic code into service object when it is hard to put them into the `Model` object.

Because we didn't use Factory or dependency injection to create object, so service layer also can be used as Factory to create `model` object.

- **Model layer**

The business model, major business logic is here. They are real object, in the perspective of object oriented programming: they have states, they have the method to do stuff.

There are more discussion about this, check below selection.

- **Repository layer**

Repository is responsible for communicate with the real database, this isolation brings flexibility for us, for example, we can consider replace the implementation of the storage infrastructure in the future.

All the SQL statements should be here.

### Some rules about this architecture

1. Please don't visit the layer which is not next to you in the layer picture.

For example, don't visit the repositories in the protocol layer. This principle of multiple layer design forces that every layer just communicate with the layers next to them, it makes things simple, and more decoupled.

2. Don't bring protocol/Express elements into services and models.

Business objects should not be responsible for knowing stuff like HTTP request, Express.

But there is an exception, we do add some HTTP stuff in the model layer, it is about the error handling system. When we got some problem in the business logic, we throws HttpError directly, doing it in this way is because it would bring a lot of workload to define a whole customized Error Code system, and also it would be tedious to handle it in the protocol layer. Maybe this is a bad decision, anyway, any suggestion and discussion are welcome.

3. Don't bring DB elements from repositories into services and models.

To let business object layer decoupled with special technology platform, also, do not bring things like SQL into the services and models.

### Something more about the Model layer

Because we are not using ORM (Object Relationship Mapping) and not using object DB like Mongo, it's a bit challenge to build a Model system. Because we can not build models/objects like: a wallet, with the properties it has (like: name, create time), and assign methods to it which as a wallet class they should have, like: `wallet.transfer(token, anotherWallet)`, just like a classic model object looks like in OOP world, having its state, and the methods it should have.

Thanks Knex, we can use it to easily retrieve objects from SQL DB, but they are simple value object, not model.

So the trade-off way we are using is building model object JUST with the identity (e.g. primary key), but don't have any other properties, if we want to visit them, require the DB(repository) at the moment.

In some case, to reduce the traffic to the DB, model can cache the JSON object from DB by contructor the model object with it. In this case, the outside code which is using this model should be responsible for keep the cached JSON (in model object) consistent with the DB status.

### Seting up DB transaction

To set up database transaction if needed:

```
const session = new Session();
//begin transaction
try{
  await session.beginTransaction();
  const walletService = new WalletService(session);
  const walletLogin = await walletService.getById(res.locals.wallet_id);

  const walletSender = await walletService.getByIdOrName(req.body.sender_wallet);
  const walletReceiver = await walletService.getByIdOrName(req.body.receiver_wallet);

  let result;
  if(req.body.tokens){
    const tokens = [];
    const tokenService = new TokenService(session);
    for(let uuid of req.body.tokens){
      const token = await tokenService.getByUUID(uuid);
      tokens.push(token);
    }
    result = await walletLogin.transfer(walletSender, walletReceiver, tokens);
  }else{
    result = await walletLogin.transferBundle(walletSender, walletReceiver, req.body.bundle.bundle_size);
  }
  const transferService = new TransferService(session);
  result = await transferService.convertToResponse(result);
  if(result.state === Transfer.STATE.completed){
    res.status(201).json(result);
  }else if(
    result.state === Transfer.STATE.pending ||
    result.state === Transfer.STATE.requested){
    res.status(202).json(result);
  }else{
    expect.fail();
  }
  //commit transaction
  await session.commitTransaction();
}catch(e){
  if(e instanceof HttpError && !e.shouldRollback()){
    //if the error type is HttpError, means the exception has been handled
    await session.commitTransaction();
    throw e;
  }else{
    //unknown exception, rollback the transaction
    await session.rollbackTransaction();
    throw e;
  }
}
```

By wrapping all the code in a try/catch block, if everything goes well, when the code reach to the line `await session.commitTransaction()`, all those changing happned in this code block would be commited to DB. If somthine went wrong, there are three cases:

1. If this is a unkown error, for example, the DB lib thrown something like: connection to DB is broken, then the transaction would rollback to the start point.

2. If this is a error thrown by ourselves, we can chose to commit or rollback by setting the flag in HttpError:

```
throw new HttpError(403, `the token:${json.uuid} does not belong to the sender wallet`, true);
```

The third parameter `true` means please rollback. (This is the default case for HttpError);

3. If set the HttpError's `toRollback` (the third parameter) to false, then, the transaction would commit anyway.

### About Class vs literal object

```
class SomeService{
  doSomething(){
  }
}
```

VS

```
someService = {
  doSomething: () => {}
}
```

There are two way to compose object, Class or direct literal object in Javascript, this project we suggest use Class to build object, like: model, service, repository, even though they are stateless objects. This is because generally to say, Class brings more flexibility for future choices, all the things literal object and do, Class can do it too, but literal object can not do all the things Class can do.

One things should be considered in future is the database transaction, if we use Class and create new instance ever time, then it's possible for us to pass the transition session object into the object to do things in a database transaction session.

# Exception & Error handling

We extended the library: [express-async-handler](https://github.com/Abazhenov/express-async-handler#readme) to build our customized error handling mechanism.

If you need to break the normal logic work flow and inform the clients something, say, some violation according to rules, all you need to do is just throw the HttpError object:

```
throw new HttpError(403, 'Do not have permission to do this operation...');
```

The protocol layer would catch the object and return to client with this response:

- Status code: 403

- Response body:

```
{
  code: 403,
  message: 'Do not have permission to do this operation',
}
```

# Schema Validation

We use [joi](https://joi.dev) to check JSON schema, like the input parameters for API http request.

To use it, just follow the tutorial of joi, we suggest use `assert` to throw the validation exception, because our global error handler would catch the error throw by joi (ValidationError) and translate to http response (422 Http Code):

```
  Joi.assert(
    req.body,
    Joi.object({
      wallet: Joi.string()
        .alphanum()
        .min(4)
        .max(32)
        .required(),
      password: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9]+$'))
        .min(8)
        .max(32)
        .required(),
    })
  );
```

# Knex

We use [Knex](http://knexjs.org/) to visit Postgres Database.

# Logging

We use [Loglevel](https://github.com/pimterry/loglevel) to deal with log.

To use log in code:

```
const log = require("loglevel");

log.debug("...");

log.info("...");
```

- The default log level

The default log level is `info`, the change it temporarily, when developing, set the env: `NODE_LOG_LEVEL`, for example:

```
NODE_ENV=test NODE_LOG_LEVEL=debug mocha --timeout 10000 --require co-mocha -w -b --ignore './server/repositories/**/*.spec.js'  './server/setup.js' './server/**/*.spec.js' './__tests__/supertest.js'
```

Under the hook, there is a initial setup file: `/server/setup.js` to set the default log level.

# How to test

## Unit test

To run the unit tests:

```
npm run test-unit
```

## Integration test

All the integration tests are located under folder `__tests__`

To run the integration test:

Run tests:

```
npm run test-integration
```

## Database seeding test

In order to efficiently run our integration tests, we rely on automated database seeding/clearing functions to mock database entries. To test these functions, run:

```
npm run test-seedDB
```

## End to End test

To run the test:

```
npm run test-e2e
```

To run the test locally against the local code/server:

```
npm run test-e2e-locally
```

NOTE running e2e needs to set up some env variables like the Database connection, we can attach the env variables on the CLI command line:

```
> DB_HOST=localhost DB_USERNAME=postgres DB_PORT=23720 DB_PASSWORD=*** DB_NAME=treetracker DB_SCHEMA=public npm run test-e2e-locally
```

## Suggestion about how to run tests when developing

There is a command in the `package.json`:

```
npm run test-watch
```

By running test with this command, the tests would re-run if any code change happened. And with the `bail` argument, tests would stop when it met the first error, it might bring some convenience when developing.

NOTE: There is another command: `test-watch-debug`, it is the same with `test-watch`, except it set log's level to `debug`.

## Postman

Can also use Postman to test the API in a more real environment. Import the API spec from [here](https://github.com/Greenstand/treetracker-wallet-api/blob/master/docs/api/spec/treetracker-wallet-api-v1-10.yaml).

To run a local server with some seed data, run command:

```
npm run server-test
```

This command would run a API server locally, and seed some basic data into DB (the same with the data we used in the integration test).

### Set up Postman to operate wallet API

We can use Postman to operate the wallet API, to create wallet, to trade tokens between wallet... all those business, just like an app for wallet, but some steps are needed to set Postman up, we created some scripts for this, to minimize the setting steps, mainly, you just need to import some files into Postman, then you can start to work.

Please check this tutorial video:

[tutorial to set up Postman](https://www.loom.com/share/a9428383796140568f4c6fb965259588)

# Potential errors:

1. Remember to replace the TREETRACKER-API-KEY value with "FORTESTFORTESTFORTESTFORTESTFORTEST" to avoid 400 error while testing the API endpoints.

# Troubleshooting

## Be aware of dependency circle

Because now we use the `require` import module, it is possible there are cases leading to dependency circle.

File A:

```
const b = require("./B");
```

File B:

```
const a = require("./A");
```

The way to solve this conflict is postpone the invoking of `require`:

```
function somethingNeedsB(){
  const b = require("./B");
}
```

## Be careful dealing with async/await

Because there are a lot of async function in system, make sure you are giving `await` to every async function call:

```
await asyncFunction();
```

Lack of `await` will also cause the failure of the error-handling chain, the Express handler would break without response, it would cuz to timeout on the client side. Some clue for this kind of problem is that you might found some error warning like: 'unhandled promise error...'

## About mock knex

The only place to mock knex is repositories, we use `mock-knex` to fake the DB operation. But there are some potential problem which would lead to some problem, check this issue: [issue](https://github.com/Greenstand/treetracker-wallet-api/issues/36), so be careful if you are testing DB, and because of this problem, we now isolate the tests of repository from unit test, there is a special command for them: `npm run test-repository`.

## About testing error case throwing from async function

Chai is not good for testing/catching errors throwing from internal stack. We are using a trade-off way: using Jest for this part:

```
  await jestExpect(async () => {
    await entityRepository.getEntityByWalletName("Dadior");
  }).rejects.toThrow(/can not find entity/);
```

# Contributing

Create your local git branch and rebase it from the shared master branch. Please make sure to 1) npm install and 2) delete and rebuild your local database wallet schema using the migrations (as illustrated in the Database Setup section above) to capture any latest updates/changes.

Please follow this convention for commit messages [here](https://www.conventionalcommits.org/en/v1.0.0/)

Any developers joining the project should feel free to review any outstanding pull requests and assign themselves to any open tickets on the Issues list. You can make a draft pull request as you are working on any open issue that interests you, and any changes you make on your local branch can be continually synced with this draft until you are ready to submit. Remember to push your changes up to your forked repository and then make any pull requests from your forked branch to the Greenstand master repository branch.

When you are ready to submit a pull request, please rebase your branch off of the shared master branch again to integrate any new updates in the codebase before submitting.

# How to patch v1.10.x

Now the online version of wallet API is v1.10.x, to patch this version:

1. Checkout branch: v1.10
2. Do the work, commit, NOTE, just commit with comment `fix:` rather than `feat`
3. Raise PR against v1.10
4. Run action: Patch v1.10.x and Release (NOTE, choose running on branch v1.10)
5. Check if new tag with name v1.10.x created
6. Run action: Deploy to Production (NOTE, choose running on branch v1.10, and the tag name just created)
7. Check the online version, it should be the one you released.

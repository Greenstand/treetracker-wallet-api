#API Documentation (earlier API version)

https://documenter.getpostman.com/view/10112806/SWTD8H5x?version=latest

To view the specs for the new API we are currently building, go to https://editor.swagger.io and load the YAML file from /docs/api/spec/treetracker-token-api.yaml

# Video Tutorial
* https://youtu.be/6WjlMb_UG5o    Greenstand - API via Postman Tutorial Video

* https://youtu.be/hRv5mcxlWX8    Greenstand -  Tokens Transfer  Tutorial Video

* https://youtu.be/H6levADLJ4E    Greenstand - Permission Access Tutorial Video

# Getting Started

## Project Setup

Open terminal and navigate to a folder to install this project:

```
git clone https://github.com/Greenstand/treetracker-token-trading-api.git

```
Install all necessary dependencies: 

```
npm install

```

While running the server locally, generate your own public and private JWT keys in your config folder using the keygen script below:

```
ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
# Don't add passphrase
openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
cat jwtRS256.key
cat jwtRS256.key.pub
```

### Database Setup

We recommend setting up your Postgres server/database locally and exporting your connection string in ./config/config.js as such:

```
exports.connectionString = "postgresql://[your_username]@localhost:5432/[database_name]";

```

Here are some resources to get started on local database set up and migration:
* https://postgresapp.com
* pgAdmin and DBeaver are great GUI options to use for navigating your local db 
* https://www.postgresql.org/docs/9.1/app-pgdump.html

After setting up your local database, you can then copy over the public schema from our database seeding file into your own local db. The file can be found at ./database/treetracker-wallet-seed-schema-only.pgsql. Run the following command to build the relevant tables in your local db's public schema:

```
psql -h localhost -U <your username> -d <your dbname> -a -f treetracker-wallet-seed-schema-only.pgsql
```

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
    "schema" : "wallets"
  }
}
```
To quickly build the necessary tables for your wallets schema, run:

```
db-migrate --env dev up
```

If you have not installed db-migrate globally, you can run:

```
../node_modules/db-migrate/bin/db-migrate --env dev up
```

See here to learn more about db-migrate: https://db-migrate.readthedocs.io/en/latest/

## Troubleshooting 
If you run into issue: 
```
 ifError got unwanted exception: function uuid_generate_v4() does not exist
```
Delete and recreate your wallets schema and then open postgress terminal and run to install the required extension

```
\c <db name> 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
Now re-run the "db-migrate --env dev up" command.

Now you should be all set up and ready to go!

# Architecture of this project

This project use multiple layer structure to build the whole system. Similar with MVC structure:

![layers](/layers.png "layers")


* **Protocol layer**

Wallet API offers RESTFul API interace based on HTTP protocol. We use Express to handle all HTTP requests.

The Express-routers work like the controller role in MVC, they receive the requests and parameters from client, and translate it and dispatch tasks to appropriate business objects. Then receive the result from them, translate to the 'view', the JSON response, to client.

* **Service layer**

Both service layer and model layer are where all the business logic is located. Comparing to the Model , `service` object don't have state (stateless).  

Please put business logic code into service object when it is hard to put them into the `Model` object.

Because we didn't use Factory or dependency injection to create object, so service layer also can be used as Factory to create `model` object.

* **Model layer**

The business model, major business logic is here. They are real object, in the perspective of object oriented programming: they have states, they have the method to do stuff. 

There are more discussion about this, check below selection.

* **Repository layer**

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

* Status code: 403

* Response body: 

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

* The default log level

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

## Suggestion about how to run tests when developing

There is a command in the `package.json`:

```
npm run test-watch
```

By running test with this command, the tests would re-run if any code change happened. And with the `bail` argument, tests would stop when it met the first error, it might bring some convenience when developing.

NOTE: There is another command: `test-watch-debug`, it is the same with `test-watch`, except it set log's level to `debug`.

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

Create your local git branch and rebase it from the shared master branch. Please make sure to rebuild your local database schemas using the migrations (as illustrated in the Database Setup section above) to capture any latest updates/changes.

When you are ready to submit a pull request from your local branch, please rebase your branch off of the shared master branch again to integrate any new updates in the codebase before submitting. Any developers joining the project should feel free to review any outstanding pull requests and assign themselves to any open tickets on the Issues list. 

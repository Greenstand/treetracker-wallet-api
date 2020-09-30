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
After setting up your local database, contact us in the development slack channel for the credentials for our dev database. You can then copy over the public schema from the dev database into your own local db. 

Here are some resources to get started on local database set up and migration:
* https://postgresapp.com
* pgAdmin and DBeaver are great GUI options to use for navigating your local db 
* https://www.postgresql.org/docs/9.1/app-pgdump.html

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

Now you should be all set up and ready to go!

# Architecture of this project

This project use multiple layer structure to build the whole system. Similar with MVC structure:

| The Structure of Wallet API |
| --- |
| protocol layer (Express, routers) |
| service layer |
| model layer |
| repository layer |
| Database (Postgres) |

## Protocol layer

Wallet API offers RESTFul API interace based on HTTP protocol. We use Express to handle all the HTTP requests.

The Express-routers work like the controller role in MVC, they receive the requests and parameters from client, and translate the request and dispatch tasks to appropriate business objects. Then receive the result from them, translate to the 'view', the JSON response, to client.

## Service layer

Both service layer and model layer are where all the business logic is located. The difference with Model is, `service` object don't have state (stateless), rather than we think `model` object is real business object, in terms of the perspective of Object Originted Programing, they have state, the simulate the object in real world.

Please put business logic code into service object when it is hard to put them into the `Model` object.

Because we didn't use Factory or dependency injection to create object, so service layer also can be used as Factory to create `model` object.

## Model layer

The business model, major business logic is here.

## Repository layer

Repository is responsible for communicate with the real database, this isolation brings flexibility for us, for example we can consider replace the implementation of the storage infrastructure.

All the SQL statements should be here.

### Some rules about this architecture

1. Please don't visit the layer which is not next to you in the layer picture.

For example, don't visit the repositories in the protocol layer. This principle of multiple layer design force every layer just communicate with the layer next to them, it makes things simple, and more decoupling.

There is one thing this picture didn't express it clearly, the model layer is next to the protocol layer too, means routers can visit models directly.

1. Don't bring protocol/Express elements into services and models.

Business objects should not be responsible for knowing and stuff like HTTP request, Express and so on.

But there is an exception, we do add some HTTP stuff in the model layer, it is about the error handling system. When we got some problem in the business logic, we throws HttpError directly, to do it this way is because it would bring a lot of workload to define a whole Error Code system, and also it would be tedious to handle it in the protocol layer. Maybe this is a bad decision, anyway, any suggestion is welcome.

1. Don't bring DB elements from repositories into services and models.

To let business object layer decouple with special technology platform, also, do not bring things like SQL, into the services and models.

### Something more about the Model layer

Because we are not using ORM (Object Relationship Mapping) and not using object DB like Mongo, it's a bit challenge to build a Model system. Because we can not build models/objects like: a wallet, and assign methods to it which as a wallet class they should have, like: `wallet.transfer(token, anotherWallet)`, just like a classic model object in OOP world, it has its state, and the method it should have.

Thanks Knex, we can use it to easily retrieve objects from SQL DB, but they are simple value object, not model.

So the trade-off way we are using is building model object JUST with the entity identity (e.g. primary key), but don't have any other properties, if we want to visit them, require the DB(repository) at the moment, the reason that we don't cache the properties value is because it's too hard to maintain the state of object (sync with the DB).

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

There are two way to write object, Class or direct literal object in Javascript, this project we almost always use Class to write object, like: model, service, repository, even though for the stateless object. This is because generally to say, Class brings more flexibility for future choices, all the things literal object and do, Class can do it too, but literal object can not do all the things Class can do. 

One things should be considered in future is the database transaction, if we use Class and create new instance ever time, then it's possible for us to pass the transition session object into the object to do things in a database transaction session.

# Exception & Error handling

We extended the library: [express-async-handler](https://github.com/Abazhenov/express-async-handler#readme) to build our customized error handling mechanism.

If you need to break the normal logic work flow and inform the clients anything, say, some violation according to rules, then, just throw the HttpError object:

```
throw new HttpError(403, 'Do not have permission to do this operation...');
```

Then the server would return to client with this response:

* Status code: 403

* Response body: 

```
{
  code: 403,
  message: 'Do not have permission to do this operation',
}
```

# Schema Validation

TODO 

# Knex

We use [Knex](http://knexjs.org/) to visit Postgres Database.

# Logging

We use [Loglevel](https://github.com/pimterry/loglevel) to deal with log.

TODO usage

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

## A suggestion about how to run tests when develop

There is a command in the `package.json`:

```
npm run testWatch
```

It's helpful to me to run tests in this way, by running test with this command, the tests would re-run if any change happened in code. And with the `bail` argument, tests would stop when it met the first error, it might bring some convenience when developing.

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

module.exports =  {
    "type": "postgres",
    "host": process.env.DATABASE_HOST,
    "port": process.env.DATABASE_PORT,
    "username": process.env.DATABASE_USER,
    "password": process.env.DATABASE_PASSWORD,
    "database": process.env.DATABASE_NAME,
    "synchronize": false,
    "logging": false,
    "entities": [
        "dist/src/database/entities/*.entity.{ts,js}"
    ],
    "migrations": [
        "dist/src/database/migrations/**/*.{js,ts}"
    ],

    "cli": {
        "entitiesDir": "src/database/entities",
        "migrationsDir": "src/database/migrations",
    }
}
